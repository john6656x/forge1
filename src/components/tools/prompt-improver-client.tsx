"use client";

import { Wand2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { LimitModal } from "./limit-modal";
import { AiBadge, aiGenerate, CopyButton } from "./ai-shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PromptImproverClient() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [ai, setAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true); setError(null);
    const res = await aiGenerate<string>({ task: "prompt-improve", prompt: prompt.trim() });
    setLoading(false);
    if (res === "limit") return setLimitOpen(true);
    if ("error" in res) return setError(res.error);
    setResult(res.data); setAi(res.ai);
  }

  return (
    <div>
      <form onSubmit={submit} className="card space-y-3 p-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder={'Your rough prompt, e.g. "write tags for my candle shop"'}
          aria-label="Prompt to improve"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white"
        />
        <Button type="submit" variant="accent" disabled={loading || !prompt.trim()}>{loading ? "Improving…" : "Improve prompt"}</Button>
      </form>
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && <Skeleton className="mt-6 h-72" />}

      {!loading && !result && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400"><Wand2 className="h-6 w-6" aria-hidden /></span>
          <p className="mt-4 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Vague prompts produce generic listings. Paste any prompt you use with AI tools and get it restructured with task, context, format, and quality bar — tuned for Etsy work.
          </p>
        </div>
      )}

      {!loading && result && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="card p-5">
            <h3 className="text-sm font-bold text-slate-400">Before</h3>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-brand-950 dark:text-slate-400">{prompt}</pre>
          </section>
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><h3 className="text-sm font-bold text-brand-900 dark:text-white">After</h3><AiBadge ai={ai} /></div>
              <CopyButton text={result} />
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-brand-950 dark:text-slate-200">{result}</pre>
          </section>
        </div>
      )}
    </div>
  );
}
