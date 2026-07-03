import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingPage } from "@/components/marketing/page-shell";
import { competitors } from "@/lib/competitors";

export const metadata: Metadata = {
  title: "Compare RankForge",
  description: "How RankForge stacks up against eRank, Marmalead, EverBee, and Alura."
};

export default function ComparePage() {
  return (
    <MarketingPage
      title="RankForge vs. the alternatives"
      lede="Honest, feature-by-feature comparisons. We link to every competitor — pick what fits your shop."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {competitors.map((c) => (
          <Link
            key={c.slug}
            href={`/compare/${c.slug}`}
            className="card group flex items-center justify-between p-6 transition hover:shadow-lift"
          >
            <div>
              <h2 className="font-bold text-brand-900 dark:text-white">RankForge vs {c.name}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.tagline}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-accent-500" />
          </Link>
        ))}
      </div>
    </MarketingPage>
  );
}
