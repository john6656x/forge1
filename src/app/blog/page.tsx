import { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Blog",
  description: "Etsy SEO guides, keyword research tactics, and seller playbooks."
};

const posts = [
  {
    title: "The 13-tag framework: how to spend every tag slot wisely",
    tag: "Tags",
    minutes: 8,
    excerpt: "Broad, mid, and long-tail — the mix that gets new listings indexed fast without burying them in competition."
  },
  {
    title: "Reading competition scores like a pro",
    tag: "Strategy",
    minutes: 6,
    excerpt: "Why a 'green' keyword can still be wrong for your shop, and when a red one is worth fighting for."
  },
  {
    title: "Seasonality 101: planning listings 90 days ahead",
    tag: "Trends",
    minutes: 10,
    excerpt: "Use 12-month search trends to publish before demand peaks — not during it."
  },
  {
    title: "Etsy fees in 2026: a complete profit breakdown",
    tag: "Pricing",
    minutes: 7,
    excerpt: "Listing, transaction, processing, and Offsite Ads — what actually leaves your pocket per sale."
  },
  {
    title: "Titles that rank AND convert",
    tag: "Compose",
    minutes: 9,
    excerpt: "Front-load keywords without writing robot titles buyers scroll past."
  },
  {
    title: "From 0 to first sale: a 30-day SEO sprint",
    tag: "Playbook",
    minutes: 12,
    excerpt: "A day-by-day plan for brand-new shops using only the free tier."
  }
];

export default function BlogPage() {
  return (
    <MarketingPage title="The RankForge blog" lede="Practical Etsy SEO — no fluff, no recycled advice.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <article key={p.title} className="card flex flex-col p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-400">
              <span>{p.tag}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="font-normal normal-case text-slate-500 dark:text-slate-400">{p.minutes} min read</span>
            </div>
            <h2 className="mt-2 font-bold leading-snug text-brand-900 dark:text-white">{p.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{p.excerpt}</p>
            <span className="mt-4 text-sm font-semibold text-slate-400 dark:text-slate-500">Coming soon</span>
          </article>
        ))}
      </div>
    </MarketingPage>
  );
}
