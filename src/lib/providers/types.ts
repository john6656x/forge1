export type Location = "Global" | "USA" | "UK" | "AUS" | "CAN" | "EU" | "IND";

export const LOCATIONS: Location[] = ["Global", "USA", "UK", "AUS", "CAN", "EU", "IND"];

export interface TagResult {
  name: string;
  competition: number; // 0–100, lower is better
  volume: number; // monthly searches
  trademarkRisk: boolean;
}

export interface ListingSample {
  title: string;
  shop: string;
  price: number;
  reviews: number;
  competition: number;
  volume: number;
}

export interface PriceBand {
  label: "Bargain" | "Midrange" | "Premium";
  min: number;
  max: number;
  share: number; // % of active listings
}

export interface TrendPoint {
  month: string; // "Jan" … "Dec"
  volume: number;
}

export interface TagReport {
  keyword: string;
  location: Location;
  competition: number;
  volume: number;
  tags: TagResult[];
  materials: TagResult[];
  styles: TagResult[];
  listings: ListingSample[];
  priceBands: PriceBand[];
  trend: TrendPoint[];
}

export interface KeywordIdea {
  phrase: string;
  intent: "gift" | "occasion" | "style" | "personalized" | "generic";
  competition: number;
  volume: number;
}

export interface KeywordReport {
  keyword: string;
  location: Location;
  ideas: KeywordIdea[];
}

/**
 * Adapter boundary. Every tool talks to this interface only.
 * Implementations: MockProvider (offline, deterministic) and EtsyProvider
 * (Etsy Open API v3 — see README for the swap procedure).
 */
export interface MarketplaceProvider {
  getTagReport(keyword: string, location: Location): Promise<TagReport>;
  getKeywordIdeas(keyword: string, location: Location): Promise<KeywordReport>;
}

/* ------------------------------------------------------------------ Analyze */

export interface ShopStats {
  name: string;
  tagline: string;
  activeListings: number;
  totalSales: number;
  reviews: number;
  rating: number; // 0–5
  favorites: number;
  ageYears: number;
  url?: string;
}

export interface CheckItem {
  label: string;
  pass: boolean;
  note: string;
}

export type ReviewSentiment = "positive" | "neutral" | "negative";

export interface ShopReview {
  rating: number; // 1–5
  text: string;
  date: string; // ISO
  sentiment: ReviewSentiment;
}

export interface ShopReport {
  shop: ShopStats;
  score: number; // 0–100
  topListings: ListingSample[];
  tagCloud: TagResult[];
  strengths: string[];
  issues: string[];
  ratingBreakdown: { stars: number; count: number }[]; // 5 → 1
  recentReviews: ShopReview[];
}

export interface SectionGradeView {
  score: number;
  grade: string; // "A+"…"F"
  label: string;
  feedback: string | null;
}

export interface ListingReport {
  ref: string; // URL or listing ID as given
  title: string;
  shop: string;
  price: number;
  tagsUsed: string[];
  titleLength: number;
  score: number; // 0–100 (weighted: title 30 / tags 30 / description 25 / images 15)
  grade: string; // "A+"…"F"
  sections: {
    title: SectionGradeView;
    tags: SectionGradeView;
    description: SectionGradeView;
    images: SectionGradeView;
  };
  checks: CheckItem[];
  suggestedTags: TagResult[];
  trend: TrendPoint[];
  imageUrls?: string[]; // live provider only — feeds the AI photo audit
}

export interface RankResult {
  listingRef: string;
  keyword: string;
  location: Location;
  position: number | null; // null = not in the sampled top results
  page: number | null; // Etsy shows 48/page (desktop default 64? we use 48)
  totalSampled: number;
  neighborhood: ListingSample[]; // listings around the position (or top 5)
}

/* --------------------------------------------------------------- Brainstorm */

export interface TrendItem {
  keyword: string;
  volume: number;
  changePct: number; // vs previous period, +/-
  competition: number;
}

export interface TrendsReport {
  location: Location;
  period: string; // e.g. "last 30 days"
  risers: TrendItem[];
  fallers: TrendItem[];
  seasonalPicks: { month: string; keywords: string[] };
}

export interface BestSellerItem extends ListingSample {
  estMonthlySales: number;
  estMonthlyRevenue: number;
}

export interface BestSellersReport {
  keyword: string;
  location: Location;
  items: BestSellerItem[];
}

export interface NicheIdea {
  name: string;
  demand: number; // proxy volume
  competition: number; // 0–100
  opportunity: number; // 0–100, higher is better
  sampleKeywords: string[];
}

export interface NicheReport {
  seed: string;
  location: Location;
  niches: NicheIdea[];
}

/* --------------------------------------------------------- Full provider API */

export interface MarketplaceProviderFull extends MarketplaceProvider {
  getShopReport(shopName: string, location: Location): Promise<ShopReport>;
  getListingReport(listingRef: string, location: Location): Promise<ListingReport>;
  getRank(listingRef: string, keyword: string, location: Location): Promise<RankResult>;
  getTrends(location: Location, seed?: string): Promise<TrendsReport>;
  getBestSellers(keyword: string, location: Location): Promise<BestSellersReport>;
  getNicheIdeas(seed: string, location: Location): Promise<NicheReport>;
  /** "mock" (demo), "etsy" (official API), or "scrape" (public pages). Badged in the UI. */
  readonly source: "mock" | "etsy" | "scrape";
}
