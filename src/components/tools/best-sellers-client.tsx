"use client";

import { Trophy } from "lucide-react";
import { useState } from "react";
import { SearchBar } from "./search-bar";
import { LimitModal } from "./limit-modal";
import { SourceBadge } from "./source-badge";
import { SaveToProject } from "./save-to-project";
import { ExportCsvButton } from "./export-csv-button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { BestSellersReport, Location } from "@/lib/providers/types";

export function BestSellersClient() {
  const [report, setReport] = useState<BestSellersReport | null>(null);
  const [source, setSource] = useState<"mock" | "etsy" | "scrape">("mock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  async function search(q: string, loc: Location) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?tool=best-sellers&q=${encodeURIComponent(q)}&loc=${loc}`);
      const body = await res.json();
      if (res.status === 429) return setLimitOpen(true);
      if (!res.ok) return setError(body.message ?? "Something went wrong.");
      setReport(body.data as BestSellersReport);
      setSource(body.source);
    } catch {
      setError("Network error — retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SearchBar placeholder="Category or keyword, e.g. ceramic mug" loading={loading} onSearch={search} />
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && <div className="mt-6 space-y-3" role="status" aria-label="Loading"><Skeleton className="h-80" /></div>}

      {!loading && !report && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400"><Trophy className="h-6 w-6" aria-hidden /></span>
          <p className="mt-4 max-w-md text-sm text-slate-500 dark:text-slate-400">See what's actually selling in any niche, with estimated monthly sales and revenue — so you copy demand, not guesses.</p>
        </div>
      )}

      {!loading && report && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SourceBadge source={source} />
              <span className="text-xs text-slate-400">"{report.keyword}" · {report.location}</span>
            </div>
            <ExportCsvButton filename={`rankforge-best-sellers-${report.keyword}`} rows={[["title","shop","price","reviews","est_monthly_sales","est_monthly_revenue"],...report.items.map((i)=>[i.title,i.shop,i.price,i.reviews,i.estMonthlySales,i.estMonthlyRevenue])]} />
            <SaveToProject title={`Best sellers — ${report.keyword}`} kind="note" payload={{ text: report.items.map((i) => `${i.title} — $${i.price.toFixed(2)}, ~${i.estMonthlySales} sales/mo`).join("\n") }} />
          </div>

          <section className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-brand-800">
                    <th className="px-5 py-3 font-semibold">#</th>
                    <th className="px-5 py-3 font-semibold">Listing</th>
                    <th className="px-5 py-3 font-semibold">Shop</th>
                    <th className="px-5 py-3 font-semibold">Price</th>
                    <th className="px-5 py-3 font-semibold">Est. sales/mo</th>
                    <th className="px-5 py-3 font-semibold">Est. revenue/mo</th>
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((l, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0 dark:border-brand-800/60">
                      <td className="px-5 py-2.5 font-bold text-slate-400">{i + 1}</td>
                      <td className="max-w-xs truncate px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{l.title}</td>
                      <td className="px-5 py-2.5 text-slate-600 dark:text-slate-300">{l.shop}</td>
                      <td className="px-5 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">${l.price.toFixed(2)}</td>
                      <td className="px-5 py-2.5 tabular-nums font-semibold text-slate-800 dark:text-slate-100">~{formatNumber(l.estMonthlySales)}</td>
                      <td className="px-5 py-2.5 tabular-nums font-bold text-green-700 dark:text-green-400">~${formatNumber(l.estMonthlyRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400 dark:border-brand-800">
              Sales & revenue are estimates modeled from public engagement signals — Etsy doesn't publish per-listing sales. Use them to compare listings, not as accounting.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
