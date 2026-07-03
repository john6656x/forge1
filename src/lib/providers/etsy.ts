import {
  BestSellerItem,
  BestSellersReport,
  ListingReport,
  ListingSample,
  KeywordReport,
  KeywordIdea,
  Location,
  MarketplaceProviderFull,
  NicheIdea,
  NicheReport,
  PriceBand,
  RankResult,
  ShopReport,
  TagReport,
  TagResult,
  TrendPoint,
  TrendsReport
} from "./types";
import { MockProvider } from "./mock";
import { gradeListing } from "@/lib/grades";
import type { ShopReview } from "./types";
import { acquireEtsySlot, withBackoff } from "@/lib/rate-limit";

/**
 * EtsyProvider — Etsy Open API v3 (https://openapi.etsy.com/v3/application).
 *
 * Setup: create an app at https://www.etsy.com/developers, put the keystring
 * in ETSY_API_KEY, set MARKETPLACE_PROVIDER=etsy. All endpoints used here are
 * public-scope (keystring only — no OAuth needed): active-listing search,
 * shop lookup, shop listings, single listing.
 *
 * ── Search volume: the honest part ─────────────────────────────────────────
 * Etsy's API does NOT expose keyword search volume. Every Etsy SEO tool on
 * the market estimates it. Our strategy (see estimateVolume): blend the
 * active-listing count (supply) with engagement signals of the top listings
 * (num_favorers, views where present) into a stable proxy, then scale by
 * location share. Numbers are directionally useful for comparing keywords,
 * not absolute search counts — the UI copy says as much.
 *
 * Competition is real: it's derived from Etsy's own `count` of active
 * listings matching the phrase, log-scaled to 0–100.
 *
 * 12-month trend: the API has no history endpoint, so the curve is a seasonal
 * model anchored to today's real volume estimate. Rank tracking builds real
 * history over time via RankSnapshot rows.
 */

const API = "https://openapi.etsy.com/v3/application";
const cache = new Map<string, { at: number; data: unknown }>();

/**
 * Cache TTLs (ported from TagSmith): competitor/public data can be a day old,
 * search-position data must stay fresh.
 */
export const TTL = {
  public: 6 * 60 * 60 * 1000, // keyword/tag lookups
  entity: 60 * 60 * 1000, // shops & single listings
  rank: 10 * 60 * 1000 // rank checks
} as const;

async function etsyGet<T>(path: string, params: Record<string, string | number> = {}, ttl: number = TTL.public): Promise<T> {
  const key = process.env.ETSY_API_KEY;
  if (!key) throw new Error("ETSY_API_KEY is not set");
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
  const url = `${API}${path}${qs.size ? `?${qs}` : ""}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttl) return hit.data as T;

  const data = await withBackoff(async () => {
    await acquireEtsySlot(); // token bucket + daily budget (rate-limit.ts)
    const res = await fetch(url, { headers: { "x-api-key": key } });
    if (!res.ok) throw new Error(`Etsy API ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as T;
  });
  cache.set(url, { at: Date.now(), data });
  return data;
}

/* ---- Etsy API response shapes (fields we use) ---- */
interface EtsyImage {
  url_570xN?: string;
  url_fullxfull?: string;
}

interface EtsyListing {
  listing_id: number;
  title: string;
  description?: string;
  images?: EtsyImage[];
  price: { amount: number; divisor: number; currency_code: string };
  num_favorers: number;
  views?: number;
  tags?: string[];
  materials?: string[];
  style?: string[];
  shop_id: number;
  url: string;
}
interface EtsyListingSearch {
  count: number;
  results: EtsyListing[];
}
interface EtsyReview {
  rating: number;
  review?: string;
  created_timestamp?: number;
}

interface EtsyShop {
  shop_id: number;
  shop_name: string;
  title?: string;
  listing_active_count: number;
  transaction_sold_count: number;
  review_count: number;
  review_average?: number;
  num_favorers: number;
  create_date: number; // epoch seconds
  url: string;
}
interface EtsyShopSearch {
  count: number;
  results: EtsyShop[];
}

const TRADEMARK_TERMS = ["disney", "nike", "pokemon", "harry", "marvel", "barbie", "lego", "star wars", "taylor"];
const isTm = (t: string) => TRADEMARK_TERMS.some((tm) => t.toLowerCase().includes(tm));

function locationShare(location: Location): number {
  switch (location) {
    case "Global": return 1;
    case "USA": return 0.62;
    case "UK": return 0.18;
    case "EU": return 0.22;
    case "CAN": return 0.09;
    case "AUS": return 0.07;
    case "IND": return 0.05;
  }
}

/** Supply → competition score, log-scaled (1k listings ≈ 45, 100k ≈ 78, 1M ≈ 95). */
function competitionFromCount(count: number): number {
  if (count <= 0) return 2;
  return Math.round(Math.min(98, Math.max(2, 16 * Math.log10(count + 1) - 3)));
}

/** Demand proxy — see module docblock. Stable for equal inputs. */
function estimateVolume(count: number, listings: EtsyListing[], location: Location): number {
  const avgFav = listings.length
    ? listings.reduce((s, l) => s + (l.num_favorers ?? 0), 0) / listings.length
    : 0;
  const supplySignal = Math.pow(count + 1, 0.55) * 14;
  const engagementSignal = Math.pow(avgFav + 1, 0.8) * 22;
  return Math.max(10, Math.round((supplySignal + engagementSignal) * locationShare(location)));
}

function toSample(l: EtsyListing, shopName?: string): ListingSample {
  return {
    title: l.title,
    shop: shopName ?? `shop #${l.shop_id}`,
    price: l.price ? l.price.amount / l.price.divisor : 0,
    reviews: l.num_favorers ?? 0,
    competition: 0,
    volume: l.views ?? l.num_favorers ?? 0
  };
}

async function searchListings(keywords: string, limit = 50): Promise<EtsyListingSearch> {
  return etsyGet<EtsyListingSearch>("/listings/active", { keywords, limit });
}

function seasonalTrend(anchor: number, peakMonth = 10): TrendPoint[] {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dist = (a: number, b: number) => Math.min(Math.abs(a - b), 12 - Math.abs(a - b));
  return MONTHS.map((month, i) => ({
    month,
    volume: Math.max(10, Math.round(anchor * (0.6 + Math.exp(-Math.pow(dist(i, peakMonth), 2) / 6) * 0.8)))
  }));
}

async function tagRowFor(term: string, location: Location): Promise<TagResult> {
  try {
    const res = await searchListings(term, 12);
    return {
      name: term,
      competition: competitionFromCount(res.count),
      volume: estimateVolume(res.count, res.results, location),
      trademarkRisk: isTm(term)
    };
  } catch {
    return { name: term, competition: 50, volume: 0, trademarkRisk: isTm(term) };
  }
}

/** Cap concurrent per-term lookups to stay inside Etsy's default rate limits (~5 QPS). */
async function mapLimited<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    out.push(...(await Promise.all(items.slice(i, i + limit).map(fn))));
  }
  return out;
}

const fallback = new MockProvider();

export class EtsyProvider implements MarketplaceProviderFull {
  readonly source = "etsy" as const;

  async getTagReport(keyword: string, location: Location): Promise<TagReport> {
    const main = await searchListings(keyword, 100);
    const competition = competitionFromCount(main.count);
    const volume = estimateVolume(main.count, main.results, location);

    // Harvest candidate tags/materials/styles from what top listings actually use.
    const tagFreq = new Map<string, number>();
    const matFreq = new Map<string, number>();
    const styleFreq = new Map<string, number>();
    for (const l of main.results) {
      for (const t of l.tags ?? []) tagFreq.set(t.toLowerCase(), (tagFreq.get(t.toLowerCase()) ?? 0) + 1);
      for (const m of l.materials ?? []) matFreq.set(m.toLowerCase(), (matFreq.get(m.toLowerCase()) ?? 0) + 1);
      for (const st of l.style ?? []) styleFreq.set(st.toLowerCase(), (styleFreq.get(st.toLowerCase()) ?? 0) + 1);
    }
    const top = (m: Map<string, number>, n: number) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([t]) => t);

    const tagTerms = [keyword, ...top(tagFreq, 14).filter((t) => t !== keyword.toLowerCase())].slice(0, 15);
    const [tags, materials, styles] = await Promise.all([
      mapLimited(tagTerms, 4, (t) => tagRowFor(t, location)),
      mapLimited(top(matFreq, 8), 4, (t) => tagRowFor(t, location)),
      mapLimited(top(styleFreq, 8), 4, (t) => tagRowFor(t, location))
    ]);

    const prices = main.results.map((l) => (l.price ? l.price.amount / l.price.divisor : 0)).filter((p) => p > 0).sort((a, b) => a - b);
    const q = (p: number) => prices[Math.min(prices.length - 1, Math.floor(p * prices.length))] ?? 0;
    const priceBands: PriceBand[] = prices.length
      ? [
          { label: "Bargain", min: q(0), max: q(0.33), share: 33 },
          { label: "Midrange", min: q(0.33), max: q(0.66), share: 34 },
          { label: "Premium", min: q(0.66), max: q(0.99), share: 33 }
        ]
      : (await fallback.getTagReport(keyword, location)).priceBands;

    return {
      keyword,
      location,
      competition,
      volume,
      tags,
      materials: materials.length ? materials : (await fallback.getTagReport(keyword, location)).materials,
      styles: styles.length ? styles : (await fallback.getTagReport(keyword, location)).styles,
      listings: main.results.slice(0, 8).map((l) => toSample(l)),
      priceBands,
      trend: seasonalTrend(volume)
    };
  }

  async getKeywordIdeas(keyword: string, location: Location): Promise<KeywordReport> {
    // Frame the seed through the intents buyers actually search with, then
    // score each phrase against real supply.
    const frames: Array<{ phrase: string; intent: KeywordIdea["intent"] }> = [
      { phrase: `${keyword} gift for her`, intent: "gift" },
      { phrase: `${keyword} gift for him`, intent: "gift" },
      { phrase: `${keyword} for mom`, intent: "gift" },
      { phrase: `${keyword} anniversary gift`, intent: "gift" },
      { phrase: `personalized ${keyword}`, intent: "personalized" },
      { phrase: `custom ${keyword} with name`, intent: "personalized" },
      { phrase: `${keyword} birthday`, intent: "occasion" },
      { phrase: `${keyword} wedding favor`, intent: "occasion" },
      { phrase: `${keyword} christmas ornament`, intent: "occasion" },
      { phrase: `minimalist ${keyword}`, intent: "style" },
      { phrase: `boho ${keyword}`, intent: "style" },
      { phrase: `vintage ${keyword}`, intent: "style" },
      { phrase: `handmade ${keyword}`, intent: "generic" },
      { phrase: `${keyword} set`, intent: "generic" },
      { phrase: `small ${keyword}`, intent: "generic" }
    ];
    const rows = await mapLimited(frames, 4, async (f) => {
      const r = await tagRowFor(f.phrase, location);
      return { phrase: f.phrase, intent: f.intent, competition: r.competition, volume: r.volume };
    });
    return { keyword, location, ideas: rows };
  }

  async getShopReport(shopName: string, location: Location): Promise<ShopReport> {
    const clean = shopName.trim().replace(/^https?:\/\/(www\.)?etsy\.com\/shop\//i, "").replace(/[\/?#].*$/, "");
    const found = await etsyGet<EtsyShopSearch>("/shops", { shop_name: clean, limit: 1 }, TTL.entity);
    const shop = found.results?.[0];
    if (!shop) throw new Error(`Shop "${clean}" not found on Etsy.`);

    const listings = await etsyGet<EtsyListingSearch>(`/shops/${shop.shop_id}/listings/active`, { limit: 25 }, TTL.entity);
    const ageYears = Math.round(((Date.now() / 1000 - shop.create_date) / (365.25 * 24 * 3600)) * 10) / 10;
    const rating = shop.review_average ?? 0;

    const tagFreq = new Map<string, number>();
    for (const l of listings.results) for (const t of l.tags ?? []) tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1);
    const topTags = [...tagFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t);
    const tagCloud = await mapLimited(topTags, 4, (t) => tagRowFor(t, location));

    const reviewRate = shop.review_count / Math.max(1, shop.transaction_sold_count);
    const score = Math.round(Math.min(100,
      rating * 12 + Math.min(20, ageYears * 3) + Math.min(18, shop.listing_active_count / 12) + (shop.review_count > 500 ? 8 : 3)
    ));

    const strengths: string[] = [];
    const issues: string[] = [];
    (rating >= 4.7 ? strengths : issues).push(
      rating >= 4.7 ? `Strong rating (${rating.toFixed(2)}★) builds conversion trust.` : `Rating ${rating.toFixed(2)}★ — below the 4.7★ range top shops hold.`
    );
    (shop.listing_active_count >= 40 ? strengths : issues).push(
      shop.listing_active_count >= 40
        ? `${shop.listing_active_count} active listings give wide keyword coverage.`
        : `Only ${shop.listing_active_count} active listings — more listings mean more search entry points.`
    );
    (reviewRate > 0.18 ? strengths : issues).push(
      reviewRate > 0.18 ? "Healthy review rate suggests satisfied buyers." : "Low review rate — a post-purchase follow-up can lift this."
    );

    // Reviews (public endpoint). Star-rating drives the sentiment tag; the
    // text is shown verbatim. Failure here must never sink the whole report.
    const reviewsRaw = await etsyGet<{ count: number; results: EtsyReview[] }>(
      `/shops/${shop.shop_id}/reviews`, { limit: 25 }, TTL.entity
    ).catch(() => ({ count: 0, results: [] as EtsyReview[] }));
    const counts = new Map<number, number>();
    for (const rv of reviewsRaw.results) counts.set(rv.rating, (counts.get(rv.rating) ?? 0) + 1);
    const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: counts.get(stars) ?? 0 }));
    const recentReviews: ShopReview[] = reviewsRaw.results
      .filter((rv) => rv.review && rv.review.trim())
      .slice(0, 12)
      .map((rv) => ({
        rating: rv.rating,
        text: (rv.review ?? "").slice(0, 400),
        date: new Date((rv.created_timestamp ?? Date.now() / 1000) * 1000).toISOString(),
        sentiment: rv.rating >= 4 ? ("positive" as const) : rv.rating === 3 ? ("neutral" as const) : ("negative" as const)
      }));

    return {
      shop: {
        name: shop.shop_name,
        tagline: shop.title ?? "",
        activeListings: shop.listing_active_count,
        totalSales: shop.transaction_sold_count,
        reviews: shop.review_count,
        rating,
        favorites: shop.num_favorers,
        ageYears,
        url: shop.url
      },
      score,
      topListings: listings.results
        .slice()
        .sort((a, b) => (b.num_favorers ?? 0) - (a.num_favorers ?? 0))
        .slice(0, 6)
        .map((l) => toSample(l, shop.shop_name)),
      tagCloud,
      strengths,
      issues,
      ratingBreakdown,
      recentReviews
    };
  }

  async getListingReport(listingRef: string, location: Location): Promise<ListingReport> {
    const idMatch = listingRef.match(/listing\/(\d+)/) ?? listingRef.match(/^(\d{6,})$/);
    if (!idMatch) throw new Error("Paste a full Etsy listing URL or a numeric listing ID.");
    const listing = await etsyGet<EtsyListing>(`/listings/${idMatch[1]}`, { includes: "Images" }, TTL.entity);

    const tagsUsed = listing.tags ?? [];
    const title = listing.title;
    const primary = title.split(/[,|–—-]/)[0]?.trim().toLowerCase() ?? "";
    const checks = [
      {
        label: "Uses all 13 tags",
        pass: tagsUsed.length === 13,
        note: tagsUsed.length === 13 ? "All 13 slots filled." : `${tagsUsed.length}/13 tags used — every empty slot is a lost ranking opportunity.`
      },
      {
        label: "Title under 15 words, natural phrasing (2026)",
        pass: title.trim().split(/\s+/).length <= 15,
        note: `${title.trim().split(/\s+/).length} words — Etsy's 2026 guidance penalizes keyword-stuffed titles; keyword variations belong in tags.`
      },
      {
        label: "Buyer phrase inside the first 70 characters",
        pass: tagsUsed.some((t) => title.toLowerCase().slice(0, 70).includes(t.toLowerCase())),
        note: "Mobile shows ~70 characters; lead with what the product is, in the buyer's words."
      },
      {
        label: "Multi-word (long-tail) tags",
        pass: tagsUsed.filter((t) => t.trim().includes(" ")).length >= Math.ceil(tagsUsed.length / 2),
        note: "Long-tail tags match specific searches with less competition."
      },
      {
        label: "No trademark-risk terms",
        pass: !tagsUsed.some(isTm) && !isTm(title),
        note: tagsUsed.some(isTm) || isTm(title) ? "A term matches a known brand — replace with descriptive wording." : "Clean."
      },
      {
        label: "Materials filled",
        pass: (listing.materials?.length ?? 0) > 0,
        note: "Materials are an extra searchable field — free relevance."
      }
    ];
    const graded = gradeListing(title, tagsUsed, listing.description ?? "", listing.images?.length ?? 0);
    const score = graded.totalScore;

    const suggestedTags = await mapLimited(
      (tagsUsed.length ? tagsUsed : [primary]).slice(0, 13),
      4,
      (t) => tagRowFor(t, location)
    );

    const shop = await etsyGet<EtsyShop>(`/shops/${listing.shop_id}`, {}, TTL.entity).catch(() => null);
    const anchor = estimateVolume(1000, [listing], location);

    return {
      ref: listingRef,
      title,
      shop: shop?.shop_name ?? `shop #${listing.shop_id}`,
      price: listing.price ? listing.price.amount / listing.price.divisor : 0,
      tagsUsed,
      titleLength: title.length,
      score,
      grade: graded.grade,
      sections: graded.sections,
      checks,
      suggestedTags,
      trend: seasonalTrend(anchor),
      imageUrls: (listing.images ?? []).map((im) => im.url_570xN ?? im.url_fullxfull ?? "").filter(Boolean).slice(0, 10)
    };
  }

  async getRank(listingRef: string, keyword: string, location: Location): Promise<RankResult> {
    const idMatch = listingRef.match(/listing\/(\d+)/) ?? listingRef.match(/^(\d{6,})$/);
    if (!idMatch) throw new Error("Paste a full Etsy listing URL or a numeric listing ID.");
    const targetId = Number(idMatch[1]);

    // Sample the top 100 results the way a buyer would page through them.
    const page1 = await etsyGet<EtsyListingSearch>("/listings/active", { keywords: keyword, limit: 100 }, TTL.rank);
    const idx = page1.results.findIndex((l) => l.listing_id === targetId);
    const position = idx === -1 ? null : idx + 1;

    const around =
      position === null
        ? page1.results.slice(0, 5)
        : page1.results.slice(Math.max(0, idx - 2), Math.max(0, idx - 2) + 5);

    return {
      listingRef,
      keyword,
      location,
      position,
      page: position ? Math.ceil(position / 48) : null,
      totalSampled: Math.min(100, page1.results.length),
      neighborhood: around.map((l) => ({
        ...toSample(l),
        shop: l.listing_id === targetId ? "→ your listing" : toSample(l).shop
      }))
    };
  }

  async getTrends(location: Location, seed = "handmade"): Promise<TrendsReport> {
    // No historical endpoint exists, so "change" compares engagement-weighted
    // volume of seed variations against their plain baselines. Directional.
    const variations = [
      `${seed} 2026`, `personalized ${seed}`, `${seed} gift`, `vintage ${seed}`,
      `minimalist ${seed}`, `${seed} decor`, `custom ${seed}`, `${seed} set`
    ];
    const base = await tagRowFor(seed, location);
    const rows = await mapLimited(variations, 4, async (v) => {
      const r = await tagRowFor(v, location);
      const changePct = base.volume > 0 ? Math.round(((r.volume - base.volume) / base.volume) * 100) : 0;
      return { keyword: v, volume: r.volume, changePct, competition: r.competition };
    });
    const sorted = rows.slice().sort((a, b) => b.changePct - a.changePct);
    const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][new Date().getMonth()];
    return {
      location,
      period: "relative to seed baseline",
      risers: sorted.filter((r) => r.changePct >= 0).slice(0, 8),
      fallers: sorted.filter((r) => r.changePct < 0).slice(0, 8),
      seasonalPicks: { month, keywords: variations.slice(0, 5) }
    };
  }

  async getBestSellers(keyword: string, location: Location): Promise<BestSellersReport> {
    const res = await searchListings(keyword, 50);
    const items: BestSellerItem[] = res.results
      .slice()
      .sort((a, b) => (b.num_favorers ?? 0) - (a.num_favorers ?? 0))
      .slice(0, 10)
      .map((l) => {
        const s = toSample(l);
        // Favorites → sales proxy (documented heuristic; Etsy hides sales per listing).
        const estMonthlySales = Math.max(1, Math.round((l.num_favorers ?? 0) * 0.06));
        return { ...s, estMonthlySales, estMonthlyRevenue: Math.round(estMonthlySales * s.price) };
      });
    return { keyword, location, items };
  }

  async getNicheIdeas(seed: string, location: Location): Promise<NicheReport> {
    const styles = ["minimalist", "boho", "vintage", "cottagecore", "art deco", "celestial", "botanical", "gothic"];
    const rows = await mapLimited(styles, 4, async (style) => {
      const name = `${style} ${seed.trim().toLowerCase()}`;
      const r = await tagRowFor(name, location);
      const opportunity = Math.round(Math.max(2, Math.min(98, (r.volume / 200) * 0.4 + (100 - r.competition) * 0.6)));
      const niche: NicheIdea = {
        name,
        demand: r.volume,
        competition: r.competition,
        opportunity,
        sampleKeywords: [`${name} gift`, `personalized ${name}`, `${name} decor`, `custom ${name}`]
      };
      return niche;
    });
    return { seed, location, niches: rows.sort((a, b) => b.opportunity - a.opportunity) };
  }
}
