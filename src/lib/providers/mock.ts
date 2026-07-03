import { gradeListing } from "@/lib/grades";
import {
  BestSellerItem,
  ShopReview,
  BestSellersReport,
  CheckItem,
  KeywordIdea,
  KeywordReport,
  ListingReport,
  ListingSample,
  Location,
  MarketplaceProviderFull,
  NicheIdea,
  NicheReport,
  PriceBand,
  RankResult,
  ShopReport,
  TagReport,
  TagResult,
  TrendItem,
  TrendPoint,
  TrendsReport
} from "./types";

/* Deterministic PRNG (mulberry32) seeded from the query string, so the same
   search always returns the same convincing data — great for demos and tests. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TAG_MODIFIERS = [
  "gift", "personalized", "handmade", "custom", "vintage", "minimalist", "boho",
  "for her", "for him", "wall art", "decor", "unique", "aesthetic", "gift for mom",
  "birthday gift", "anniversary", "wedding", "christmas", "digital download",
  "printable", "set", "bundle", "kit", "charm", "engraved", "rustic", "modern",
  "cottagecore", "y2k", "retro", "eco friendly", "small", "large", "mini"
];

const MATERIALS = [
  "sterling silver", "gold plated", "stainless steel", "cotton", "linen", "ceramic",
  "polymer clay", "resin", "walnut wood", "oak", "leather", "wool", "brass",
  "recycled paper", "acrylic", "glass", "bamboo", "epoxy", "canvas", "felt"
];

const STYLES = [
  "minimalist", "boho", "vintage", "cottagecore", "art deco", "scandinavian",
  "japandi", "mid century", "gothic", "kawaii", "rustic", "industrial",
  "watercolor", "line art", "abstract", "botanical", "celestial", "geometric"
];

const SHOP_SUFFIXES = ["Studio", "Co", "Crafts", "Atelier", "Corner", "Nest", "Works", "Haven", "Lane", "Loft"];
const SHOP_PREFIXES = ["Willow", "Ember", "Maple", "Luna", "Fox", "Cedar", "Aurora", "Pebble", "Meadow", "Iris"];

const TRADEMARK_TERMS = ["disney", "nike", "pokemon", "harry", "marvel", "barbie", "lego", "star wars", "taylor"];

function isTrademarkRisk(term: string): boolean {
  const t = term.toLowerCase();
  return TRADEMARK_TERMS.some((tm) => t.includes(tm));
}

function locationFactor(location: Location): number {
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

function makeTagRow(name: string, r: () => number, base: number, loc: Location): TagResult {
  const volume = Math.max(40, Math.round(base * (0.15 + r() * 1.4) * locationFactor(loc)));
  return {
    name,
    competition: Math.round(8 + r() * 90),
    volume,
    trademarkRisk: isTrademarkRisk(name)
  };
}

function pick<T>(arr: T[], r: () => number, n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(r() * copy.length), 1)[0]);
  }
  return out;
}

export class MockProvider implements MarketplaceProviderFull {
  readonly source: "mock" | "etsy" | "scrape" = "mock";

  async getTagReport(keyword: string, location: Location): Promise<TagReport> {
    const r = rng(hash(keyword.toLowerCase().trim() + "::" + location));
    const baseVolume = Math.round(600 + r() * 24000);
    const competition = Math.round(12 + r() * 84);

    const tags: TagResult[] = [
      makeTagRow(keyword, r, baseVolume, location),
      ...pick(TAG_MODIFIERS, r, 14).map((m) =>
        makeTagRow(r() > 0.5 ? `${keyword} ${m}` : `${m} ${keyword}`, r, baseVolume, location)
      )
    ];

    const materials = pick(MATERIALS, r, 10).map((m) => makeTagRow(m, r, baseVolume * 0.6, location));
    const styles = pick(STYLES, r, 10).map((s) => makeTagRow(`${s} ${keyword}`, r, baseVolume * 0.5, location));

    const anchor = 8 + r() * 60;
    const listings: ListingSample[] = Array.from({ length: 8 }, (_, i) => ({
      title: `${cap(keyword)} — ${pick(TAG_MODIFIERS, r, 2).join(", ")} (${pick(STYLES, r, 1)[0]})`,
      shop: pick(SHOP_PREFIXES, r, 1)[0] + pick(SHOP_SUFFIXES, r, 1)[0],
      price: round2(anchor * (0.5 + r() * 1.8)),
      reviews: Math.round(r() * 4200),
      competition: Math.round(8 + r() * 90),
      volume: Math.max(30, Math.round(baseVolume * (0.1 + r()) * locationFactor(location))),
      _i: i
    })).map(({ _i, ...rest }) => rest);

    const bMax = round2(anchor * 0.8);
    const mMax = round2(anchor * 1.6);
    const bargain = Math.round(20 + r() * 35);
    const premium = Math.round(10 + r() * 30);
    const priceBands: PriceBand[] = [
      { label: "Bargain", min: round2(anchor * 0.3), max: bMax, share: bargain },
      { label: "Midrange", min: bMax, max: mMax, share: 100 - bargain - premium },
      { label: "Premium", min: mMax, max: round2(anchor * 3.4), share: premium }
    ];

    /* 12-month curve: gentle base drift + seasonal peak (Q4 for most niches). */
    const peak = r() > 0.25 ? 10 : Math.floor(r() * 12); // usually November
    const trend: TrendPoint[] = MONTHS.map((month, i) => {
      const seasonal = Math.exp(-Math.pow(circularDistance(i, peak), 2) / 6) * 0.9;
      const wobble = (r() - 0.5) * 0.16;
      return {
        month,
        volume: Math.max(20, Math.round(baseVolume * locationFactor(location) * (0.55 + seasonal + wobble)))
      };
    });

    return {
      keyword,
      location,
      competition,
      volume: Math.round(baseVolume * locationFactor(location)),
      tags,
      materials,
      styles,
      listings,
      priceBands,
      trend
    };
  }

  async getKeywordIdeas(keyword: string, location: Location): Promise<KeywordReport> {
    const r = rng(hash("kw::" + keyword.toLowerCase().trim() + "::" + location));
    const base = Math.round(500 + r() * 18000);
    const frames: Array<{ tpl: (k: string) => string; intent: KeywordIdea["intent"] }> = [
      { tpl: (k) => `${k} gift for her`, intent: "gift" },
      { tpl: (k) => `${k} gift for him`, intent: "gift" },
      { tpl: (k) => `personalized ${k}`, intent: "personalized" },
      { tpl: (k) => `custom ${k} with name`, intent: "personalized" },
      { tpl: (k) => `${k} birthday`, intent: "occasion" },
      { tpl: (k) => `${k} wedding favor`, intent: "occasion" },
      { tpl: (k) => `${k} christmas ornament`, intent: "occasion" },
      { tpl: (k) => `minimalist ${k}`, intent: "style" },
      { tpl: (k) => `boho ${k}`, intent: "style" },
      { tpl: (k) => `vintage ${k}`, intent: "style" },
      { tpl: (k) => `${k} set`, intent: "generic" },
      { tpl: (k) => `handmade ${k}`, intent: "generic" },
      { tpl: (k) => `${k} for mom`, intent: "gift" },
      { tpl: (k) => `${k} anniversary gift`, intent: "gift" },
      { tpl: (k) => `small ${k}`, intent: "generic" }
    ];
    const ideas: KeywordIdea[] = frames.map((f) => ({
      phrase: f.tpl(keyword),
      intent: f.intent,
      competition: Math.round(8 + r() * 90),
      volume: Math.max(30, Math.round(base * (0.1 + r() * 1.2) * locationFactor(location)))
    }));
    return { keyword, location, ideas };
  }

  async getShopReport(shopName: string, location: Location): Promise<ShopReport> {
    const clean = shopName.trim().replace(/^https?:\/\/(www\.)?etsy\.com\/shop\//i, "").replace(/[\/?#].*$/, "");
    const r = rng(hash("shop::" + clean.toLowerCase() + "::" + location));
    const ageYears = Math.round((0.5 + r() * 9) * 10) / 10;
    const activeListings = Math.round(8 + r() * 420);
    const totalSales = Math.round(activeListings * (2 + r() * 90) * ageYears);
    const reviews = Math.round(totalSales * (0.12 + r() * 0.25));
    const rating = Math.round((4.2 + r() * 0.8) * 100) / 100;
    const favorites = Math.round(totalSales * (0.4 + r()));
    const niche = pick(STYLES, r, 1)[0];

    const topListings: ListingSample[] = Array.from({ length: 6 }, () => ({
      title: `${cap(niche)} ${pick(TAG_MODIFIERS, r, 2).join(" ")} by ${clean}`,
      shop: clean,
      price: round2(9 + r() * 120),
      reviews: Math.round(r() * reviews * 0.2),
      competition: Math.round(10 + r() * 85),
      volume: Math.round(150 + r() * 8000 * locationFactor(location))
    }));

    const tagCloud = pick(TAG_MODIFIERS, r, 12).map((m) => makeTagRow(`${niche} ${m}`, r, 4000, location));

    const score = Math.round(
      Math.min(100,
        rating * 12 + Math.min(20, ageYears * 3) + Math.min(18, activeListings / 12) + (reviews > 500 ? 8 : 3)
      )
    );

    const strengths: string[] = [];
    const issues: string[] = [];
    (rating >= 4.7 ? strengths : issues).push(
      rating >= 4.7 ? `Strong rating (${rating}★) builds conversion trust.` : `Rating ${rating}★ — below the 4.7★ range top shops hold.`
    );
    (activeListings >= 40 ? strengths : issues).push(
      activeListings >= 40
        ? `${activeListings} active listings give the shop wide keyword coverage.`
        : `Only ${activeListings} active listings — more listings mean more entry points from search.`
    );
    (reviews / Math.max(1, totalSales) > 0.18 ? strengths : issues).push(
      reviews / Math.max(1, totalSales) > 0.18
        ? "Healthy review rate suggests buyers are satisfied post-purchase."
        : "Low review rate — a post-purchase follow-up message can lift this."
    );
    if (r() > 0.5) issues.push("Several top listings reuse near-identical titles; diversify primary keywords.");
    else strengths.push("Top listings target distinct primary keywords instead of competing with each other.");

    // Reviews: distribution skewed by the shop's rating, plus a recent feed.
    const five = Math.round(reviews * (0.55 + (rating - 4.2) * 0.4));
    const four = Math.round(reviews * 0.2);
    const three = Math.round(reviews * 0.08);
    const two = Math.round(reviews * 0.04);
    const one = Math.max(0, reviews - five - four - three - two);
    const ratingBreakdown = [
      { stars: 5, count: five }, { stars: 4, count: four }, { stars: 3, count: three },
      { stars: 2, count: two }, { stars: 1, count: one }
    ];
    const POS = [
      "Absolutely beautiful, even better in person. Fast shipping too!",
      "Perfect gift — the personalization came out exactly as requested.",
      "Great quality for the price, seller answered my questions quickly.",
      "Packaged with care, arrived early. Will order again.",
      "Stunning craftsmanship — you can tell it's handmade with love."
    ];
    const NEU = [
      "Nice item, though the color is slightly different from the photos.",
      "Good overall. Shipping took a bit longer than expected.",
      "Does the job. Slightly smaller than I imagined from the listing."
    ];
    const NEG = [
      "Arrived damaged and the replacement took weeks. Disappointed.",
      "Looks nothing like the photos. Quality feels cheap.",
      "Seller never responded to my message about sizing."
    ];
    const recentReviews: ShopReview[] = Array.from({ length: 9 }, () => {
      const roll = r();
      const sentiment = roll < 0.62 ? ("positive" as const) : roll < 0.85 ? ("neutral" as const) : ("negative" as const);
      const pool = sentiment === "positive" ? POS : sentiment === "neutral" ? NEU : NEG;
      return {
        rating: sentiment === "positive" ? (r() > 0.3 ? 5 : 4) : sentiment === "neutral" ? 3 : r() > 0.5 ? 2 : 1,
        text: pool[Math.floor(r() * pool.length)],
        date: new Date(Date.now() - Math.round(r() * 60) * 86400000).toISOString(),
        sentiment
      };
    });

    return {
      shop: {
        name: clean,
        tagline: `${cap(niche)} pieces, made to order`,
        activeListings,
        totalSales,
        reviews,
        rating,
        favorites,
        ageYears,
        url: `https://www.etsy.com/shop/${clean}`
      },
      score,
      topListings,
      tagCloud,
      strengths,
      issues,
      ratingBreakdown,
      recentReviews
    };
  }

  async getListingReport(listingRef: string, location: Location): Promise<ListingReport> {
    const r = rng(hash("listing::" + listingRef.toLowerCase().trim() + "::" + location));
    const niche = pick(STYLES, r, 1)[0];
    const core = pick(TAG_MODIFIERS, r, 1)[0];
    const title = `${cap(niche)} ${cap(core)} — ${pick(TAG_MODIFIERS, r, 2).join(", ")}, handmade`;
    const shop = pick(SHOP_PREFIXES, r, 1)[0] + pick(SHOP_SUFFIXES, r, 1)[0];
    const tagCount = Math.round(6 + r() * 7); // 6–13
    const tagsUsed = pick(TAG_MODIFIERS, r, tagCount).map((m) => `${niche} ${m}`.slice(0, 20));
    const titleLength = title.length;

    const checks: CheckItem[] = [
      {
        label: "Uses all 13 tags",
        pass: tagCount === 13,
        note: tagCount === 13 ? "All 13 slots filled." : `${tagCount}/13 tags used — every empty slot is a free ranking opportunity lost.`
      },
      {
        label: "Title under 15 words, natural phrasing (2026)",
        pass: title.trim().split(/\s+/).length <= 15,
        note: `${title.trim().split(/\s+/).length} words — Etsy's 2026 guidance penalizes keyword-stuffed titles; aim under 15 words, product first.`
      },
      {
        label: "Buyer phrase inside the first 70 characters",
        pass: r() > 0.4,
        note: "Mobile shows ~70 characters; lead with what the product is, in the buyer's words."
      },
      {
        label: "Multi-word (long-tail) tags",
        pass: r() > 0.3,
        note: "Long-tail tags match specific buyer searches with less competition."
      },
      {
        label: "No trademark-risk terms",
        pass: !tagsUsed.some(isTrademarkRisk),
        note: tagsUsed.some(isTrademarkRisk) ? "At least one tag matches a known brand — replace with descriptive wording." : "Clean."
      },
      {
        label: "Attributes & materials filled",
        pass: r() > 0.35,
        note: "Materials and attributes are extra searchable fields — free relevance."
      }
    ];

    const imageCount = Math.round(1 + r() * 9);
    const descLen = Math.round(120 + r() * 900);
    const graded = gradeListing(title, tagsUsed, "x".repeat(descLen), imageCount);
    const score = graded.totalScore;
    const suggestedTags = pick(TAG_MODIFIERS, r, 13).map((m) => makeTagRow(`${niche} ${m}`, r, 5000, location));

    const peak = 10;
    const trend: TrendPoint[] = MONTHS.map((month, i) => ({
      month,
      volume: Math.max(20, Math.round(3000 * locationFactor(location) * (0.55 + Math.exp(-Math.pow(circularDistance(i, peak), 2) / 6) * 0.9 + (r() - 0.5) * 0.16)))
    }));

    return { ref: listingRef, title, shop, price: round2(12 + r() * 90), tagsUsed, titleLength, score, grade: graded.grade, sections: graded.sections, checks, suggestedTags, trend };
  }

  async getRank(listingRef: string, keyword: string, location: Location): Promise<RankResult> {
    const r = rng(hash("rank::" + listingRef.toLowerCase().trim() + "::" + keyword.toLowerCase().trim() + "::" + location));
    const found = r() > 0.18;
    const position = found ? Math.max(1, Math.round(Math.pow(r(), 1.6) * 100)) : null;
    const neighborhood: ListingSample[] = Array.from({ length: 5 }, (_, i) => ({
      title: `${cap(keyword)} ${pick(TAG_MODIFIERS, r, 2).join(" ")}`,
      shop: pick(SHOP_PREFIXES, r, 1)[0] + pick(SHOP_SUFFIXES, r, 1)[0],
      price: round2(8 + r() * 70),
      reviews: Math.round(r() * 3000),
      competition: Math.round(10 + r() * 85),
      volume: Math.round(100 + r() * 6000),
      ...(position && i === 2 ? { shop: "→ your listing" } : {})
    }));
    return {
      listingRef,
      keyword,
      location,
      position,
      page: position ? Math.ceil(position / 48) : null,
      totalSampled: 100,
      neighborhood
    };
  }

  async getTrends(location: Location, seed = "etsy"): Promise<TrendsReport> {
    const r = rng(hash("trends::" + seed.toLowerCase() + "::" + location + "::" + new Date().toISOString().slice(0, 7)));
    const pool = [...TAG_MODIFIERS.map((m) => `${m} ${pick(STYLES, r, 1)[0]}`), ...STYLES.map((s) => `${s} decor`)];
    const make = (sign: 1 | -1): TrendItem[] =>
      pick(pool, r, 8).map((keyword) => ({
        keyword,
        volume: Math.round((400 + r() * 20000) * locationFactor(location)),
        changePct: Math.round(sign * (8 + r() * 140)),
        competition: Math.round(8 + r() * 88)
      })).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
    const month = MONTHS[new Date().getMonth()];
    return {
      location,
      period: "last 30 days",
      risers: make(1),
      fallers: make(-1),
      seasonalPicks: { month, keywords: pick(TAG_MODIFIERS, r, 5).map((m) => `${m} ${pick(STYLES, r, 1)[0]}`) }
    };
  }

  async getBestSellers(keyword: string, location: Location): Promise<BestSellersReport> {
    const r = rng(hash("best::" + keyword.toLowerCase().trim() + "::" + location));
    const items: BestSellerItem[] = Array.from({ length: 10 }, () => {
      const price = round2(9 + r() * 110);
      const estMonthlySales = Math.round(20 + Math.pow(r(), 1.3) * 900);
      return {
        title: `${cap(keyword)} ${pick(TAG_MODIFIERS, r, 2).join(" ")} (${pick(STYLES, r, 1)[0]})`,
        shop: pick(SHOP_PREFIXES, r, 1)[0] + pick(SHOP_SUFFIXES, r, 1)[0],
        price,
        reviews: Math.round(300 + r() * 9000),
        competition: Math.round(20 + r() * 75),
        volume: Math.round((500 + r() * 15000) * locationFactor(location)),
        estMonthlySales,
        estMonthlyRevenue: Math.round(estMonthlySales * price)
      };
    }).sort((a, b) => b.estMonthlyRevenue - a.estMonthlyRevenue);
    return { keyword, location, items };
  }

  async getNicheIdeas(seed: string, location: Location): Promise<NicheReport> {
    const r = rng(hash("niche::" + seed.toLowerCase().trim() + "::" + location));
    const niches: NicheIdea[] = pick(STYLES, r, 8).map((style) => {
      const demand = Math.round((300 + r() * 18000) * locationFactor(location));
      const competition = Math.round(8 + r() * 90);
      const opportunity = Math.round(Math.max(2, Math.min(98, (demand / 200) * 0.4 + (100 - competition) * 0.6)));
      return {
        name: `${style} ${seed.trim().toLowerCase()}`,
        demand,
        competition,
        opportunity,
        sampleKeywords: pick(TAG_MODIFIERS, r, 4).map((m) => `${style} ${seed.trim().toLowerCase()} ${m}`.slice(0, 40))
      };
    }).sort((a, b) => b.opportunity - a.opportunity);
    return { seed, location, niches };
  }
}

function cap(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function circularDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 12 - d);
}
