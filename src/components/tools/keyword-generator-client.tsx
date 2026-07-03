"use client";

import { Lightbulb } from "lucide-react";
import { useState } from "react";
import { SearchBar } from "./search-bar";
import { ExportCsvButton } from "./export-csv-button";
import { LimitModal } from "./limit-modal";
import { MetricPill } from "@/components/ui/metric-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatNumber } from "@/lib/utils";
import { competitionLabel, competitionLevel, volumeLevel } from "@/lib/metrics";
import { KeywordReport, Location } from "@/lib/providers/types";

const INTENTS = ["all", "gift", "occasion", "style", "personalized", "generic"] as const;

export function KeywordGeneratorClient() {
  const [report, setReport] = useState<KeywordReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const [intent, setIntent] = useState<(typeof INTENTS)[number]>("all");

  async function search(q: string, loc: Location) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?tool=keywords&q=${encodeURIComponent(q)}&loc=${loc}`);
      const body = await res.json();
      if (res.status === 429) return setLimitOpen(true);
      if (!res.ok) return setError(body.message ?? "Something went wrong. Try again.");
      setReport(body.data as KeywordReport);
      setIntent("all");
    } catch {
      setError("Network error — check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  const ideas = report?.ideas.filter((i) => intent === "all" || i.intent === intent) ?? [];

  return (
    <div>
      <SearchBar placeholder="Enter a seed keyword, e.g. dog collar" loading={loading} onSearch={search} />
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && (
        <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-6 space-y-3" role="status" aria-label="Loading results">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      )}

      {!loading && !report && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
            <Lightbulb className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-bold text-brand-900 dark:text-white">Find what buyers really type</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            One seed keyword expands into scored, buyer-intent phrases grouped by gift, occasion, style, and more.
          </p>
        </div>
      )}

      {!loading && report && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Intent filter">
            {INTENTS.map((i) => (
              <button
                key={i}
                role="tab"
                aria-selected={intent === i}
                onClick={() => setIntent(i)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-bold capitalize transition-colors",
                  intent === i
                    ? "bg-brand-800 text-white dark:bg-ember-500"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-brand-800 dark:text-slate-300"
                )}
              >
                {i}
              </button>
            ))}
          </div>
          <ExportCsvButton filename="rankforge-keywords" rows={[["phrase","intent","competition","volume"],...ideas.map((i)=>[i.phrase,i.intent,i.competition,i.volume])]} />
          </div>
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-brand-800 dark:text-slate-400">
                  <th scope="col" className="px-4 py-3">Keyword phrase</th>
                  <th scope="col" className="px-4 py-3">Intent</th>
                  <th scope="col" className="px-4 py-3">Competition</th>
                  <th scope="col" className="px-4 py-3">Search Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-brand-800/60">
                {ideas.map((idea) => (
                  <tr key={idea.phrase} className="hover:bg-slate-50 dark:hover:bg-brand-800/40">
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{idea.phrase}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-600 dark:bg-brand-800 dark:text-slate-300">
                        {idea.intent}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <MetricPill level={competitionLevel(idea.competition)}>{competitionLabel(idea.competition)}</MetricPill>
                    </td>
                    <td className="px-4 py-2.5">
                      <MetricPill level={volumeLevel(idea.volume)}>{formatNumber(idea.volume)}/mo</MetricPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
