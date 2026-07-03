/**
 * Etsy public-page scraping layer — feeds the ScrapeProvider.
 *
 * Stated plainly, because it matters:
 *  - This reads the same public pages any browser sees. No login walls are
 *    bypassed, no private data touched. It exists so the tools can run on
 *    real data while Etsy API commercial approval is pending, or as a
 *    fallback. Etsy's ToS frowns on automated access — run it politely
 *    (low rate, caching, backoff, ideally through SCRAPER_API_TEMPLATE)
 *    and prefer MARKETPLACE_PROVIDER=etsy once you hold an API key.
 *  - Etsy fronts with DataDome. Direct fetches will sometimes get a bot
 *    check; that's detected and classified as "blocked" — the provider then
 *    falls back per-method instead of inventing numbers.
 *
 * Parsing is layered, most-stable-first:
 *   1. JSON-LD (Etsy embeds schema.org Product / AggregateRating blocks)
 *   2. Targeted regex over well-known markers (sales counts, review counts)
 *   3. OpenGraph metas
 */

export class ScrapeBlockedError extends Error {}
export class ScrapeNotFoundError extends Error {}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/* ---------------------------------------------------- polite fetching */

const rate = Number(process.env.SCRAPE_RATE_LIMIT_RPS ?? 0.5); // 1 req / 2s default
let tokens = 1;
let last = Date.now();

async function politeSlot(): Promise<void> {
  for (;;) {
    const now = Date.now();
    tokens = Math.min(1, tokens + ((now - last) / 1000) * rate);
    last = now;
    if (tokens >= 1) { tokens -= 1; return; }
    await new Promise((r) => setTimeout(r, Math.ceil(((1 - tokens) / rate) * 1000) + Math.random() * 300));
  }
}

const cache = new Map<string, { at: number; html: string }>();
const TTL_MS = Number(process.env.SCRAPE_CACHE_TTL_MIN ?? 60) * 60 * 1000;

export async function fetchEtsyPage(url: string): Promise<string> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.html;

  await politeSlot();
  const template = process.env.SCRAPER_API_TEMPLATE;
  const target = template ? template.replace("{url}", encodeURIComponent(url)) : url;
  const res = await fetch(target, {
    headers: template ? {} : {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(25000)
  });
  if (res.status === 404 || res.status === 410) throw new ScrapeNotFoundError(`Page not found (${res.status}).`);
  if (res.status === 403 || res.status === 429) throw new ScrapeBlockedError(`Etsy anti-bot responded ${res.status}.`);
  if (!res.ok) throw new Error(`Fetch failed (${res.status}).`);
  const html = await res.text();
  if (/datadome|captcha-delivery|geo\.captcha|Please verify you are a human|blocked\?/i.test(html.slice(0, 8000))) {
    throw new ScrapeBlockedError("Etsy served a bot-check page.");
  }
  cache.set(url, { at: Date.now(), html });
  return html;
}

/* ---------------------------------------------------------- primitives */

function jsonLdBlocks(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, ""));
      for (const item of Array.isArray(parsed) ? parsed : [parsed]) out.push(item);
    } catch { /* skip malformed */ }
  }
  return out;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const m = v.replace(/[,\s]/g, "").match(/\d+(\.\d+)?/);
    if (m) return parseFloat(m[0]);
  }
  return null;
}

function meta(html: string, prop: string): string | null {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
  return m ? m[1] : null;
}

/* ------------------------------------------------------- shop parsing */

export interface ScrapedShop {
  name: string;
  tagline: string;
  totalSales: number | null;
  reviews: number | null;
  rating: number | null;
  activeListings: number | null;
  favorites: number | null;
  location: string | null;
  onEtsySince: number | null;
  url: string;
}

export function parseShopPage(html: string, shopName: string): ScrapedShop {
  const ld = jsonLdBlocks(html);
  const org = ld.find((b) => b["@type"] === "LocalBusiness" || b["@type"] === "Organization" || b["@type"] === "Store") as
    { name?: string; description?: string; aggregateRating?: { ratingValue?: unknown; reviewCount?: unknown } } | undefined;

  const salesM =
    html.match(/([\d,.]+)\s*Sales/i) ??
    html.match(/"sold_count"\s*:\s*(\d+)/) ??
    html.match(/([\d,.]+)\s*vânzări/i);
  const reviewsM =
    (org?.aggregateRating?.reviewCount !== undefined ? [String(org.aggregateRating.reviewCount), String(org.aggregateRating.reviewCount)] : null) ??
    html.match(/\(([\d,.]+)\)\s*<\/span>/) ??
    html.match(/"review_count"\s*:\s*(\d+)/);
  const ratingM =
    (org?.aggregateRating?.ratingValue !== undefined ? [String(org.aggregateRating.ratingValue), String(org.aggregateRating.ratingValue)] : null) ??
    html.match(/"rating"\s*:\s*"?([\d.]+)/);
  const listingsM =
    html.match(/([\d,.]+)\s*(?:items?|active listings)/i) ??
    html.match(/"listing_active_count"\s*:\s*(\d+)/);
  const sinceM = html.match(/On Etsy since\s*<[^>]*>?\s*(\d{4})/i) ?? html.match(/opened in (\d{4})/i);
  const locM = html.match(/"shop_location"\s*:\s*"([^"]{2,60})"/) ?? html.match(/<span[^>]*shop-location[^>]*>([^<]{2,60})</i);

  const favM = html.match(/"num_favorers"\s*:\s*(\d+)/);
  return {
    name: org?.name ?? shopName,
    tagline: (org?.description ?? meta(html, "og:description") ?? "").slice(0, 140),
    totalSales: salesM ? num(salesM[1]) : null,
    reviews: reviewsM ? num(reviewsM[1]) : null,
    rating: ratingM ? num(ratingM[1]) : null,
    activeListings: listingsM ? num(listingsM[1]) : null,
    favorites: favM ? num(favM[1]) : null,
    location: locM ? locM[1] : null,
    onEtsySince: sinceM ? num(sinceM[1]) : null,
    url: `https://www.etsy.com/shop/${shopName}`
  };
}

/* ---------------------------------------------------- listing parsing */

export interface ScrapedListing {
  title: string;
  price: number | null;
  originalPrice: number | null;
  discountPercent: number | null;
  currency: string;
  shopName: string | null;
  reviews: number | null;
  rating: number | null;
  favorites: number | null;
  imageUrls: string[];
  description: string;
  tags: string[];
  materials: string[];
  styles: string[];
  processingTime: string | null;
  availability: "in_stock" | "out_of_stock" | "unknown";
}

/** Pull a JSON string array embedded in inline page JS: "tags":[...]. */
function inlineStringArray(html: string, key: string): string[] {
  const m = html.match(new RegExp(`"${key}"\\s*:\\s*\\[(.*?)\\]`, "s"));
  if (!m) return [];
  try {
    const arr = JSON.parse("[" + m[1] + "]");
    return Array.isArray(arr) ? arr.filter((x: unknown): x is string => typeof x === "string").slice(0, 20) : [];
  } catch {
    return [];
  }
}

function inlineNumber(html: string, key: string): number | null {
  const m = html.match(new RegExp(`"${key}"\\s*:\\s*(\\d+)`));
  return m ? Number(m[1]) : null;
}

export function parseListingPage(html: string): ScrapedListing {
  const ld = jsonLdBlocks(html);
  const product = ld.find((b) => b["@type"] === "Product") as {
    name?: string; description?: string; image?: string | string[];
    brand?: { name?: string };
    offers?: { price?: unknown; lowPrice?: unknown; priceCurrency?: string; availability?: string } | { price?: unknown; lowPrice?: unknown; priceCurrency?: string; availability?: string }[];
    aggregateRating?: { ratingValue?: unknown; reviewCount?: unknown };
  } | undefined;

  const offer = Array.isArray(product?.offers) ? product?.offers[0] : product?.offers;
  const availability = offer?.availability ?? "";
  const images = typeof product?.image === "string" ? [product.image] : Array.isArray(product?.image) ? product.image : [];
  const domImages = (html.match(/data-src-zoom-image="([^"]+)"/g) ?? []).map((m) => m.replace(/^data-src-zoom-image="/, "").replace(/"$/, ""));

  const price = num(offer?.price ?? offer?.lowPrice ?? meta(html, "product:price:amount"));

  // Original price / discount (strikethrough in the buy box).
  const strike = html.match(/wt-text-strikethrough[^>]*>[^<]*?([\d.,]+)/i)?.[1]
    ?? html.match(/"original_price"[^}]*?"amount":(\d+)/)?.[1];
  const originalPrice = strike ? num(strike) : null;
  const discountPercent = originalPrice && price && originalPrice > price
    ? Math.round((1 - price / originalPrice) * 100) : null;

  return {
    title: (product?.name ?? meta(html, "og:title") ?? html.match(/<h1[^>]*>([\s\S]{5,300}?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "").slice(0, 250),
    price,
    originalPrice,
    discountPercent,
    currency: offer?.priceCurrency ?? meta(html, "product:price:currency") ?? "USD",
    shopName: product?.brand?.name ?? html.match(/"shop_name"\s*:\s*"([^"]{2,60})"/)?.[1] ?? null,
    reviews: num(product?.aggregateRating?.reviewCount),
    rating: num(product?.aggregateRating?.ratingValue),
    favorites: inlineNumber(html, "num_favorers"),
    imageUrls: [...new Set([...images, ...domImages])].slice(0, 10),
    description: (product?.description ?? meta(html, "og:description") ?? "").slice(0, 4000),
    // Tags/materials/styles come from inline page JS — the fields public
    // pages actually expose, and exactly what a competitor audit wants.
    tags: inlineStringArray(html, "tags"),
    materials: inlineStringArray(html, "materials"),
    styles: inlineStringArray(html, "style"),
    processingTime: html.match(/"processing[_ ]?time"\s*:\s*"([^"]{2,60})"/i)?.[1] ?? null,
    availability: /InStock/i.test(availability) ? "in_stock" : /OutOfStock|SoldOut/i.test(availability) ? "out_of_stock" : "unknown"
  };
}

/* ----------------------------------------------------- search parsing */

export interface ScrapedSearchResult {
  listingId: string;
  title: string;
  shopName: string | null;
  price: number | null;
  currency: string;
  reviews: number | null;
}

export interface ScrapedSearch {
  totalResults: number | null;
  results: ScrapedSearchResult[];
  relatedSearches: string[];
}

export function parseSearchPage(html: string): ScrapedSearch {
  const results: ScrapedSearchResult[] = [];
  const seen = new Set<string>();

  // Etsy embeds a JS payload with listing card data; anchors carry
  // data-listing-id + title attributes as the stable fallback.
  const anchorRe = /<a[^>]+data-listing-id="(\d+)"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null && results.length < 64) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const chunk = html.slice(m.index, m.index + 4000);
    const title = chunk.match(/title="([^"]{8,250})"/)?.[1]
      ?? chunk.match(/<h3[^>]*>([\s\S]{8,250}?)<\/h3>/i)?.[1]?.replace(/<[^>]+>/g, "").trim()
      ?? "";
    const price = num(chunk.match(/class="currency-value"[^>]*>([\d,.]+)</)?.[1] ?? chunk.match(/"price":\s*"?([\d.]+)/)?.[1]);
    const currency = chunk.match(/class="currency-symbol"[^>]*>([^<]{1,4})</)?.[1] === "€" ? "EUR" : "USD";
    const reviews = num(chunk.match(/\(([\d,.]+)\)/)?.[1]);
    const shop = chunk.match(/"shop_name":"([^"]{2,60})"/)?.[1] ?? null;
    if (title) results.push({ listingId: id, title: title.trim(), shopName: shop, price, currency, reviews });
  }

  const total = html.match(/([\d,.]+)\+?\s*(?:results|items)/i);
  const related = (html.match(/related-searches[^"]*"[^>]*>[\s\S]{0,3000}/i)?.[0].match(/>([^<>]{3,40})<\/(?:span|a)>/g) ?? [])
    .map((r) => r.replace(/^>/, "").replace(/<\/(?:span|a)>$/, "").trim())
    .filter((r) => r && !/result|filter|sort/i.test(r))
    .slice(0, 10);

  return {
    totalResults: total ? num(total[1]) : null,
    results,
    relatedSearches: [...new Set(related)]
  };
}
