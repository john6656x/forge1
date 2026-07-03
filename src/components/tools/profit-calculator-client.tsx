"use client";

import { useMemo, useState } from "react";
import { MetricPill } from "@/components/ui/metric-pill";
import { formatMoney } from "@/lib/utils";

/* Etsy fee model (editable constants, documented in README):
   listing fee $0.20, transaction fee 6.5% of (price + shipping charged),
   payment processing 3% + $0.25, optional Offsite Ads 15%. */
const LISTING_FEE = 0.2;
const TRANSACTION_PCT = 0.065;
const PROCESSING_PCT = 0.03;
const PROCESSING_FLAT = 0.25;
const OFFSITE_ADS_PCT = 0.15;

function Field({ label, value, onChange, prefix = "$" }: { label: string; value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <span className="mt-1.5 flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-brand-500 dark:border-brand-700 dark:bg-brand-950">
        <span className="pl-3 text-sm text-slate-400">{prefix}</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-11 w-full rounded-xl bg-transparent px-2 text-sm text-slate-900 dark:text-white"
        />
      </span>
    </label>
  );
}

export function ProfitCalculatorClient() {
  const [price, setPrice] = useState(28);
  const [cost, setCost] = useState(9.5);
  const [shipCharged, setShipCharged] = useState(4.5);
  const [shipCost, setShipCost] = useState(6);
  const [offsiteAds, setOffsiteAds] = useState(false);

  const r = useMemo(() => {
    const revenue = price + shipCharged;
    const transaction = revenue * TRANSACTION_PCT;
    const processing = revenue * PROCESSING_PCT + PROCESSING_FLAT;
    const ads = offsiteAds ? revenue * OFFSITE_ADS_PCT : 0;
    const fees = LISTING_FEE + transaction + processing + ads;
    const profit = revenue - fees - cost - shipCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const fixedOut = LISTING_FEE + PROCESSING_FLAT + cost + shipCost - shipCharged;
    const pctFees = TRANSACTION_PCT + PROCESSING_PCT + (offsiteAds ? OFFSITE_ADS_PCT : 0);
    const denom = 1 - pctFees;
    const breakEven = denom > 0 ? Math.max(0, fixedOut / denom - shipCharged * pctFees / denom + shipCharged * 0) : 0;
    // simpler exact break-even on item price P: (P + S)*(1-pct) = fixed costs
    const exactBreakEven = denom > 0 ? Math.max(0, (LISTING_FEE + PROCESSING_FLAT + cost + shipCost) / denom - shipCharged) : 0;
    return { revenue, transaction, processing, ads, fees, profit, margin, breakEven: exactBreakEven, _x: breakEven };
  }, [price, cost, shipCharged, shipCost, offsiteAds]);

  const level = r.margin >= 25 ? "good" : r.margin >= 10 ? "medium" : "caution";

  // 2026: Etsy reduces search visibility for US listings charging over $6
  // shipping, and boosts free shipping. Same revenue, folded into the price:
  const shippingPenalty = shipCharged > 6;
  const freeShipPrice = price + shipCharged;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <section className="card space-y-4 p-6" aria-labelledby="inputs-h">
        <h2 id="inputs-h" className="font-bold text-brand-900 dark:text-white">Your numbers</h2>
        <Field label="Item price" value={price} onChange={setPrice} />
        <Field label="Cost to make (materials + labor)" value={cost} onChange={setCost} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Shipping charged" value={shipCharged} onChange={setShipCharged} />
          <Field label="Shipping cost" value={shipCost} onChange={setShipCost} />
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 dark:border-brand-800">
          <input
            type="checkbox"
            checked={offsiteAds}
            onChange={(e) => setOffsiteAds(e.target.checked)}
            className="h-4 w-4 accent-[#e56425]"
          />
          <span className="text-sm">
            <span className="font-semibold text-slate-800 dark:text-slate-100">Offsite Ads sale (15%)</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">Apply if this sale came through Etsy Offsite Ads.</span>
          </span>
        </label>
        {shippingPenalty && (
          <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <strong>Ranking impact (2026):</strong> Etsy reduces search visibility for US listings charging over $6 shipping.
            Same money, algorithm-friendly: price the item at <strong>{formatMoney(freeShipPrice)}</strong> with free shipping —
            the fee math barely changes (Etsy charges 6.5% on price + shipping either way) and you gain the free-shipping ranking boost.
          </div>
        )}
        {!shippingPenalty && shipCharged > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">Shipping ≤ $6 — inside Etsy's 2026 visibility threshold for US listings.</p>
        )}
      </section>

      <div className="space-y-4">
        <section className="card p-6" aria-labelledby="result-h" aria-live="polite">
          <div className="flex items-center justify-between">
            <h2 id="result-h" className="font-bold text-brand-900 dark:text-white">Net profit per sale</h2>
            <MetricPill level={level}>{r.margin.toFixed(1)}% margin</MetricPill>
          </div>
          <p className={`mt-2 text-4xl font-extrabold tabular-nums tracking-tight ${r.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {formatMoney(r.profit)}
          </p>
          <dl className="mt-5 space-y-2 text-sm">
            {[
              ["Revenue (price + shipping)", r.revenue],
              ["Listing fee", -LISTING_FEE],
              ["Transaction fee (6.5%)", -r.transaction],
              ["Payment processing (3% + $0.25)", -r.processing],
              ...(offsiteAds ? [["Offsite Ads (15%)", -r.ads] as [string, number]] : []),
              ["Cost to make", -cost],
              ["Shipping cost", -shipCost]
            ].map(([label, v]) => (
              <div key={label as string} className="flex justify-between">
                <dt className="text-slate-600 dark:text-slate-300">{label}</dt>
                <dd className={`tabular-nums font-medium ${(v as number) < 0 ? "text-slate-800 dark:text-slate-100" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {(v as number) < 0 ? "−" + formatMoney(Math.abs(v as number)) : formatMoney(v as number)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-6" aria-labelledby="bands-h">
          <h2 id="bands-h" className="font-bold text-brand-900 dark:text-white">Suggested price bands</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Break-even item price: <strong className="tabular-nums">{formatMoney(r.breakEven)}</strong>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
            {[
              ["Survive", r.breakEven * 1.15, "caution"],
              ["Healthy", r.breakEven * 1.45, "medium"],
              ["Thriving", r.breakEven * 1.85, "good"]
            ].map(([label, v, lvl]) => (
              <div key={label as string} className="rounded-xl border border-slate-200 p-3 dark:border-brand-800">
                <MetricPill level={lvl as "good" | "medium" | "caution"}>{label as string}</MetricPill>
                <p className="mt-2 text-lg font-extrabold tabular-nums text-brand-900 dark:text-white">{formatMoney(v as number)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
