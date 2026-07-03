"use client";

import { Store } from "lucide-react";
import { useState } from "react";
import { SearchBar } from "./search-bar";
import { LimitModal } from "./limit-modal";
import { SourceBadge } from "./source-badge";
import { SaveToProject } from "./save-to-project";
import { ShopReviews } from "./shop-reviews";
import { ExportCsvButton } from "./export-csv-button";
import { MetricPill } from "@/components/ui/metric-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { competitionLevel, volumeLevel } from "@/lib/metrics";
import { Location, ShopReport } from "@/lib/providers/types";

export function ShopAnalyzerClient({ trustFraming = false }: { trustFraming?: boolean }) {
  const [report, setReport] = useState<ShopReport | null>(null);
  const [source, setSource] = useState<"mock" | "etsy" | "scrape">("mock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  async function search(q: string, loc: Location) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?tool=shop&q=${encodeURIComponent(q)}&loc=${loc}`);
      const body = await res.json();
      if (res.status === 429) return setLimitOpen(true);
      if (!res.ok) return setError(body.message ?? "Something went wrong. Try again.");
      setReport(body.data as ShopReport);
      setSource(body.source);
    } catch {
      setError("Network error — check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  const scoreColor = (s: number) => (s >= 70 ? "text-green-600 dark:text-green-400" : s >= 45 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400");

  return (
    <div>
      <SearchBar placeholder="Shop name or URL, e.g. WillowStudio" loading={loading} onSearch={search} />
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && <div className="mt-6 space-y-3" role="status" aria-label="Loading"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>}

      {!loading && !report && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400"><Store className="h-6 w-6" aria-hidden /></span>
          <p className="mt-4 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {trustFraming
              ? "Paste any Etsy shop to get a trust read: track record, review health, and red flags — before you buy or partner."
              : "Paste any Etsy shop (yours or a competitor's) for a full SEO breakdown: score, best listings, and the tags doing the heavy lifting."}
          </p>
        </div>
      )}

      {!loading && report && (
        <div className="mt-6 space-y-4">
          <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-brand-900 dark:text-white">{report.shop.name}</h2>
                  <SourceBadge source={source} />
                </div>
                {report.shop.tagline && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{report.shop.tagline}</p>}
              </div>
              <div className="text-center">
                <p className={`text-4xl font-extrabold tabular-nums ${scoreColor(report.score)}`}>{report.score}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{trustFraming ? "Trust score" : "Shop score"} / 100</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Sales", formatNumber(report.shop.totalSales)],
                ["Active listings", formatNumber(report.shop.activeListings)],
                ["Reviews", formatNumber(report.shop.reviews)],
                ["Rating", `${report.shop.rating.toFixed(2)}★`],
                ["Favorites", formatNumber(report.shop.favorites)],
                ["Shop age", `${report.shop.ageYears} yr`]
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-3 dark:bg-brand-950">
                  <dt className="text-xs font-semibold text-slate-400">{k}</dt>
                  <dd className="mt-0.5 text-sm font-bold tabular-nums text-brand-900 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <h3 className="text-sm font-bold text-green-700 dark:text-green-400">{trustFraming ? "Trust signals" : "What's working"}</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {report.strengths.map((s, i) => <li key={i} className="flex gap-2"><span aria-hidden>✓</span>{s}</li>)}
                {report.strengths.length === 0 && <li className="text-slate-400">Nothing stands out yet.</li>}
              </ul>
            </section>
            <section className="card p-5">
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400">{trustFraming ? "Red flags to weigh" : "Where to improve"}</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {report.issues.map((s, i) => <li key={i} className="flex gap-2"><span aria-hidden>!</span>{s}</li>)}
                {report.issues.length === 0 && <li className="text-slate-400">No red flags found.</li>}
              </ul>
            </section>
          </div>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5">
              <h3 className="text-sm font-bold text-brand-900 dark:text-white">Top listings</h3>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-brand-800">
                    <th className="px-5 py-2 font-semibold">Listing</th>
                    <th className="px-5 py-2 font-semibold">Price</th>
                    <th className="px-5 py-2 font-semibold">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topListings.map((l, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0 dark:border-brand-800/60">
                      <td className="max-w-xs truncate px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{l.title}</td>
                      <td className="px-5 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">${l.price.toFixed(2)}</td>
                      <td className="px-5 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(l.reviews)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-brand-900 dark:text-white">Tags powering this shop</h3>
              <ExportCsvButton filename={`rankforge-shop-tags-${report.shop.name}`} rows={[["tag","volume","competition"],...report.tagCloud.map((t)=>[t.name,t.volume,t.competition])]} />
              <SaveToProject title={`Tags — ${report.shop.name}`} kind="tags" payload={{ tags: report.tagCloud.map((t) => t.name) }} />
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 font-semibold">Tag</th>
                    <th className="py-2 font-semibold">Volume</th>
                    <th className="py-2 font-semibold">Competition</th>
                  </tr>
                </thead>
                <tbody>
                  {report.tagCloud.map((t) => (
                    <tr key={t.name} className="border-t border-slate-50 dark:border-brand-800/60">
                      <td className="py-2 font-medium text-slate-800 dark:text-slate-100">{t.name}</td>
                      <td className="py-2"><MetricPill level={volumeLevel(t.volume)}>{formatNumber(t.volume)}/mo</MetricPill></td>
                      <td className="py-2"><MetricPill level={competitionLevel(t.competition)}>{t.competition}</MetricPill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <ShopReviews report={report} />
        </div>
      )}
    </div>
  );
}
