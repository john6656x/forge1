import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { MarketingPage } from "@/components/marketing/page-shell";
import { competitors, competitorBySlug } from "@/lib/competitors";

export function generateStaticParams() {
  return competitors.map((c) => ({ competitor: c.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor } = await params;
  const c = competitorBySlug(competitor);
  if (!c) return { title: "Compare" };
  return {
    title: `RankForge vs ${c.name}`,
    description: `Feature and pricing comparison: RankForge vs ${c.name}.`
  };
}

export default async function CompetitorPage({
  params
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor } = await params;
  const c = competitorBySlug(competitor);
  if (!c) notFound();

  return (
    <MarketingPage title={`RankForge vs ${c.name}`} lede={c.tagline}>
      <div className="card max-w-3xl overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left dark:border-slate-800">
              <th className="p-4 font-semibold text-slate-500 dark:text-slate-400">Feature</th>
              <th className="p-4 font-bold text-brand-900 dark:text-white">RankForge</th>
              <th className="p-4 font-semibold text-slate-600 dark:text-slate-300">{c.name}</th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map(([f, a, b]) => (
              <tr key={f} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                <td className="p-4 text-slate-600 dark:text-slate-300">{f}</td>
                <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">{a}</td>
                <td className="p-4 text-slate-500 dark:text-slate-400">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-3xl text-xs text-slate-500 dark:text-slate-400">
        {c.priceNote} Competitor details based on public pricing pages and may change — always verify
        on their site. All trademarks belong to their respective owners.
      </p>
      <div className="mt-8">
        <ButtonLink href="/tools/etsy/tag-generator" variant="accent">
          Try RankForge free — 3 searches a day
        </ButtonLink>
      </div>
    </MarketingPage>
  );
}
