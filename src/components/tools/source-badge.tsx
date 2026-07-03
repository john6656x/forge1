import { Database, FlaskConical } from "lucide-react";

/** Honest data-origin badge shown on every result set. */
export function SourceBadge({ source }: { source: "mock" | "etsy" | "scrape" }) {
  if (source === "etsy") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-300">
        <Database className="h-3 w-3" aria-hidden /> Live Etsy data
      </span>
    );
  }
  if (source === "scrape") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-500/15 dark:text-sky-300"
        title="Parsed live from public Etsy pages (no API key). Fields public pages don't expose are estimated and labeled."
      >
        <Database className="h-3 w-3" aria-hidden /> Public-page data
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
      title="Deterministic sample data. Add ETSY_API_KEY (or MARKETPLACE_PROVIDER=scrape) to switch every tool to live data."
    >
      <FlaskConical className="h-3 w-3" aria-hidden /> Demo data
    </span>
  );
}
