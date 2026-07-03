"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { PackageSearch, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportCsvButton } from "./export-csv-button";

interface Snap { price: number | null; stock: string; takenAt: string }
interface Watch {
  id: string; url: string; platform: string; title: string | null; imageUrl: string | null;
  currency: string; lastPrice: number | null; lastStock: string; alertPct: number;
  status: string; lastError: string | null; checkedAt: string | null; snapshots: Snap[];
}

const stockChip: Record<string, { label: string; cls: string }> = {
  in_stock: { label: "In stock", cls: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300" },
  out_of_stock: { label: "SOLD OUT", cls: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300" },
  removed: { label: "REMOVED", cls: "bg-red-600 text-white dark:bg-red-500" },
  unknown: { label: "Unknown", cls: "bg-slate-100 text-slate-600 dark:bg-brand-800 dark:text-slate-300" }
};

function PriceSpark({ snaps }: { snaps: Snap[] }) {
  const pts = snaps.filter((s) => s.price !== null) as { price: number }[];
  if (pts.length < 2) return <span className="text-[11px] text-slate-400">collecting…</span>;
  const w = 110, h = 30;
  const min = Math.min(...pts.map((p) => p.price));
  const max = Math.max(...pts.map((p) => p.price));
  const span = Math.max(0.01, max - min);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * w},${h - 3 - ((p.price - min) / span) * (h - 6)}`).join(" ");
  return (
    <svg width={w} height={h} aria-label="Price history" className="text-ember-500">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SupplierWatchClient() {
  const [data, setData] = useState<{ watches: Watch[]; limit: number } | null>(null);
  const [url, setUrl] = useState("");
  const [alertPct, setAlertPct] = useState("1");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  async function load() {
    const res = await fetch("/api/supplier-watch");
    if (res.status === 401) return setNeedsAuth(true);
    if (res.ok) setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/supplier-watch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: url.trim(), alertPct: Number(alertPct) || 1 })
    });
    const body = await res.json();
    setBusy(false);
    if (res.status === 401) return setNeedsAuth(true);
    if (!res.ok) return setError(body.message ?? "Could not add the product.");
    setUrl("");
    load();
  }

  async function checkNow(id: string) {
    setChecking(id);
    const res = await fetch(`/api/supplier-watch/check?id=${id}`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setChecking(null);
    if (!res.ok) return setError(body.message ?? "Check failed.");
    load();
  }

  async function toggle(w: Watch) {
    await fetch("/api/supplier-watch", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: w.id, status: w.status === "paused" ? "active" : "paused" })
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/supplier-watch?id=${id}`, { method: "DELETE" });
    load();
  }

  if (needsAuth) {
    return (
      <div className="card flex flex-col items-center px-6 py-14 text-center">
        <PackageSearch className="h-8 w-8 text-ember-500" aria-hidden />
        <p className="mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Supplier Watch monitors your source products around the clock and pings you the moment a price moves, stock runs out, or a listing disappears. <Link href="/auth/signup" className="font-bold text-ember-600 dark:text-ember-400">Create a free account</Link> to start monitoring.
        </p>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={add} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="sw-url" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Supplier product URL (AliExpress or any shop with product data)</label>
          <input id="sw-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.aliexpress.com/item/1005001234567890.html" className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        </div>
        <div className="w-full sm:w-36">
          <label htmlFor="sw-pct" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Alert at ±%</label>
          <input id="sw-pct" value={alertPct} onChange={(e) => setAlertPct(e.target.value)} inputMode="decimal" className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        </div>
        <Button type="submit" variant="accent" disabled={busy || !url.trim()}>
          {busy ? "Reading product…" : "Monitor it"}
        </Button>
      </form>
      {data && <p className="mt-2 text-xs text-slate-400">{data.watches.length}/{data.limit} monitored · checked hourly · alerts in-app + email</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

      {data && data.watches.length > 0 && (
        <div className="mt-4 flex justify-end">
          <ExportCsvButton filename="rankforge-supplier-watch" rows={[["title", "url", "platform", "price", "currency", "stock", "status", "last_checked"], ...data.watches.map((w) => [w.title ?? "", w.url, w.platform, w.lastPrice ?? "", w.currency, w.lastStock, w.status, w.checkedAt ?? ""])]} />
        </div>
      )}

      <ul className="mt-3 space-y-3">
        {data?.watches.map((w) => {
          const chip = stockChip[w.lastStock] ?? stockChip.unknown;
          const firstPrice = w.snapshots.find((s) => s.price !== null)?.price ?? null;
          const delta = firstPrice !== null && w.lastPrice !== null && firstPrice > 0
            ? ((w.lastPrice - firstPrice) / firstPrice) * 100 : null;
          return (
            <li key={w.id} className={`card p-4 ${w.status === "paused" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-4">
                {w.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-brand-800"><PackageSearch className="h-6 w-6 text-slate-400" aria-hidden /></span>
                )}
                <div className="min-w-0 flex-1">
                  <a href={w.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-slate-800 hover:text-ember-600 dark:text-slate-100">
                    {w.title ?? w.url}
                  </a>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="uppercase">{w.platform}</span>
                    <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${chip.cls}`}>{chip.label}</span>
                    {w.status === "error" && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold uppercase text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" title={w.lastError ?? ""}>monitoring degraded</span>}
                    {w.checkedAt && <span>checked {new Date(w.checkedAt).toLocaleString()}</span>}
                  </p>
                </div>
                <PriceSpark snaps={w.snapshots} />
                <div className="w-24 text-right">
                  <p className="text-lg font-extrabold tabular-nums text-brand-900 dark:text-white">
                    {w.lastPrice !== null ? `${w.currency === "USD" ? "$" : w.currency + " "}${w.lastPrice.toFixed(2)}` : "—"}
                  </p>
                  {delta !== null && Math.abs(delta) >= 0.05 && (
                    <p className={`text-xs font-bold ${delta < 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {delta > 0 ? "▲ +" : "▼ "}{delta.toFixed(1)}% since added
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => checkNow(w.id)} disabled={checking === w.id} aria-label="Check now" title="Check now" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-ember-600 dark:hover:bg-brand-800">
                    <RefreshCw className={`h-4 w-4 ${checking === w.id ? "animate-spin" : ""}`} aria-hidden />
                  </button>
                  <button onClick={() => toggle(w)} aria-label={w.status === "paused" ? "Resume" : "Pause"} title={w.status === "paused" ? "Resume" : "Pause"} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-ember-600 dark:hover:bg-brand-800">
                    {w.status === "paused" ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
                  </button>
                  <button onClick={() => remove(w.id)} aria-label="Stop monitoring" title="Stop monitoring" className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {data && data.watches.length === 0 && (
        <div className="card mt-4 flex flex-col items-center px-6 py-14 text-center">
          <PackageSearch className="h-8 w-8 text-ember-500" aria-hidden />
          <p className="mt-3 max-w-lg text-sm text-slate-500 dark:text-slate-400">
            Paste a supplier product URL above. From that moment it's checked every hour: price moves beyond your threshold, sold-outs, and removed listings all land as in-app notifications and one combined email — before your customers find out for you.
          </p>
        </div>
      )}
    </div>
  );
}
