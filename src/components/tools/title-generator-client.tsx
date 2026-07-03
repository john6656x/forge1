"use client";

import { Type } from "lucide-react";
import { FormEvent, useState } from "react";
import { LimitModal } from "./limit-modal";
import { AiBadge, aiGenerate, CopyButton } from "./ai-shared";
import { SaveToProject } from "./save-to-project";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function TitleGeneratorClient() {
  const [product, setProduct] = useState("");
  const [keyword, setKeyword] = useState("");
  const [titles, setTitles] = useState<string[] | null>(null);
  const [ai, setAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!product.trim()) return;
    setLoading(true);
    setError(null);
    const res = await aiGenerate<string[]>({ task: "titles", product: product.trim(), keyword: keyword.trim() });
    setLoading(false);
    if (res === "limit") return setLimitOpen(true);
    if ("error" in res) return setError(res.error);
    setTitles(res.data);
    setAi(res.ai);
  }

  return (
    <div>
      <form onSubmit={submit} className="card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]">
        <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Product, e.g. ceramic espresso mug" aria-label="Product" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Main keyword (optional)" aria-label="Main keyword" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <Button type="submit" variant="accent" disabled={loading || !product.trim()} className="h-11">{loading ? "Writing…" : "Generate titles"}</Button>
      </form>
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && <div className="mt-6 space-y-3" role="status" aria-label="Loading">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}

      {!loading && !titles && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400"><Type className="h-6 w-6" aria-hidden /></span>
          <p className="mt-4 max-w-md text-sm text-slate-500 dark:text-slate-400">Five ready-to-paste titles per run — keyword front-loaded, under 140 characters, written for gift-searching buyers.</p>
        </div>
      )}

      {!loading && titles && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <AiBadge ai={ai} />
            <SaveToProject title={`Titles — ${product}`} kind="note" payload={{ text: titles.join("\n") }} />
          </div>
          {titles.map((t, i) => (
            <div key={i} className="card flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-100">{t}</p>
                <p className={`mt-0.5 text-xs tabular-nums ${t.trim().split(/\s+/).length > 15 || t.length > 95 ? "text-red-500" : "text-slate-400"}`}>
                  {t.trim().split(/\s+/).length} words · {t.length} chars <span className="text-slate-300 dark:text-slate-500">(2026: ≤15 words, ~50–90 chars)</span>
                </p>
              </div>
              <CopyButton text={t} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
