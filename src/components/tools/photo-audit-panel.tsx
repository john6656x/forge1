"use client";

import { Camera } from "lucide-react";
import { useState } from "react";
import { AiBadge, aiGenerate } from "./ai-shared";
import { LimitModal } from "./limit-modal";
import { Button } from "@/components/ui/button";

interface AuditResult {
  available: boolean;
  message?: string;
  firstImpression?: string;
  scores?: { name: string; score: number; verdict: string }[];
  topFix?: string;
}

/**
 * AI photo audit — Etsy's 2026 ranking runs image recognition on the first
 * photo, and the mobile thumbnail decides the click. Uses whichever listing
 * image the person picks (or any pasted image URL in demo mode).
 */
export function PhotoAuditPanel({ imageUrls }: { imageUrls?: string[] }) {
  const [url, setUrl] = useState(imageUrls?.[0] ?? "");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await aiGenerate<AuditResult>({ task: "photo-audit", imageUrl: url });
    setBusy(false);
    if (res === "limit") return setLimitOpen(true);
    if ("error" in res) return setError(res.error);
    setResult(res.data);
    setAi(res.ai);
  }

  return (
    <section className="card p-5" aria-label="Photo audit">
      <h3 className="flex items-center gap-2 text-sm font-bold text-brand-900 dark:text-white">
        <Camera className="h-4 w-4 text-ember-500" aria-hidden /> AI photo audit
        <span className="rounded-full bg-ember-100 px-2 py-0.5 text-[10px] font-bold uppercase text-ember-700 dark:bg-ember-500/15 dark:text-ember-300">2026 signal</span>
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Etsy's ranking runs image recognition on the first photo, and ~46% of buying happens in the app — the thumbnail decides the click.
      </p>

      {imageUrls && imageUrls.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Listing photos">
          {imageUrls.slice(0, 6).map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={u}
              src={u}
              alt={`Listing photo ${i + 1}`}
              role="option"
              aria-selected={url === u}
              onClick={() => setUrl(u)}
              className={`h-16 w-16 shrink-0 cursor-pointer rounded-lg object-cover ring-2 transition ${url === u ? "ring-ember-500" : "ring-transparent hover:ring-slate-300"}`}
            />
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Image URL (auto-filled on live data — or paste any product photo URL)"
          aria-label="Image URL to audit"
          className="h-10 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white"
        />
        <Button variant="accent" size="sm" onClick={run} disabled={busy || !url.trim()}>
          {busy ? "Looking…" : "Audit photo"}
        </Button>
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

      {result && !result.available && (
        <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{result.message}</p>
      )}

      {result?.available && (
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-2">
            <AiBadge ai={ai} />
            <p className="text-sm font-medium italic text-slate-700 dark:text-slate-200">"{result.firstImpression}"</p>
          </div>
          <div className="space-y-2.5">
            {(result.scores ?? []).map((sc) => (
              <div key={sc.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{sc.name}</span>
                  <span className="font-bold tabular-nums text-slate-500">{sc.score}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-brand-800">
                  <div className={`h-full rounded-full ${sc.score >= 75 ? "bg-green-500" : sc.score >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${sc.score}%` }} />
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sc.verdict}</p>
              </div>
            ))}
          </div>
          {result.topFix && (
            <p className="rounded-xl bg-ember-50 p-3 text-xs font-medium text-ember-800 dark:bg-ember-500/10 dark:text-ember-300">
              <strong>Fix first:</strong> {result.topFix}
            </p>
          )}
        </div>
      )}
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />
    </section>
  );
}
