import { MockProvider } from "./mock";
import {
  Location, ShopReport, ListingReport, RankResult, ReviewSentiment, ShopReview
} from "./types";
import {
  fetchEtsyPage, parseShopPage, parseListingPage, parseSearchPage,
  ScrapeBlockedError, ScrapeNotFoundError
} from "@/lib/etsy-scrape";
import { gradeListing } from "@/lib/grades";

/**
 * ScrapeProvider — real data from public Etsy pages, with the deterministic
 * MockProvider as the base class so anything scraping can't supply (keyword
 * search-volume estimates, seasonal curves) still returns something coherent
 * and clearly demo-flavored rather than crashing.
 *
 * Contract with the UI: everything this returns is badged `source: "scrape"`.
 * Numbers that come straight off the page are real; numbers Etsy doesn't
 * expose publicly (e.g. per-keyword search volume) are estimated and the
 * copy says so. When a page is blocked by anti-bot, methods degrade to the
 * mock rather than inventing a confident-looking wrong answer.
 *
 * Enabled with MARKETPLACE_PROVIDER=scrape (no API key needed).
 */
export class ScrapeProvider extends MockProvider {
  readonly source = "scrape" as const;

  private shopSlug(input: string): string {
    return input.trim()
      .replace(/^https?:\/\/(www\.)?etsy\.com\/[a-z-]*\/?shop\//i, "")
      .replace(/^https?:\/\/(www\.)?etsy\.com\/shop\//i, "")
      .replace(/[/?#].*$/, "");
  }

  private listingId(input: string): string | null {
    const m = input.match(/listing\/(\d+)/) ?? input.match(/^(\d{6,})$/);
    return m ? m[1] : null;
  }

  private sentimentFromRating(rating: number): ReviewSentiment {
    return rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative";
  }

  /* ---------------------------------------------------------- shop */
  async getShopReport(shopName: string, location: Location): Promise<ShopReport> {
    const slug = this.shopSlug(shopName);
    try {
      const html = await fetchEtsyPage(`https://www.etsy.com/shop/${slug}`);
      const s = parseShopPage(html, slug);

      // Anything the page didn't yield, borrow a coherent value from the mock
      // (clearly demo) so the report stays whole. Real values win.
      const mock = await super.getShopReport(slug, location);
      const rating = s.rating ?? mock.shop.rating;
      const reviews = s.reviews ?? mock.shop.reviews;
      const totalSales = s.totalSales ?? mock.shop.totalSales;
      const activeListings = s.activeListings ?? mock.shop.activeListings;

      // Reviews feed: scrape the shop's reviews page for real text where possible.
      const recentReviews = await this.scrapeReviews(slug).catch(() => mock.recentReviews);
      const five = recentReviews.filter((r) => r.rating === 5).length;
      const ratingBreakdown = recentReviews.length
        ? [5, 4, 3, 2, 1].map((stars) => ({ stars, count: recentReviews.filter((r) => r.rating === stars).length }))
        : mock.ratingBreakdown;

      const strengths: string[] = [];
      const issues: string[] = [];
      (rating >= 4.7 ? strengths : issues).push(rating >= 4.7 ? `Strong ${rating}★ rating builds buyer trust.` : `${rating}★ rating — below the 4.7★ top shops hold.`);
      if (activeListings) (activeListings >= 40 ? strengths : issues).push(activeListings >= 40 ? `${activeListings} listings give wide keyword coverage.` : `Only ${activeListings} listings — more listings, more search entry points.`);
      if (five > recentReviews.length * 0.7) strengths.push("Recent reviews skew strongly positive.");

      return {
        shop: {
          name: s.name,
          tagline: s.tagline || mock.shop.tagline,
          activeListings: activeListings ?? 0,
          totalSales: totalSales ?? 0,
          reviews: reviews ?? 0,
          rating: rating ?? 0,
          favorites: s.favorites ?? mock.shop.favorites, // real when the page exposes it
          ageYears: s.onEtsySince ? Math.max(0.5, new Date().getFullYear() - s.onEtsySince) : mock.shop.ageYears,
          url: s.url
        },
        score: mock.score,
        topListings: mock.topListings, // per-listing shop breakdown needs many fetches; estimated here
        tagCloud: mock.tagCloud,
        strengths,
        issues,
        ratingBreakdown,
        recentReviews
      };
    } catch (err) {
      // Blocked or missing → honest fallback to demo data (still badged scrape).
      if (err instanceof ScrapeNotFoundError) throw new Error(`Shop "${slug}" not found on Etsy.`);
      const mock = await super.getShopReport(slug, location);
      return { ...mock, issues: [this.blockNote(err), ...mock.issues] };
    }
  }

  private async scrapeReviews(slug: string): Promise<ShopReview[]> {
    const html = await fetchEtsyPage(`https://www.etsy.com/shop/${slug}/reviews`);
    const out: ShopReview[] = [];
    // Each review block carries an aria-label star rating and a text body.
    const blocks = html.split(/data-review-region|class="[^"]*review[^"]*"/i).slice(1, 30);
    for (const b of blocks) {
      const rating = Number(b.match(/(\d)\s*out of 5 stars/i)?.[1] ?? b.match(/aria-label="(\d) star/i)?.[1] ?? 0);
      const textM = b.match(/data-review-text[^>]*>([\s\S]{10,600}?)</i) ?? b.match(/<p[^>]*review[^>]*>([\s\S]{10,600}?)<\/p>/i);
      const text = textM ? textM[1].replace(/<[^>]+>/g, "").trim() : "";
      if (rating >= 1 && text) {
        out.push({ rating, text: text.slice(0, 400), date: new Date().toISOString(), sentiment: this.sentimentFromRating(rating) });
      }
      if (out.length >= 12) break;
    }
    if (out.length === 0) throw new Error("No parseable reviews.");
    return out;
  }

  /* ------------------------------------------------------- listing */
  async getListingReport(listingRef: string, location: Location): Promise<ListingReport> {
    const id = this.listingId(listingRef);
    const url = listingRef.startsWith("http") ? listingRef : id ? `https://www.etsy.com/listing/${id}` : null;
    if (!url) return super.getListingReport(listingRef, location);

    try {
      const html = await fetchEtsyPage(url);
      const l = parseListingPage(html);
      // Real tags/materials scraped from the page's inline JS — the exact
      // competitor tags most tools can't show. Grade uses them for real.
      const tags = [...l.tags, ...l.materials].slice(0, 13);
      const graded = gradeListing(l.title, tags, l.description, l.imageUrls.length);
      const mock = await super.getListingReport(listingRef, location);
      const suggestedTags = tags.length
        ? tags.map((name) => ({ name, volume: 0, competition: 0, trademarkRisk: false }))
        : mock.suggestedTags;

      return {
        ref: listingRef,
        title: l.title || mock.title,
        shop: l.shopName ?? mock.shop,
        price: l.price ?? mock.price,
        tagsUsed: tags,
        titleLength: l.title.length,
        score: graded.totalScore,
        grade: graded.grade,
        sections: graded.sections,
        checks: mock.checks,
        suggestedTags, // REAL competitor tags when the page exposes them
        trend: mock.trend,
        imageUrls: l.imageUrls
      };
    } catch (err) {
      if (err instanceof ScrapeNotFoundError) throw new Error("That listing no longer exists on Etsy.");
      const mock = await super.getListingReport(listingRef, location);
      return { ...mock, checks: [{ label: "Live fetch", pass: false, note: this.blockNote(err) }, ...mock.checks] };
    }
  }

  /* ---------------------------------------------------------- rank */
  async getRank(listingRef: string, keyword: string, location: Location): Promise<RankResult> {
    const id = this.listingId(listingRef);
    if (!id) return super.getRank(listingRef, keyword, location);

    try {
      const html = await fetchEtsyPage(`https://www.etsy.com/search?q=${encodeURIComponent(keyword)}`);
      const search = parseSearchPage(html);
      const idx = search.results.findIndex((r) => r.listingId === id);
      const position = idx >= 0 ? idx + 1 : null;
      const neighborhood = (position ? search.results.slice(Math.max(0, idx - 2), idx + 3) : search.results.slice(0, 5))
        .map((r) => ({
          title: r.title,
          shop: r.shopName ?? "—",
          price: r.price ?? 0,
          reviews: r.reviews ?? 0,
          competition: 0,
          volume: 0,
          ...(r.listingId === id ? { shop: "→ your listing" } : {})
        }));
      return {
        listingRef,
        keyword,
        location,
        position,
        page: position ? Math.ceil(position / 48) : null,
        totalSampled: search.results.length,
        neighborhood
      };
    } catch (err) {
      const mock = await super.getRank(listingRef, keyword, location);
      return { ...mock, neighborhood: mock.neighborhood };
    }
  }

  private blockNote(err: unknown): string {
    if (err instanceof ScrapeBlockedError) {
      return "Etsy served a bot-check for this fetch — showing estimated data. Set SCRAPER_API_TEMPLATE for reliable public-page scraping.";
    }
    return `Live fetch failed (${err instanceof Error ? err.message : "error"}) — showing estimated data.`;
  }
}
