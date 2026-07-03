"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { FormEvent, useState } from "react";
import { LimitModal } from "./limit-modal";
import { SourceBadge } from "./source-badge";
import { SaveToProject } from "./save-to-project";
import { ExportCsvButton } from "./export-csv-button";
import { Button } from "@/components/ui/button";
import { MetricPill } from "@/components/ui/metric-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { competitionLevel } from "@/lib/metrics";
import { LOCATIONS, Location, TrendItem, TrendsReport } from "@/lib/providers/types";

function TrendTable({ items, up }: { items: TrendItem[]; up: boolean }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
          <th className="py-2 font-semibold">Keyword</th>
          <th className="py-2 font-semibold">Volume</th>
          <th className="py-2 font-semibold">Change</th>
          <th className="py-2 font-semibold">Comp.</th>
        </tr>
      </thead>
      <tbody>
        {items.map((t) => (
          <tr key={t.keyword} className="border-t border-slate-50 dark:border-brand-800/60">
            <td className="py-2 font-medium text-slate-800 dark:text-slate-100">{t.keyword}</td>
            <td className="py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatNumber(t.volume)}/mo</td>
            <td className={`py-2 font-bold tabular-nums ${up ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {t.changePct > 0 ? "+" : ""}{t.changePct}%
            </td>
            <td className="py-2"><MetricPill level={competitionLevel(t.competition)}>{t.competition}</MetricPill></td>
          </tr>
        ))}
        {items.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-400">Nothing in this bucket right now.</td></tr>}
      </tbody>
    </table>
  );
}

export function TrendsClient() {
  const [seed, setSeed] = useState("");
  const [loc, setLoc] = useState<Location>("Global");
  const [report, setReport] = useState<TrendsReport | null>(null);
  const [source, setSource] = useState<"mock" | "etsy" | "scrape">("mock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?tool=trends&q=${encodeURIComponent(seed.trim())}&loc=${loc}`);
      const body = await res.json();
      if (res.status === 429) return setLimitOpen(true);
      if (!res.ok) return setError(body.message ?? "Something went wrong.");
      setReport(body.data as TrendsReport);
      setSource(body.source);
    } catch {
      setError("Network error — retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="card flex flex-col gap-3 p-4 sm:flex-row">
        <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Optional niche seed, e.g. jewelry (empty = general)" aria-label="Niche seed" className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <select value={loc} onChange={(e) => setLoc(e.target.value as Location)} aria-label="Location" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium dark:border-brand-700 dark:bg-brand-950 dark:text-slate-200">
          {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <Button type="submit" variant="accent" disabled={loading} className="h-11">{loading ? "Scanning…" : "Show trends"}</Button>
      </form>
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && <div className="mt-6 grid gap-4 lg:grid-cols-2" role="status" aria-label="Loading"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>}

      {!loading && !report && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400"><TrendingUp className="h-6 w-6" aria-hidden /></span>
          <p className="mt-4 max-w-md text-sm text-slate-500 dark:text-slate-400">See what's rising and fading on Etsy right now — optionally scoped to your niche. Catch a wave while competition is still thin.</p>
        </div>
      )}

      {!loading && report && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <SourceBadge source={source} />
            <span className="text-xs text-slate-400">{report.period} · {report.location}</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-green-700 dark:text-green-400"><TrendingUp className="h-4 w-4" aria-hidden /> Rising</h3>
              <div className="mt-2"><TrendTable items={report.risers} up /></div>
            </section>
            <section className="card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-400"><TrendingDown className="h-4 w-4" aria-hidden /> Cooling</h3>
              <div className="mt-2"><TrendTable items={report.fallers} up={false} /></div>
            </section>
          </div>
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-brand-900 dark:text-white">Seasonal picks for {report.seasonalPicks.month}</h3>
              <ExportCsvButton filename={`rankforge-trends-${report.location}`} rows={[["direction","keyword","volume","change_pct"],...report.risers.map((r)=>["riser",r.keyword,r.volume,r.changePct]),...report.fallers.map((r)=>["faller",r.keyword,r.volume,r.changePct])]} />
              <SaveToProject title={`Trends — ${report.seasonalPicks.month}`} kind="keywords" payload={{ tags: [...report.risers.map((r) => r.keyword), ...report.seasonalPicks.keywords] }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.seasonalPicks.keywords.map((k) => (
                <span key={k} className="rounded-full bg-ember-100 px-3 py-1 text-xs font-semibold text-ember-700 dark:bg-ember-500/15 dark:text-ember-400">{k}</span>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
