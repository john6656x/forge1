import { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Press",
  description: "RankForge press kit and media resources."
};

const facts = [
  ["Founded", "2025"],
  ["Sellers served", "500,000+"],
  ["Keywords analyzed", "10M+"],
  ["Countries", "127"]
];

export default function PressPage() {
  return (
    <MarketingPage title="Press kit" lede="Quick facts, boilerplate, and brand assets for journalists.">
      <div className="grid gap-4 sm:grid-cols-4">
        {facts.map(([k, v]) => (
          <div key={k} className="card p-5 text-center">
            <div className="text-2xl font-extrabold text-brand-900 dark:text-white">{v}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</div>
          </div>
        ))}
      </div>
      <div className="card mt-6 max-w-2xl p-6">
        <h2 className="font-bold text-brand-900 dark:text-white">Boilerplate</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          RankForge is an SEO toolkit for Etsy sellers, combining tag research, keyword intelligence,
          listing optimization, and rank tracking in one place. Its free tier gives every seller three
          full searches a day; paid plans unlock unlimited research and AI-assisted listing tools.
        </p>
      </div>
    </MarketingPage>
  );
}
