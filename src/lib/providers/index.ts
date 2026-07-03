import { MarketplaceProviderFull } from "./types";
import { MockProvider } from "./mock";
import { EtsyProvider } from "./etsy";
import { ScrapeProvider } from "./scrape";

let cached: MarketplaceProviderFull | null = null;

/**
 * Adapter selection:
 *   MARKETPLACE_PROVIDER=etsy + ETSY_API_KEY set → live Etsy Open API v3.
 *   MARKETPLACE_PROVIDER=scrape                  → live public Etsy pages (no key).
 *   anything else                                → deterministic MockProvider.
 * Every response carries `source` so the UI can badge demo data honestly.
 */
export function getProvider(): MarketplaceProviderFull {
  if (cached) return cached;
  const want = (process.env.MARKETPLACE_PROVIDER ?? "mock").toLowerCase();
  if (want === "etsy") {
    if (process.env.ETSY_API_KEY) {
      cached = new EtsyProvider();
      return cached;
    }
    console.warn("[providers] MARKETPLACE_PROVIDER=etsy but ETSY_API_KEY is missing — falling back to MockProvider.");
  }
  if (want === "scrape") {
    cached = new ScrapeProvider();
    return cached;
  }
  cached = new MockProvider();
  return cached;
}
