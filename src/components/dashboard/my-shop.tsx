"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Store } from "lucide-react";

interface OwnListing { id: number; title: string; state: string; views: number; favorites: number; tagCount: number; price: number; url: string; grade?: string; score?: number }
interface ShopData {
  connected: boolean;
  shopName?: string;
  error?: string;
  shop?: { listing_active_count: number; transaction_sold_count: number; review_count: number; review_average?: number } | null;
  listings?: OwnListing[];
}

/**
 * "My Shop" — the OAuth-powered card. Shows the seller's own listings
 * (drafts included) with tag-slot warnings and one-click audit links.
 */
export function MyShop() {
  const [data, setData] = useState<ShopData | null>(null);

  useEffect(() => {
    fetch("/api/etsy/my-shop").then(async (r) => setData(await r.json())).catch(() => {});
  }, []);

  if (!data || !data.connected) return null; // settings hosts the connect CTA

  return (
    <section className="card p-5" aria-label="My shop">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900 dark:text-white">
          <Store className="h-4 w-4 text-ember-500" aria-hidden /> My shop{data.shopName ? `: ${data.shopName}` : ""}
        </h2>
        <Link href="/settings" className="text-xs font-semibold text-ember-600 dark:text-ember-400">Manage →</Link>
      </div>

      {data.error ? (
        <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Couldn't reach Etsy right now: {data.error}
        </p>
      ) : (
        <>
          {data.shop && (
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Active listings", data.shop.listing_active_count],
                ["Sales", data.shop.transaction_sold_count],
                ["Reviews", data.shop.review_count],
                ["Rating", data.shop.review_average ? `${data.shop.review_average.toFixed(2)}★` : "—"]
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-xl bg-slate-50 p-3 dark:bg-brand-950">
                  <dt className="text-xs font-semibold text-slate-400">{k}</dt>
                  <dd className="mt-0.5 text-sm font-bold tabular-nums text-brand-900 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {data.listings && data.listings.length >= 3 && (data.listings[0].score ?? 100) < 75 && (
            <p className="mt-3 rounded-xl bg-ember-50 p-3 text-xs font-medium text-ember-800 dark:bg-ember-500/10 dark:text-ember-300">
              Start with your 3 weakest listings — they're sorted to the top. Fixing a D is worth more than polishing an A.
            </p>
          )}
          {data.listings && data.listings.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-1.5 font-semibold">Listing</th>
                    <th className="py-1.5 font-semibold">Grade</th>
                    <th className="py-1.5 font-semibold">Tags</th>
                    <th className="py-1.5 font-semibold">Views</th>
                    <th className="py-1.5 font-semibold">Favs</th>
                    <th className="py-1.5 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.listings.slice(0, 6).map((l) => (
                    <tr key={l.id} className="border-t border-slate-50 dark:border-brand-800/60">
                      <td className="max-w-xs truncate py-2 font-medium text-slate-800 dark:text-slate-100">
                        {l.title} {l.state !== "active" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:bg-brand-800">{l.state}</span>}
                      </td>
                      <td className={`py-2 text-sm font-extrabold ${!l.grade ? "text-slate-300" : l.grade.startsWith("A") || l.grade === "B" ? "text-green-600 dark:text-green-400" : l.grade === "C" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>{l.grade ?? "—"}</td>
                      <td className={`py-2 text-xs font-bold ${l.tagCount === 13 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>{l.tagCount}/13</td>
                      <td className="py-2 tabular-nums text-slate-600 dark:text-slate-300">{l.views}</td>
                      <td className="py-2 tabular-nums text-slate-600 dark:text-slate-300">{l.favorites}</td>
                      <td className="py-2 text-right">
                        <Link href="/tools/etsy/listing-analyzer" className="text-xs font-semibold text-ember-600 dark:text-ember-400" title={`Paste listing ID ${l.id} into the analyzer`}>Audit →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
