"use client";

import { Crosshair } from "lucide-react";
import { FormEvent, useState } from "react";
import { LimitModal } from "./limit-modal";
import { ExportCsvButton } from "./export-csv-button";
import { SourceBadge } from "./source-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LOCATIONS, Location, RankResult } from "@/lib/providers/types";
import Link from "next/link";

export function RankCheckClient() {
  const [listing, setListing] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loc, setLoc] = useState<Location>("Global");
  const [result, setResult] = useState<RankResult | null>(null);
  const [source, setSource] = useState<"mock" | "etsy" | "scrape">("mock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const [trackMsg, setTrackMsg] = useState<string | null>(null);
  const [tracked, setTracked] = useState(false);
  const [expLabel, setExpLabel] = useState("");
  const [expLogged, setExpLogged] = useState(false);

  async function logExperiment() {
    if (!result || !expLabel.trim()) return;
    const res = await fetch("/api/experiments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingRef: result.listingRef, label: expLabel.trim() })
    });
    if (res.status === 401) return setTrackMsg("auth");
    if (res.ok) {
      setExpLogged(true);
      setExpLabel("");
    }
  }

  async function track() {
    if (!result) return;
    setTrackMsg(null);
    const res = await fetch("/api/tracked", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingRef: result.listingRef, keyword: result.keyword, location: result.location })
    });
    const body = await res.json();
    if (res.status === 401) return setTrackMsg("auth");
    if (res.status === 402) return setTrackMsg(body.message);
    if (!res.ok) return setTrackMsg(body.message ?? "Could not start tracking.");
    setTracked(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!listing.trim() || !keyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?tool=rank&q=${encodeURIComponent(listing.trim())}&q2=${encodeURIComponent(keyword.trim())}&loc=${loc}`);
      const body = await res.json();
      if (res.status === 429) return setLimitOpen(true);
      if (!res.ok) return setError(body.message ?? "Something went wrong.");
      setResult(body.data as RankResult);
      setSource(body.source);
      setTracked(false);
      setTrackMsg(null);
    } catch {
      setError("Network error — retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input value={listing} onChange={(e) => setListing(e.target.value)} placeholder="Listing URL or ID" aria-label="Listing URL or ID" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder='Keyword, e.g. "linen tote bag"' aria-label="Keyword" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-brand-700 dark:bg-brand-950 dark:text-white" />
        <select value={loc} onChange={(e) => setLoc(e.target.value as Location)} aria-label="Location" className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium dark:border-brand-700 dark:bg-brand-950 dark:text-slate-200">
          {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <Button type="submit" variant="accent" disabled={loading || !listing.trim() || !keyword.trim()} className="h-11">
          {loading ? "Checking…" : "Check rank"}
        </Button>
      </form>
      <LimitModal open={limitOpen} onClose={() => setLimitOpen(false)} />

      {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
      {loading && <div className="mt-6 space-y-3" role="status" aria-label="Loading"><Skeleton className="h-36" /><Skeleton className="h-52" /></div>}

      {!loading && !result && !error && (
        <div className="card mt-6 flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-100 text-ember-600 dark:bg-ember-500/15 dark:text-ember-400"><Crosshair className="h-6 w-6" aria-hidden /></span>
          <p className="mt-4 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Find out exactly where a listing ranks in Etsy search for any keyword. Signed-in checks are snapshotted, so your dashboard shows movement over time.
          </p>
        </div>
      )}

      {!loading && result && (
        <div className="mt-6 space-y-4">
          <section className="card p-6 text-center">
            <SourceBadge source={source} />
            {result.position ? (
              <>
                <p className="mt-3 text-5xl font-extrabold tabular-nums text-brand-900 dark:text-white">#{result.position}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  for <strong className="text-slate-700 dark:text-slate-200">"{result.keyword}"</strong> — page {result.page} of Etsy search ({result.location})
                </p>
                {result.page && result.page > 1 && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Most buyers never leave page 1 — the tag & title tools below the fold are your route there.</p>
                )}
              </>
            ) : (
              <>
                <p className="mt-3 text-3xl font-extrabold text-brand-900 dark:text-white">Not in the top {result.totalSampled}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  for "{result.keyword}". Either the keyword is off-target for this listing, or the listing needs stronger tags/title for it.
                </p>
              </>
            )}
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={track} disabled={tracked}>
                  {tracked ? "Tracking daily ✓" : "Track this keyword daily"}
                </Button>
                <div className="flex items-center gap-1.5">
                  <input
                    value={expLabel}
                    onChange={(e) => { setExpLabel(e.target.value); setExpLogged(false); }}
                    placeholder='Log a change: "New title"'
                    aria-label="Describe the change you made to this listing"
                    className="h-9 w-44 rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-brand-700 dark:bg-brand-950 dark:text-white"
                  />
                  <Button variant="secondary" size="sm" onClick={logExperiment} disabled={!expLabel.trim()}>
                    {expLogged ? "Logged ✓" : "Log"}
                  </Button>
                </div>
              </div>
              {expLogged && <p className="text-xs text-slate-400">Marked on the rank chart — check back in a few days to see if it moved the needle.</p>}
              {trackMsg === "auth" ? (
                <p className="text-xs text-slate-500 dark:text-slate-400"><Link href="/auth/signup" className="font-bold text-ember-600 dark:text-ember-400">Create a free account</Link> to get automatic daily rank snapshots.</p>
              ) : trackMsg ? (
                <p role="status" className="text-xs text-amber-700 dark:text-amber-400">{trackMsg}</p>
              ) : tracked ? (
                <p className="text-xs text-slate-400">A snapshot lands every day — watch the movement on your dashboard.</p>
              ) : null}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5">
              <h3 className="text-sm font-bold text-brand-900 dark:text-white">{result.position ? "The neighborhood around you" : "Who owns the top spots"}</h3>
              <ExportCsvButton filename={`rankforge-rank-${result.keyword}`} rows={[["title","shop","price","reviews"],...result.neighborhood.map((n)=>[n.title,n.shop,n.price,n.reviews])]} />
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-brand-800">
                    <th className="px-5 py-2 font-semibold">Listing</th>
                    <th className="px-5 py-2 font-semibold">Shop</th>
                    <th className="px-5 py-2 font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {result.neighborhood.map((l, i) => {
                    const you = l.shop === "→ your listing";
                    return (
                      <tr key={i} className={you ? "bg-ember-50 dark:bg-ember-500/10" : "border-b border-slate-50 last:border-0 dark:border-brand-800/60"}>
                        <td className="max-w-xs truncate px-5 py-2.5 font-medium text-slate-800 dark:text-slate-100">{l.title}</td>
                        <td className={`px-5 py-2.5 ${you ? "font-bold text-ember-600 dark:text-ember-400" : "text-slate-600 dark:text-slate-300"}`}>{l.shop}</td>
                        <td className="px-5 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">${l.price.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
