"use client";

import { Clapperboard } from "lucide-react";
import { FormEvent, useState } from "react";
import { LimitModal } from "./limit-modal";
import { AiBadge, aiGenerate, CopyButton } from "./ai-shared";
import { SaveToProject } from "./save-to-project";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Script {
  hook: string;
  scenes: { seconds: string; shot: string; overlay: string }[];
  caption: string;
  tip: string;
}

export function VideoGeneratorClient() {
  const [product, setProduct] = useState("");
  const [keyword, setKeyword] = useState("");
  const [script, setScript] = useState<Script | null>(null);
  const [ai, setAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!product.trim()) return;
    setLoading(true); setError(null);
    const res = await aiGenerate<Script>({ task: "video-script", product: product.trim(), keyword: keyword.trim() });
    setLoading(false);
    if (res === "limit") return setLimitOpen(true);
    if ("error" in res) return setError(res.error);
    setScript(res.data); setAi(res.ai);
  }

  const fullText = script
    ? `HOOK: ${script.hook}\n\n${script.scenes.map((s) => `${s.seconds}s — ${s.shot} [overlay: ${s.overlay}]`).join("\n")}\n\nCAPTION: ${script.caption}`
    : "";

  return (
    <div>
      <form onSubmit={submit} className="card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]">
        <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Product, e.g. macrame plant hanger" aria-label="Product" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Main keyword (optional)" aria-label="Main keyword" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <Button type="submit" variant="accent" disabled={loading || !product.trim()} className="h-11">{loading ? "Storyboarding…" : "Create script"}</Button>
      </form>
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && <Skeleton className="mt-6 h-80" />}

      {!loading && !script && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400"><Clapperboard className="h-6 w-6" aria-hidden /></span>
          <p className="mt-4 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Listings with video convert measurably better. Get a shot-by-shot 15-second storyboard you can film on a phone — built for Etsy's muted autoplay.
          </p>
        </div>
      )}

      {!loading && script && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <AiBadge ai={ai} />
            <div className="flex gap-2">
              <CopyButton text={fullText} label="Copy script" />
              <SaveToProject title={`Video script — ${product}`} kind="note" payload={{ text: fullText }} />
            </div>
          </div>
          <section className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hook</p>
            <p className="mt-1 text-lg font-bold text-brand-900 dark:text-white">{script.hook}</p>
          </section>
          <section className="card overflow-hidden">
            <h3 className="px-5 pt-5 text-sm font-bold text-brand-900 dark:text-white">Storyboard (15s)</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-brand-800">
                    <th className="px-5 py-2 font-semibold">Time</th>
                    <th className="px-5 py-2 font-semibold">Shot</th>
                    <th className="px-5 py-2 font-semibold">Text overlay</th>
                  </tr>
                </thead>
                <tbody>
                  {script.scenes.map((s, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0 dark:border-brand-800/60">
                      <td className="px-5 py-2.5 font-bold tabular-nums text-ember-600 dark:text-ember-400">{s.seconds}s</td>
                      <td className="px-5 py-2.5 text-slate-700 dark:text-slate-200">{s.shot}</td>
                      <td className="px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{s.overlay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-brand-900 dark:text-white">Caption</h3>
              <CopyButton text={script.caption} />
            </div>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{script.caption}</p>
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">💡 {script.tip}</p>
          </section>
        </div>
      )}
    </div>
  );
}
