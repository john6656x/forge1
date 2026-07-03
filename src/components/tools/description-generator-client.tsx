"use client";

import { AlignLeft } from "lucide-react";
import { FormEvent, useState } from "react";
import { LimitModal } from "./limit-modal";
import { AiBadge, aiGenerate, CopyButton } from "./ai-shared";
import { SaveToProject } from "./save-to-project";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const TONES = ["warm", "playful", "luxury"] as const;

export function DescriptionGeneratorClient() {
  const [product, setProduct] = useState("");
  const [keyword, setKeyword] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]>("warm");
  const [text, setText] = useState<string | null>(null);
  const [ai, setAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!product.trim()) return;
    setLoading(true);
    setError(null);
    const res = await aiGenerate<string>({ task: "description", product: product.trim(), keyword: keyword.trim(), tone });
    setLoading(false);
    if (res === "limit") return setLimitOpen(true);
    if ("error" in res) return setError(res.error);
    setText(res.data);
    setAi(res.ai);
  }

  return (
    <div>
      <form onSubmit={submit} className="card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Product, e.g. linen apron" aria-label="Product" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Main keyword (optional)" aria-label="Main keyword" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <select value={tone} onChange={(e) => setTone(e.target.value as (typeof TONES)[number])} aria-label="Tone" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium capitalize dark:border-brand-700 dark:bg-brand-950 dark:text-slate-200">
          {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button type="submit" variant="accent" disabled={loading || !product.trim()} className="h-11">{loading ? "Writing…" : "Generate"}</Button>
      </form>
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && <Skeleton className="mt-6 h-96" />}

      {!loading && !text && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400"><AlignLeft className="h-6 w-6" aria-hidden /></span>
          <p className="mt-4 max-w-md text-sm text-slate-500 dark:text-slate-400">A complete, structured listing description: hook, benefits, details, gifting angles, and ordering steps — in the tone you pick.</p>
        </div>
      )}

      {!loading && text && (
        <div className="card mt-6 p-5">
          <div className="flex items-center justify-between gap-3">
            <AiBadge ai={ai} />
            <div className="flex gap-2">
              <CopyButton text={text} />
              <SaveToProject title={`Description — ${product}`} kind="note" payload={{ text }} />
            </div>
          </div>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-brand-950 dark:text-slate-200">{text}</pre>
        </div>
      )}
    </div>
  );
}
