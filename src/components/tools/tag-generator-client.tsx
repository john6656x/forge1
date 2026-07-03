"use client";

import { AlertTriangle, ArrowDownUp, Copy, Lightbulb, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { SearchBar } from "./search-bar";
import { ExportCsvButton } from "./export-csv-button";
import { LimitModal } from "./limit-modal";
import { MetricPill } from "@/components/ui/metric-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import { competitionLabel, competitionLevel, volumeLevel } from "@/lib/metrics";
import { Location, TagReport, TagResult } from "@/lib/providers/types";

const TAG_LIMIT = 13;
const TABS = ["Tags", "Materials", "Styles", "Listings"] as const;
type Tab = (typeof TABS)[number];
type SortKey = "name" | "competition" | "volume";

const PRO_TIPS = [
  "Use all 13 tags — empty slots are rankings you gave away.",
  "Multi-word tags match long-tail searches; \"linen tote bag\" beats \"tote\".",
  "Repeat your strongest tag phrase at the start of your title.",
  "Watch the trend chart: list 4–6 weeks before the seasonal peak.",
  "Swap any trademark-flagged tag for a descriptive alternative — deactivations aren't worth it.",
  "Mix head terms (high volume) with niche terms (low competition) across your 13 slots."
];

export function TagGeneratorClient() {
  const [report, setReport] = useState<TagReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("Tags");
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "volume", dir: -1 });
  const [tipIndex, setTipIndex] = useState(0);
  const autoran = useRef(false);

  // Deep link (?q=...) — the Chrome extension and shared URLs land here.
  useEffect(() => {
    if (autoran.current) return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q?.trim()) {
      autoran.current = true;
      search(q.trim(), "Global");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function search(q: string, loc: Location) {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/search?tool=tags&q=${encodeURIComponent(q)}&loc=${loc}`);
      const body = await res.json();
      if (res.status === 429) {
        setLimitOpen(true);
        return;
      }
      if (!res.ok) {
        setError(body.message ?? "Something went wrong. Try again.");
        return;
      }
      setReport(body.data as TagReport);
      setSelected([]);
      setTab("Tags");
      setTipIndex((i) => (i + 1) % PRO_TIPS.length);
    } catch {
      setError("Network error — check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(name: string) {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((t) => t !== name);
      if (prev.length >= TAG_LIMIT) return prev;
      return [...prev, name];
    });
    setCopied(false);
  }

  async function copyTags() {
    if (!selected.length) return;
    await navigator.clipboard.writeText(selected.join(", "));
    setCopied(true);
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" ? 1 : -1 }));
  }

  const rows: TagResult[] = useMemo(() => {
    if (!report || tab === "Listings") return [];
    const src = tab === "Tags" ? report.tags : tab === "Materials" ? report.materials : report.styles;
    return [...src].sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * sort.dir;
      return ((va as number) - (vb as number)) * sort.dir;
    });
  }, [report, tab, sort]);

  return (
    <div>
      <SearchBar placeholder="Enter a seed keyword, e.g. ceramic mug" loading={loading} onSearch={search} />
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && (
        <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && <ResultsSkeleton />}

      {!loading && !report && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400">
            <Lightbulb className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-bold text-brand-900 dark:text-white">Start with one keyword</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Type what a buyer would search for your product. We return scored tags, materials, styles,
            pricing, and the 12-month trend.
          </p>
        </div>
      )}

      {!loading && report && (
        <div className="mt-6 space-y-6">
          {/* Header cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <HeaderCard label="Keyword" value={report.keyword} />
            <HeaderCard label="Location" value={report.location} />
            <HeaderCard
              label="Competition"
              value={
                <MetricPill level={competitionLevel(report.competition)}>
                  {competitionLabel(report.competition)} · {report.competition}/100
                </MetricPill>
              }
            />
            <HeaderCard
              label="Search Volume"
              value={<MetricPill level={volumeLevel(report.volume)}>{formatNumber(report.volume)}/mo</MetricPill>}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Price distribution */}
            <section className="card p-5" aria-labelledby="price-h">
              <h2 id="price-h" className="font-bold text-brand-900 dark:text-white">Price distribution</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Across active listings — price where the buyers are.</p>
              <div className="mt-4 space-y-3">
                {report.priceBands.map((b) => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{b.label}</span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">
                        {formatMoney(b.min)} – {formatMoney(b.max)} · {b.share}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-brand-800">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          b.label === "Bargain" && "bg-emerald-500",
                          b.label === "Midrange" && "bg-brand-500 dark:bg-slate-300",
                          b.label === "Premium" && "bg-ember-500"
                        )}
                        style={{ width: `${b.share}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Monthly trend */}
            <section className="card p-5" aria-labelledby="trend-h">
              <h2 id="trend-h" className="font-bold text-brand-900 dark:text-white">Monthly trend</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">12-month search volume — seasonality at a glance.</p>
              <div className="mt-3 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.trend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-brand-800" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickLine={false} tickFormatter={(v) => formatNumber(v)} />
                    <Tooltip
                      formatter={(v) => [formatNumber(Number(v)) + " searches", "Volume"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="volume" stroke="#e56425" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
            {/* Tabbed results table */}
            <section className="card overflow-hidden" aria-label="Results">
              <div className="flex justify-end px-4 pt-3">
                <ExportCsvButton filename={`rankforge-${tab.toLowerCase()}-${report.keyword}`} rows={[["name","volume","competition","trademark_risk"],...rows.map((t)=>[t.name,t.volume,t.competition,t.trademarkRisk?"yes":"no"])]} />
              </div>
              <div role="tablist" aria-label="Result types" className="flex border-b border-slate-200 dark:border-brand-800">
                {TABS.map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "flex-1 px-3 py-3 text-sm font-semibold transition-colors",
                      tab === t
                        ? "border-b-2 border-ember-500 text-brand-900 dark:text-white"
                        : "text-slate-500 hover:text-brand-800 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {tab !== "Listings" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-brand-800 dark:text-slate-400">
                        <th scope="col" className="w-10 px-4 py-3"><span className="sr-only">Select</span></th>
                        <SortableTh label="Name" active={sort.key === "name"} onClick={() => toggleSort("name")} />
                        <SortableTh label="Competition" active={sort.key === "competition"} onClick={() => toggleSort("competition")} />
                        <SortableTh label="Search Volume" active={sort.key === "volume"} onClick={() => toggleSort("volume")} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-brand-800/60">
                      {rows.map((row) => {
                        const checked = selected.includes(row.name);
                        const full = !checked && selected.length >= TAG_LIMIT;
                        return (
                          <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-brand-800/40">
                            <td className="px-4 py-2.5">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={full}
                                onChange={() => toggle(row.name)}
                                aria-label={`Select tag ${row.name}`}
                                className="h-4 w-4 rounded border-slate-300 text-ember-500 accent-[#e56425] disabled:opacity-40"
                              />
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                              <span className="inline-flex items-center gap-1.5">
                                {row.name}
                                {row.trademarkRisk && (
                                  <span title="Possible trademarked term — using it can get a listing deactivated.">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label="Possible trademark risk" />
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <MetricPill level={competitionLevel(row.competition)}>{competitionLabel(row.competition)}</MetricPill>
                            </td>
                            <td className="px-4 py-2.5">
                              <MetricPill level={volumeLevel(row.volume)}>{formatNumber(row.volume)}/mo</MetricPill>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-brand-800 dark:text-slate-400">
                        <th scope="col" className="px-4 py-3">Listing</th>
                        <th scope="col" className="px-4 py-3">Shop</th>
                        <th scope="col" className="px-4 py-3">Price</th>
                        <th scope="col" className="px-4 py-3">Reviews</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-brand-800/60">
                      {report.listings.map((l, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-brand-800/40">
                          <td className="max-w-[260px] truncate px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{l.title}</td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{l.shop}</td>
                          <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">{formatMoney(l.price)}</td>
                          <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">{l.reviews.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Copy & paste box + pro tip */}
            <div className="space-y-4 lg:sticky lg:top-24">
              <section className="card p-5" aria-labelledby="copy-h">
                <div className="flex items-center justify-between">
                  <h2 id="copy-h" className="font-bold text-brand-900 dark:text-white">Copy &amp; paste</h2>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums",
                      selected.length === TAG_LIMIT
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-brand-800 dark:text-slate-300"
                    )}
                    aria-live="polite"
                  >
                    {selected.length}/{TAG_LIMIT}
                  </span>
                </div>
                <div className="mt-3 min-h-[96px] rounded-xl border border-dashed border-slate-300 p-3 dark:border-brand-700">
                  {selected.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500">Check tags in the table — they collect here.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.map((t) => (
                        <button
                          key={t}
                          onClick={() => toggle(t)}
                          title="Remove tag"
                          className="rounded-full bg-brand-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600 dark:bg-brand-700"
                        >
                          {t} ×
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setSelected([]); setCopied(false); }} disabled={!selected.length} className="flex-1">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Clear
                  </Button>
                  <Button variant="accent" size="sm" onClick={copyTags} disabled={!selected.length} className="flex-1">
                    <Copy className="h-3.5 w-3.5" aria-hidden /> {copied ? "Copied!" : "Copy Tags"}
                  </Button>
                </div>
              </section>

              <section className="rounded-2xl bg-brand-800 p-5 text-white dark:bg-brand-900 dark:ring-1 dark:ring-brand-700" aria-labelledby="tip-h">
                <h2 id="tip-h" className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ember-300">
                  <Lightbulb className="h-4 w-4" aria-hidden /> Pro tip
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-200">{PRO_TIPS[tipIndex]}</p>
                <button
                  onClick={() => setTipIndex((i) => (i + 1) % PRO_TIPS.length)}
                  className="mt-3 text-xs font-bold text-ember-300 hover:text-ember-200"
                >
                  Next tip →
                </button>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-1.5 truncate text-lg font-bold text-brand-900 dark:text-white">{value}</div>
    </div>
  );
}

function SortableTh({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th scope="col" className="px-4 py-3">
      <button onClick={onClick} className={cn("inline-flex items-center gap-1 uppercase", active && "text-brand-800 dark:text-white")}>
        {label} <ArrowDownUp className="h-3 w-3" aria-hidden />
      </button>
    </th>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-6 space-y-6" aria-label="Loading results" role="status">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
