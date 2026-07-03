"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2, TrendingUp } from "lucide-react";
import { ExportCsvButton } from "@/components/tools/export-csv-button";

interface Snap { position: number | null; takenAt: string }
interface Exp { id: string; label: string; at: string }
interface Tracked { id: string; listingRef: string; keyword: string; location: string; history: Snap[]; experiments?: Exp[] }

/**
 * Hand-rolled sparkline: lower position = better = higher on the chart.
 * Amber verticals mark logged experiments ("changed title here") so the
 * before/after effect of an edit is visible at a glance.
 */
function Sparkline({ history, experiments = [] }: { history: Snap[]; experiments?: Exp[] }) {
  const withPos = history.filter((h) => h.position !== null) as { position: number; takenAt: string }[];
  if (withPos.length < 2) return <span className="text-[11px] text-slate-400">collecting…</span>;
  const w = 96, h = 28, max = Math.max(...withPos.map((p) => p.position), 1);
  const t0 = new Date(withPos[0].takenAt).getTime();
  const t1 = new Date(withPos[withPos.length - 1].takenAt).getTime();
  const span = Math.max(1, t1 - t0);
  const path = withPos
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i / (withPos.length - 1)) * w},${(p.position / max) * (h - 4) + 2}`)
    .join(" ");
  const markers = experiments
    .map((e) => ({ ...e, t: new Date(e.at).getTime() }))
    .filter((e) => e.t >= t0 && e.t <= t1)
    .map((e) => ({ ...e, x: ((e.t - t0) / span) * w }));
  return (
    <svg width={w} height={h} aria-label="Rank history with experiment markers" className="text-ember-500">
      {markers.map((m) => (
        <line key={m.id} x1={m.x} x2={m.x} y1={0} y2={h} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2 2">
          <title>{m.label} — {new Date(m.at).toLocaleDateString()}</title>
        </line>
      ))}
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Delta({ history }: { history: Snap[] }) {
  const pts = history.filter((h) => h.position !== null) as { position: number }[];
  if (pts.length < 2) return null;
  const diff = pts[pts.length - 2].position - pts[pts.length - 1].position; // positive = climbed
  if (diff === 0) return <span className="text-xs font-semibold text-slate-400">→ 0</span>;
  return diff > 0
    ? <span className="text-xs font-bold text-green-600 dark:text-green-400">▲ +{diff}</span>
    : <span className="text-xs font-bold text-red-600 dark:text-red-400">▼ {diff}</span>;
}

export function TrackedKeywords() {
  const [data, setData] = useState<{ tracked: Tracked[]; limit: number } | null>(null);

  async function load() {
    const res = await fetch("/api/tracked");
    if (res.ok) setData(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    await fetch(`/api/tracked?id=${id}`, { method: "DELETE" });
    load();
  }

  if (!data) return null;

  return (
    <section className="card p-5" aria-label="Tracked keywords">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900 dark:text-white">
          <TrendingUp className="h-4 w-4 text-ember-500" aria-hidden /> Tracked keywords
        </h2>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          <ExportCsvButton filename="rankforge-tracked-keywords" rows={[["keyword","location","listing","latest_position","snapshots"],...data.tracked.map((t)=>{const latest=[...t.history].reverse().find((h)=>h.position!==null);return [t.keyword,t.location,t.listingRef,latest?latest.position:"",t.history.length];})]} />
          {data.tracked.length}/{data.limit}
        </span>
      </div>
      {data.tracked.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Run a check in the <Link href="/tools/etsy/rank-check" className="font-semibold text-ember-600 dark:text-ember-400">Rank Checker</Link> and hit "Track this keyword daily" — the cron job snapshots it every day and the movement shows up here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.tracked.map((t) => {
            const latest = [...t.history].reverse().find((h) => h.position !== null);
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 dark:border-brand-800">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">"{t.keyword}" <span className="font-normal text-slate-400">· {t.location}</span></p>
                  <p className="truncate text-xs text-slate-400">{t.listingRef}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Sparkline history={t.history} experiments={t.experiments} />
                  <div className="w-14 text-right">
                    <p className="text-sm font-extrabold tabular-nums text-brand-900 dark:text-white">{latest ? `#${latest.position}` : "—"}</p>
                    <Delta history={t.history} />
                  </div>
                  <button onClick={() => remove(t.id)} aria-label={`Stop tracking ${t.keyword}`} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
