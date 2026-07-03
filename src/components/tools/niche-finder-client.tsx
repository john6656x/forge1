"use client";

import { Compass } from "lucide-react";
import { useState } from "react";
import { SearchBar } from "./search-bar";
import { LimitModal } from "./limit-modal";
import { SourceBadge } from "./source-badge";
import { SaveToProject } from "./save-to-project";
import { ExportCsvButton } from "./export-csv-button";
import { MetricPill } from "@/components/ui/metric-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { competitionLevel } from "@/lib/metrics";
import { Location, NicheReport } from "@/lib/providers/types";

export function NicheFinderClient() {
  const [report, setReport] = useState<NicheReport | null>(null);
  const [source, setSource] = useState<"mock" | "etsy" | "scrape">("mock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  async function search(q: string, loc: Location) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?tool=niches&q=${encodeURIComponent(q)}&loc=${loc}`);
      const body = await res.json();
      if (res.status === 429) return setLimitOpen(true);
      if (!res.ok) return setError(body.message ?? "Something went wrong.");
      setReport(body.data as NicheReport);
      setSource(body.source);
    } catch {
      setError("Network error — retry.");
    } finally {
      setLoading(false);
    }
  }

  const oppColor = (o: number) => (o >= 60 ? "text-green-600 dark:text-green-400" : o >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400");

  return (
    <div>
      <SearchBar placeholder="Product base, e.g. candle, tote bag, wall art" loading={loading} onSearch={search} />
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && <div className="mt-6 grid gap-3 sm:grid-cols-2" role="status" aria-label="Loading">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>}

      {!loading && !report && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400"><Compass className="h-6 w-6" aria-hidden /></span>
          <p className="mt-4 max-w-md text-sm text-slate-500 dark:text-slate-400">Enter a product base and get sub-niches ranked by opportunity — the demand-to-competition gaps where new shops still win.</p>
        </div>
      )}

      {!loading && report && (
        <div className="mt-6">
          <div className="flex items-center gap-2"><SourceBadge source={source} /><span className="text-xs text-slate-400">seed: "{report.seed}" · {report.location}</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {report.niches.map((n) => (
              <section key={n.name} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold capitalize text-brand-900 dark:text-white">{n.name}</h3>
                  <div className="text-center">
                    <p className={`text-2xl font-extrabold tabular-nums ${oppColor(n.opportunity)}`}>{n.opportunity}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">opportunity</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600 dark:bg-brand-800 dark:text-slate-300">demand ~{formatNumber(n.demand)}/mo</span>
                  <MetricPill level={competitionLevel(n.competition)}>competition {n.competition}</MetricPill>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {n.sampleKeywords.map((k) => (
                    <span key={k} className="rounded-full bg-ember-50 px-2.5 py-0.5 text-[11px] font-medium text-ember-700 dark:bg-ember-500/10 dark:text-ember-400">{k}</span>
                  ))}
                </div>
                <div className="mt-3">
                  <ExportCsvButton filename={`rankforge-niche-${n.name}`} rows={[["niche","opportunity","competition","demand","sample_keywords"],[n.name,n.opportunity,n.competition,n.demand,n.sampleKeywords.join(" | ")]]} label="CSV" />
                  <SaveToProject title={`Niche — ${n.name}`} kind="keywords" payload={{ tags: [n.name, ...n.sampleKeywords] }} />
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
