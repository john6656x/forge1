"use client";

import { FileSearch } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SearchBar } from "./search-bar";
import { LimitModal } from "./limit-modal";
import { SourceBadge } from "./source-badge";
import { SaveToProject } from "./save-to-project";
import { PhotoAuditPanel } from "./photo-audit-panel";
import { ExportCsvButton } from "./export-csv-button";
import { MetricPill } from "@/components/ui/metric-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { competitionLevel, volumeLevel } from "@/lib/metrics";
import { ListingReport, Location } from "@/lib/providers/types";

export function ListingAnalyzerClient() {
  const [report, setReport] = useState<ListingReport | null>(null);
  const [source, setSource] = useState<"mock" | "etsy" | "scrape">("mock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const autoran = useRef(false);

  // Deep link (?ref=listing-id-or-url) — extension "Full audit" lands here.
  useEffect(() => {
    if (autoran.current) return;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref?.trim()) {
      autoran.current = true;
      search(ref.trim(), "Global");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(q: string, loc: Location) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?tool=listing&q=${encodeURIComponent(q)}&loc=${loc}`);
      const body = await res.json();
      if (res.status === 429) return setLimitOpen(true);
      if (!res.ok) return setError(body.message ?? "Something went wrong. Try again.");
      setReport(body.data as ListingReport);
      setSource(body.source);
    } catch {
      setError("Network error — retry.");
    } finally {
      setLoading(false);
    }
  }

  const scoreColor = (s: number) => (s >= 70 ? "text-green-600 dark:text-green-400" : s >= 45 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400");

  return (
    <div>
      <SearchBar placeholder="Etsy listing URL or numeric ID" loading={loading} onSearch={search} />
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && <div className="mt-6 space-y-3" role="status" aria-label="Loading"><Skeleton className="h-36" /><Skeleton className="h-60" /></div>}

      {!loading && !report && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400"><FileSearch className="h-6 w-6" aria-hidden /></span>
          <p className="mt-4 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Paste any listing — yours or a competitor's — for an SEO audit: title checks, tag usage, trademark risks, and stronger tag suggestions.
          </p>
        </div>
      )}

      {!loading && report && (
        <div className="mt-6 space-y-4">
          <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><SourceBadge source={source} /></div>
                <h2 className="mt-2 truncate text-lg font-extrabold text-brand-900 dark:text-white" title={report.title}>{report.title}</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">by {report.shop} · ${report.price.toFixed(2)} · title {report.titleLength} chars · {report.tagsUsed.length}/13 tags</p>
              </div>
              <div className="text-center">
                <p className={`text-4xl font-extrabold tabular-nums ${scoreColor(report.score)}`}>{report.grade}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{report.score}/100</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(Object.entries(report.sections) as [string, { grade: string; label: string; feedback: string | null }][]).map(([name, sec]) => (
                <div key={name} className="rounded-xl bg-slate-50 p-3 dark:bg-brand-950">
                  <dt className="text-xs font-semibold capitalize text-slate-400">{name}</dt>
                  <dd className="mt-0.5 flex items-baseline gap-2">
                    <span className={`text-xl font-extrabold ${sec.grade.startsWith("A") || sec.grade === "B" ? "text-green-600 dark:text-green-400" : sec.grade === "C" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{sec.grade}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{sec.label}</span>
                  </dd>
                  {sec.feedback && <p className="mt-0.5 text-[11px] text-slate-400">{sec.feedback}</p>}
                </div>
              ))}
            </dl>
          </section>

          <PhotoAuditPanel imageUrls={report.imageUrls} />

          <section className="card p-5">
            <h3 className="text-sm font-bold text-brand-900 dark:text-white">The audit</h3>
            <ul className="mt-3 space-y-2.5">
              {report.checks.map((c) => (
                <li key={c.label} className="flex items-start gap-3 text-sm">
                  <span aria-hidden className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${c.pass ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"}`}>
                    {c.pass ? "✓" : "✗"}
                  </span>
                  <span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{c.label}</span>
                    <span className="block text-slate-500 dark:text-slate-400">{c.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {report.tagsUsed.length > 0 && (
            <section className="card p-5">
              <h3 className="text-sm font-bold text-brand-900 dark:text-white">Tags on the listing</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.tagsUsed.map((t) => (
                  <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-brand-800 dark:text-slate-200">{t}</span>
                ))}
              </div>
            </section>
          )}

          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-brand-900 dark:text-white">Scored tag opportunities</h3>
              <ExportCsvButton filename="rankforge-suggested-tags" rows={[["tag","volume","competition","trademark_risk"],...report.suggestedTags.map((t)=>[t.name,t.volume,t.competition,t.trademarkRisk?"yes":"no"])]} />
              <SaveToProject title={`Tag audit — ${report.title.slice(0, 60)}`} kind="tags" payload={{ tags: report.suggestedTags.map((t) => t.name) }} />
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 font-semibold">Tag</th>
                    <th className="py-2 font-semibold">Volume</th>
                    <th className="py-2 font-semibold">Competition</th>
                    <th className="py-2 font-semibold">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {report.suggestedTags.map((t) => (
                    <tr key={t.name} className="border-t border-slate-50 dark:border-brand-800/60">
                      <td className="py-2 font-medium text-slate-800 dark:text-slate-100">{t.name}</td>
                      <td className="py-2"><MetricPill level={volumeLevel(t.volume)}>{formatNumber(t.volume)}/mo</MetricPill></td>
                      <td className="py-2"><MetricPill level={competitionLevel(t.competition)}>{t.competition}</MetricPill></td>
                      <td className="py-2 text-xs">{t.trademarkRisk ? <span className="font-bold text-red-600 dark:text-red-400">⚠️ trademark</span> : <span className="text-slate-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
