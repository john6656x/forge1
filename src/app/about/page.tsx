import { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "About RankForge",
  description: "Why we built RankForge and what we believe about Etsy SEO."
};

const values = [
  {
    title: "Data over guesswork",
    body: "Every recommendation traces back to real marketplace signals — competition, demand, seasonality — not vibes."
  },
  {
    title: "Sellers first",
    body: "We build for the person packing orders at midnight. Fast tools, plain language, no dashboards you need a course to read."
  },
  {
    title: "Honest metrics",
    body: "If a keyword is saturated, we say so. Green means go, red means rethink — never green because it feels nicer."
  },
  {
    title: "Ship weekly",
    body: "The Etsy algorithm changes; so do we. New tools and data refreshes land continuously."
  }
];

export default function AboutPage() {
  return (
    <MarketingPage
      title="We help Etsy sellers get found"
      lede="RankForge started as an internal script for optimizing a handful of shops. Today it's a full SEO toolkit used by sellers in 127 countries."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {values.map((v) => (
          <div key={v.title} className="card p-6">
            <h2 className="font-bold text-brand-900 dark:text-white">{v.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{v.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
        RankForge is an independent product and is not affiliated with or endorsed by Etsy, Inc. The
        term &quot;Etsy&quot; is a trademark of Etsy, Inc.
      </p>
    </MarketingPage>
  );
}
