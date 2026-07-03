"use client";

import { Layers, Stethoscope } from "lucide-react";
import { FormEvent, useState } from "react";
import { LimitModal } from "./limit-modal";
import { AiBadge, aiGenerate, CopyButton } from "./ai-shared";
import { SaveToProject } from "./save-to-project";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Draft { titles: string[]; tags: string[]; description: string; materials: string[] }
interface Optimize {
  score: number;
  checks: { label: string; pass: boolean; advice: string }[];
  rewrite?: { title: string; tags: string[]; notes: string[] };
}

export function ListingStudioClient() {
  const [mode, setMode] = useState<"create" | "optimize">("create");

  // create
  const [product, setProduct] = useState("");
  const [keyword, setKeyword] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  // optimize
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [audit, setAudit] = useState<Optimize | null>(null);

  const [ai, setAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!product.trim()) return;
    setLoading(true); setError(null);
    const res = await aiGenerate<Draft>({ task: "listing", product: product.trim(), keyword: keyword.trim() });
    setLoading(false);
    if (res === "limit") return setLimitOpen(true);
    if ("error" in res) return setError(res.error);
    setDraft(res.data); setAi(res.ai);
  }

  async function optimize(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await aiGenerate<Optimize>({
      task: "optimize",
      title, description,
      tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    });
    setLoading(false);
    if (res === "limit") return setLimitOpen(true);
    if ("error" in res) return setError(res.error);
    setAudit(res.data); setAi(res.ai);
  }

  const tabBtn = (active: boolean) =>
    cn("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
      active ? "bg-brand-800 text-white dark:bg-ember-500" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-brand-800");

  return (
    <div>
      <div className="flex gap-2" role="tablist" aria-label="Studio mode">
        <button role="tab" aria-selected={mode === "create"} className={tabBtn(mode === "create")} onClick={() => setMode("create")}><Layers className="h-4 w-4" aria-hidden /> Create new listing</button>
        <button role="tab" aria-selected={mode === "optimize"} className={tabBtn(mode === "optimize")} onClick={() => setMode("optimize")}><Stethoscope className="h-4 w-4" aria-hidden /> Optimize existing</button>
      </div>
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {mode === "create" ? (
        <form onSubmit={create} className="card mt-4 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]">
          <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Describe the product, e.g. hand-poured soy candle in amber jar" aria-label="Product" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Main keyword (optional)" aria-label="Main keyword" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
          <Button type="submit" variant="accent" disabled={loading || !product.trim()} className="h-11">{loading ? "Building…" : "Build listing"}</Button>
        </form>
      ) : (
        <form onSubmit={optimize} className="card mt-4 space-y-3 p-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Paste your current title" aria-label="Current title" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Paste your current description" aria-label="Current description" rows={5} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
          <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="Current tags, comma-separated" aria-label="Current tags" className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
          <Button type="submit" variant="accent" disabled={loading || (!title && !description && !tagsRaw)} className="h-11">{loading ? "Auditing…" : "Audit & improve"}</Button>
        </form>
      )}

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && <Skeleton className="mt-6 h-96" />}

      {!loading && mode === "create" && draft && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <AiBadge ai={ai} />
            <SaveToProject title={`Listing draft — ${product}`} kind="listing-draft" payload={draft} />
          </div>
          <section className="card p-5">
            <h3 className="text-sm font-bold text-brand-900 dark:text-white">Title options</h3>
            <div className="mt-3 space-y-2">
              {draft.titles.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-brand-800">
                  <p className="min-w-0 text-sm font-medium text-slate-800 dark:text-slate-100">{t}</p>
                  <CopyButton text={t} />
                </div>
              ))}
            </div>
          </section>
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-brand-900 dark:text-white">13 tags, ready to paste</h3>
              <CopyButton text={draft.tags.join(", ")} label="Copy all" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-brand-800 dark:text-slate-200">{t}</span>)}
            </div>
          </section>
          <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-brand-900 dark:text-white">Description</h3>
              <CopyButton text={draft.description} />
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-brand-950 dark:text-slate-200">{draft.description}</pre>
          </section>
          {draft.materials?.length > 0 && (
            <section className="card p-5">
              <h3 className="text-sm font-bold text-brand-900 dark:text-white">Materials field</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.materials.map((m) => <span key={m} className="rounded-full bg-ember-50 px-3 py-1 text-xs font-semibold text-ember-700 dark:bg-ember-500/10 dark:text-ember-400">{m}</span>)}
              </div>
            </section>
          )}
        </div>
      )}

      {!loading && mode === "optimize" && audit && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <AiBadge ai={ai} />
            <p className="text-sm text-slate-500 dark:text-slate-400">Listing score: <strong className={audit.score >= 70 ? "text-green-600 dark:text-green-400" : audit.score >= 45 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}>{audit.score}/100</strong></p>
          </div>
          <section className="card p-5">
            <h3 className="text-sm font-bold text-brand-900 dark:text-white">Audit</h3>
            <ul className="mt-3 space-y-2.5">
              {audit.checks.map((c) => (
                <li key={c.label} className="flex items-start gap-3 text-sm">
                  <span aria-hidden className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${c.pass ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"}`}>{c.pass ? "✓" : "✗"}</span>
                  <span><span className="font-semibold text-slate-800 dark:text-slate-100">{c.label}</span><span className="block text-slate-500 dark:text-slate-400">{c.advice}</span></span>
                </li>
              ))}
            </ul>
          </section>
          {audit.rewrite && (
            <section className="card p-5">
              <h3 className="text-sm font-bold text-brand-900 dark:text-white">AI rewrite</h3>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 dark:border-brand-800">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{audit.rewrite.title}</p>
                <CopyButton text={audit.rewrite.title} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {audit.rewrite.tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-brand-800 dark:text-slate-200">{t}</span>)}
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                {audit.rewrite.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
