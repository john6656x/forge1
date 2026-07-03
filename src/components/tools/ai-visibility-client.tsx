"use client";

import { Bot } from "lucide-react";
import { FormEvent, useState } from "react";
import { LimitModal } from "./limit-modal";
import { AiBadge, aiGenerate } from "./ai-shared";
import { SaveToProject } from "./save-to-project";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AivReport } from "@/lib/ai-visibility";

type Report = AivReport & { agentVerdict?: string };

const matchStyle = {
  strong: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  weak: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
} as const;

export function AiVisibilityClient() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [ai, setAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await aiGenerate<Report>({
      task: "ai-visibility",
      title,
      description,
      tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    });
    setLoading(false);
    if (res === "limit") return setLimitOpen(true);
    if ("error" in res) return setError(res.error);
    setReport(res.data);
    setAi(res.ai);
  }

  const gradeColor = (g: string) =>
    g.startsWith("A") || g === "B" ? "text-green-600 dark:text-green-400" : g === "C" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  return (
    <div>
      <form onSubmit={submit} className="card space-y-3 p-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Listing title" aria-label="Listing title" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Paste the full listing description" aria-label="Listing description" rows={6} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="Tags, comma-separated (optional)" aria-label="Tags" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <Button type="submit" variant="accent" disabled={loading || (!title.trim() && !description.trim())}>
          {loading ? "Asking the agent…" : "Score AI visibility"}
        </Button>
      </form>
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && <div className="mt-6 space-y-3" role="status" aria-label="Loading"><Skeleton className="h-32" /><Skeleton className="h-72" /></div>}

      {!loading && !report && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400"><Bot className="h-6 w-6" aria-hidden /></span>
          <p className="mt-4 max-w-lg text-sm text-slate-500 dark:text-slate-400">
            Over 20% of Etsy's referral traffic now comes from ChatGPT, and listings are surfaced inside ChatGPT, Gemini, and Copilot — where ranking depends on what your listing <em>says</em>, not just its keywords. Paste a listing and see it the way an AI shopping agent does.
          </p>
        </div>
      )}

      {!loading && report && (
        <div className="mt-6 space-y-4">
          <section className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-brand-900 dark:text-white">AI Shopping Visibility</h2>
                  <AiBadge ai={ai} />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">How discoverable this listing is to AI shopping agents (ChatGPT · Gemini · Copilot)</p>
              </div>
              <div className="text-center">
                <p className={`text-5xl font-extrabold ${gradeColor(report.grade)}`}>{report.grade}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{report.score}/100</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {report.dimensions.map((d) => (
                <div key={d.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{d.name}</span>
                    <span className={`font-bold ${gradeColor(d.grade)}`}>{d.grade}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-brand-800">
                    <div className={`h-full rounded-full ${d.score >= 75 ? "bg-green-500" : d.score >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${d.score}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{d.finding}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h3 className="text-sm font-bold text-brand-900 dark:text-white">Would an agent surface it? Three real buyer prompts</h3>
            <ul className="mt-3 space-y-3">
              {report.intents.map((i, idx) => (
                <li key={idx} className="rounded-xl border border-slate-100 p-3 dark:border-brand-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{i.scenario}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${matchStyle[i.match]}`}>{i.match}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{i.why}</p>
                </li>
              ))}
            </ul>
          </section>

          {report.agentVerdict && (
            <section className="card p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-brand-900 dark:text-white"><Bot className="h-4 w-4 text-ember-500" aria-hidden /> The agent's own verdict</h3>
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-brand-950 dark:text-slate-200">{report.agentVerdict}</p>
            </section>
          )}

          {report.recommendations.length > 0 && (
            <section className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-brand-900 dark:text-white">Fix first (highest impact on AI surfaces)</h3>
                <SaveToProject title={`AI visibility fixes — ${title.slice(0, 50)}`} kind="note" payload={{ text: report.recommendations.join("\n") }} />
              </div>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {report.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ol>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
