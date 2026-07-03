import { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { SiteHeader } from "@/components/marketing/header";
import { SiteFooter } from "@/components/marketing/footer";
import { FinalCta, PricingTeaser } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free, Business ($5.99/mo), and Enterprise ($29.99/mo). Start free — no credit card required."
};

const featureMatrix: { feature: string; free: string | boolean; business: string | boolean; enterprise: string | boolean }[] = [
  { feature: "Daily searches", free: "3 / day per tool", business: "300 / day per tool", enterprise: "Unlimited*" },
  { feature: "Tag Generator", free: true, business: true, enterprise: true },
  { feature: "Keyword Generator", free: true, business: true, enterprise: true },
  { feature: "Profit Calculator", free: true, business: true, enterprise: true },
  { feature: "Shop & Listing Analyzer", free: false, business: true, enterprise: true },
  { feature: "Trends & Niche Finder", free: false, business: true, enterprise: true },
  { feature: "Rank tracking + alerts", free: false, business: true, enterprise: true },
  { feature: "Projects & workspaces", free: "1 project", business: "Unlimited", enterprise: "Unlimited" },
  { feature: "AI Listing Optimizer", free: false, business: true, enterprise: true },
  { feature: "Bulk shop audit (CSV export)", free: false, business: false, enterprise: true },
  { feature: "Team seats & roles", free: false, business: false, enterprise: "Up to 10" },
  { feature: "Developer API access", free: false, business: false, enterprise: true },
  { feature: "Support", free: "Community", business: "Priority", enterprise: "Dedicated" }
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto h-4 w-4 text-emerald-500" aria-label="Included" />;
  if (v === false) return <Minus className="mx-auto h-4 w-4 text-slate-300 dark:text-brand-700" aria-label="Not included" />;
  return <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{v}</span>;
}

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="container-page pt-14 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-900 dark:text-white sm:text-5xl">
            Simple pricing, honest limits.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            Every plan includes the shared research workflow. Upgrade when your shop asks for more.
          </p>
        </section>
        <PricingTeaser />
        <section className="container-page pb-20" aria-labelledby="matrix-h">
          <h2 id="matrix-h" className="text-2xl font-extrabold tracking-tight text-brand-900 dark:text-white">
            Full plan comparison
          </h2>
          <div className="card mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-brand-800">
                  <th scope="col" className="px-5 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">Feature</th>
                  <th scope="col" className="px-5 py-4 text-center text-sm font-bold text-brand-900 dark:text-white">Free</th>
                  <th scope="col" className="px-5 py-4 text-center text-sm font-bold text-ember-600 dark:text-ember-400">Business</th>
                  <th scope="col" className="px-5 py-4 text-center text-sm font-bold text-brand-900 dark:text-white">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-brand-800/60">
                {featureMatrix.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row" className="px-5 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">{row.feature}</th>
                    <td className="px-5 py-3 text-center"><Cell v={row.free} /></td>
                    <td className="px-5 py-3 text-center bg-ember-50/50 dark:bg-ember-500/5"><Cell v={row.business} /></td>
                    <td className="px-5 py-3 text-center"><Cell v={row.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            *Fair-use policy applies. All limits are enforced server-side.
          </p>
        </section>
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
