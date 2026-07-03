"use client";

import { Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { ShopReport, ReviewSentiment } from "@/lib/providers/types";
import { AiBadge, aiGenerate } from "./ai-shared";
import { LimitModal } from "./limit-modal";
import { Button } from "@/components/ui/button";

const FILTERS: ("all" | ReviewSentiment)[] = ["all", "positive", "neutral", "negative"];
const chip = {
  positive: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  neutral: "bg-slate-100 text-slate-700 dark:bg-brand-800 dark:text-slate-300",
  negative: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
} as const;

/** Rating distribution + sentiment-filterable review feed + AI summary. */
export function ShopReviews({ report }: { report: ShopReport }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [summary, setSummary] = useState<{ text: string; ai: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = report.ratingBreakdown.reduce((s, b) => s + b.count, 0);
  const visible = report.recentReviews.filter((r) => filter === "all" || r.sentiment === filter);

  async function summarize() {
    setBusy(true);
    setError(null);
    const res = await aiGenerate<{ summary: string }>({
      task: "review-summary",
      description: report.recentReviews.map((r) => `[${r.rating}★] ${r.text}`).join("\n"),
      product: report.shop.name
    });
    setBusy(false);
    if (res === "limit") return setLimitOpen(true);
    if ("error" in res) return setError(res.error);
    setSummary({ text: res.data.summary, ai: res.ai });
  }

  if (total === 0 && report.recentReviews.length === 0) return null;

  return (
    <section className="card p-5" aria-label="Reviews">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-brand-900 dark:text-white">Reviews & sentiment</h3>
        <Button variant="secondary" size="sm" onClick={summarize} disabled={busy || report.recentReviews.length === 0}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> {busy ? "Reading the reviews…" : "AI summary"}
        </Button>
      </div>

      {/* 5→1 star distribution */}
      {total > 0 && (
        <div className="mt-4 space-y-1.5">
          {report.ratingBreakdown.map((b) => (
            <div key={b.stars} className="flex items-center gap-2 text-xs">
              <span className="flex w-8 items-center gap-0.5 font-semibold text-slate-600 dark:text-slate-300">
                {b.stars}<Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-brand-800">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${total ? (b.count / total) * 100 : 0}%` }} />
              </div>
              <span className="w-14 text-right tabular-nums text-slate-400">{b.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
      {summary && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-brand-950">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">What buyers keep saying</p>
            <AiBadge ai={summary.ai} />
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{summary.text}</p>
        </div>
      )}

      {/* Sentiment filter + feed */}
      {report.recentReviews.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Sentiment filter">
            {FILTERS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition-colors ${filter === f ? "bg-brand-800 text-white dark:bg-ember-500" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-brand-800 dark:text-slate-300"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-2">
            {visible.slice(0, 6).map((r, i) => (
              <li key={i} className="rounded-xl border border-slate-100 p-3 dark:border-brand-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-0.5" aria-label={`${r.rating} stars`}>
                    {Array.from({ length: 5 }, (_, s) => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-brand-700"}`} aria-hidden />
                    ))}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${chip[r.sentiment]}`}>{r.sentiment}</span>
                </div>
                <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">{r.text}</p>
                <p className="mt-1 text-[11px] text-slate-400">{new Date(r.date).toLocaleDateString()}</p>
              </li>
            ))}
            {visible.length === 0 && <li className="py-3 text-center text-xs text-slate-400">No {filter} reviews in the recent feed.</li>}
          </ul>
        </>
      )}
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />
    </section>
  );
}
