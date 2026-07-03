import { createHmac } from "crypto";
import { readFileSync } from "fs";

/**
 * Supplier product monitoring — the fetch/parse layer.
 *
 * Reality check, stated plainly: AliExpress has no free public product API and
 * runs aggressive anti-bot (captchas, region redirects). A bare server-side
 * fetch works sometimes, not always. So this layer is built professionally,
 * with three strategies in priority order:
 *
 *   1. AliExpress Affiliate API (aliexpress.affiliate.productdetail.get) —
 *      the officially supported path. Set ALIEXPRESS_APP_KEY,
 *      ALIEXPRESS_APP_SECRET (and optional ALIEXPRESS_TRACKING_ID).
 *   2. A scraping proxy — set SCRAPER_API_TEMPLATE to any provider's URL
 *      template with a {url} placeholder, e.g.
 *      "http://api.scraperapi.com?api_key=KEY&url={url}"
 *      This is what commercial monitors actually run on.
 *   3. Direct fetch with browser-like headers + multi-parser (JSON-LD,
 *      OpenGraph, AliExpress runParams). Free, works often, degrades honestly:
 *      a captcha/block page is reported as "unknown", never as a false alarm.
 *
 * Non-AliExpress URLs go through the generic JSON-LD/OG parser, which covers
 * most modern shops (Temu, Banggood, Shopify stores…) that expose structured
 * data. demo:// URLs hit a deterministic mock for testing and demos.
 */

export type StockState = "in_stock" | "out_of_stock" | "removed" | "unknown";

export interface SupplierProduct {
  title: string | null;
  price: number | null;
  currency: string;
  stock: StockState;
  imageUrl: string | null;
  platform: "aliexpress" | "generic" | "demo";
  externalId: string | null;
  strategy: string; // which path produced the data — kept for debugging trust
}

export class SupplierBlockedError extends Error {}
export class SupplierRemovedError extends Error {}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/* ------------------------------------------------------------- helpers */

function num(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const m = v.replace(/[^\d.,]/g, "").replace(",", ".").match(/\d+(\.\d+)?/);
    if (m) return parseFloat(m[0]);
  }
  return null;
}

function mapAvailability(raw: string): StockState {
  const s = raw.toLowerCase();
  if (s.includes("instock") || s.includes("in_stock") || s.includes("limitedavailability")) return "in_stock";
  if (s.includes("outofstock") || s.includes("out_of_stock") || s.includes("soldout") || s.includes("discontinued")) return "out_of_stock";
  return "unknown";
}

/** JSON-LD Product blocks — the most reliable cross-shop signal. */
function parseJsonLd(html: string): Partial<SupplierProduct> | null {
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    try {
      const jsonText = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
      const parsed = JSON.parse(jsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const node = item["@type"] === "Product" ? item : Array.isArray(item["@graph"]) ? item["@graph"].find((g: { "@type"?: string }) => g["@type"] === "Product") : null;
        if (!node) continue;
        const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        return {
          title: typeof node.name === "string" ? node.name.slice(0, 200) : null,
          imageUrl: typeof node.image === "string" ? node.image : Array.isArray(node.image) ? node.image[0] : null,
          price: offer ? num(offer.price ?? offer.lowPrice) : null,
          currency: offer?.priceCurrency ?? "USD",
          stock: offer?.availability ? mapAvailability(String(offer.availability)) : "unknown"
        };
      }
    } catch {
      /* malformed block — try the next one */
    }
  }
  return null;
}

/** OpenGraph / meta fallbacks. */
function parseMeta(html: string): Partial<SupplierProduct> {
  const meta = (prop: string) => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i"))
      ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
    return m ? m[1] : null;
  };
  const title = meta("og:title") ?? (html.match(/<title[^>]*>([^<]{5,200})<\/title>/i)?.[1] ?? null);
  return {
    title: title ? title.trim().slice(0, 200) : null,
    imageUrl: meta("og:image"),
    price: num(meta("product:price:amount") ?? meta("og:price:amount")),
    currency: meta("product:price:currency") ?? meta("og:price:currency") ?? "USD"
  };
}

/** AliExpress runParams — price/stock embedded in the page's bootstrap JSON. */
function parseRunParams(html: string): Partial<SupplierProduct> {
  const out: Partial<SupplierProduct> = {};
  const price =
    html.match(/"minActivityAmount":\{[^}]*"value":([\d.]+)/) ??
    html.match(/"minAmount":\{[^}]*"value":([\d.]+)/) ??
    html.match(/"salePrice":\{[^}]*"minPrice":([\d.]+)/) ??
    html.match(/"formatedActivityPrice":"[^\d]*([\d.,]+)"/);
  if (price) out.price = num(price[1]);
  const currency = html.match(/"currencyCode":"([A-Z]{3})"/);
  if (currency) out.currency = currency[1];
  const stockMatch = html.match(/"totalAvailQuantity":(\d+)/) ?? html.match(/"availQuantity":(\d+)/);
  if (stockMatch) out.stock = Number(stockMatch[1]) > 0 ? "in_stock" : "out_of_stock";
  if (/itemStatus":\s*"?(3|offline|not_found)/i.test(html) || /this item is no longer available/i.test(html)) {
    out.stock = "removed";
  }
  const title = html.match(/"subject":"((?:[^"\\]|\\.){5,200})"/);
  if (title) out.title = title[1].replace(/\\"/g, '"').slice(0, 200);
  return out;
}

function looksBlocked(html: string): boolean {
  return /captcha|punish|x5secdata|slide to verify|unusual traffic|access denied/i.test(html.slice(0, 6000)) ||
    (html.length < 2500 && !/product|item/i.test(html));
}

/* ------------------------------------------------------ URL dispatch */

export function classifyUrl(raw: string): { platform: SupplierProduct["platform"]; externalId: string | null } {
  if (raw.startsWith("demo://")) return { platform: "demo", externalId: raw.slice(7) };
  try {
    const u = new URL(raw);
    if (/(^|\.)aliexpress\.(com|us|ru)$/i.test(u.hostname)) {
      const id = u.pathname.match(/item\/(?:[^/]*\/)?(\d{6,})/)?.[1] ?? u.pathname.match(/(\d{8,})\.html/)?.[1] ?? null;
      return { platform: "aliexpress", externalId: id };
    }
    return { platform: "generic", externalId: null };
  } catch {
    return { platform: "generic", externalId: null };
  }
}

/* --------------------------------------------------------- strategies */

async function fetchHtml(url: string): Promise<string> {
  const template = process.env.SCRAPER_API_TEMPLATE;
  const target = template ? template.replace("{url}", encodeURIComponent(url)) : url;
  const res = await fetch(target, {
    headers: template ? {} : {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9"
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000)
  });
  if (res.status === 404 || res.status === 410) throw new SupplierRemovedError("Product page returns " + res.status);
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  return await res.text();
}

/** Official AliExpress Affiliate API (TOP protocol, sha256 signature). */
async function fetchViaAffiliateApi(externalId: string): Promise<SupplierProduct | null> {
  const appKey = process.env.ALIEXPRESS_APP_KEY;
  const appSecret = process.env.ALIEXPRESS_APP_SECRET;
  if (!appKey || !appSecret || !externalId) return null;

  const params: Record<string, string> = {
    app_key: appKey,
    method: "aliexpress.affiliate.productdetail.get",
    sign_method: "sha256",
    timestamp: String(Date.now()),
    product_ids: externalId,
    target_currency: "USD",
    target_language: "EN",
    ...(process.env.ALIEXPRESS_TRACKING_ID ? { tracking_id: process.env.ALIEXPRESS_TRACKING_ID } : {})
  };
  const base = Object.keys(params).sort().map((k) => k + params[k]).join("");
  params.sign = createHmac("sha256", appSecret).update(base).digest("hex").toUpperCase();

  const res = await fetch("https://api-sg.aliexpress.com/sync?" + new URLSearchParams(params));
  if (!res.ok) throw new Error(`Affiliate API ${res.status}`);
  const data = await res.json() as Record<string, unknown>;
  const resp = (data as { aliexpress_affiliate_productdetail_get_response?: { resp_result?: { result?: { products?: { product?: unknown[] } } } } })
    .aliexpress_affiliate_productdetail_get_response?.resp_result?.result?.products?.product?.[0] as
    { product_title?: string; target_sale_price?: string; target_sale_price_currency?: string; product_main_image_url?: string } | undefined;
  if (!resp) throw new SupplierRemovedError("Product not returned by the affiliate API.");
  return {
    title: resp.product_title ?? null,
    price: num(resp.target_sale_price),
    currency: resp.target_sale_price_currency ?? "USD",
    stock: "in_stock", // the affiliate API only returns live products
    imageUrl: resp.product_main_image_url ?? null,
    platform: "aliexpress",
    externalId,
    strategy: "affiliate-api"
  };
}

/** demo:// — deterministic mock; /tmp/rf-demo-supplier.json overrides it. */
function fetchDemo(externalId: string | null): SupplierProduct {
  let override: { price?: number | null; stock?: StockState; title?: string } = {};
  try {
    override = JSON.parse(readFileSync("/tmp/rf-demo-supplier.json", "utf8"));
  } catch { /* no override file — use defaults */ }
  let h = 0;
  for (const c of externalId ?? "demo") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const stock = override.stock ?? "in_stock";
  // The demo path must behave exactly like the real one: a removed product
  // is an exception, not a normal state — otherwise the alert never fires.
  if (stock === "removed") throw new SupplierRemovedError("Demo product marked as removed.");
  return {
    title: override.title ?? `Demo product ${externalId ?? ""}`.trim(),
    price: "price" in override ? (override.price ?? null) : Math.round((5 + (h % 4000) / 100) * 100) / 100,
    currency: "USD",
    stock,
    imageUrl: null,
    platform: "demo",
    externalId,
    strategy: "demo"
  };
}

/* ------------------------------------------------------------ main API */

export async function fetchSupplierProduct(url: string): Promise<SupplierProduct> {
  const { platform, externalId } = classifyUrl(url);

  if (platform === "demo") return fetchDemo(externalId);

  if (platform === "aliexpress") {
    // Strategy 1: official API when keys exist.
    const viaApi = await fetchViaAffiliateApi(externalId ?? "").catch((err) => {
      if (err instanceof SupplierRemovedError) throw err;
      return null; // API hiccup — fall through to scraping
    });
    if (viaApi) return viaApi;
  }

  // Strategies 2+3: (proxied) HTML fetch + layered parsing.
  const html = await fetchHtml(url);
  if (looksBlocked(html)) {
    throw new SupplierBlockedError("The supplier served a bot-check page — status unknown, not alarming.");
  }

  const ld = parseJsonLd(html);
  const meta = parseMeta(html);
  const run = platform === "aliexpress" ? parseRunParams(html) : {};

  const merged: SupplierProduct = {
    title: run.title ?? ld?.title ?? meta.title ?? null,
    price: run.price ?? ld?.price ?? meta.price ?? null,
    currency: run.currency ?? ld?.currency ?? meta.currency ?? "USD",
    stock: run.stock ?? ld?.stock ?? "unknown",
    imageUrl: ld?.imageUrl ?? meta.imageUrl ?? null,
    platform,
    externalId,
    strategy: process.env.SCRAPER_API_TEMPLATE ? "proxy-scrape" : "direct-scrape"
  };
  if (merged.stock === "removed") throw new SupplierRemovedError("The listing reports itself as no longer available.");
  if (merged.price === null && merged.title === null) {
    throw new Error("Could not parse product data from the page (structure changed or content is client-rendered).");
  }
  return merged;
}
