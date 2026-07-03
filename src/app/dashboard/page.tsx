import Link from "next/link";
import { ArrowUpRight, FolderKanban, Search, Star, TrendingUp } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { planLimit, totalUsedToday } from "@/lib/quota";
import { toolBySlug, TOOLS } from "@/lib/registry";
import { ButtonLink } from "@/components/ui/button";
import { TrackedKeywords } from "@/components/dashboard/tracked-keywords";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { NotificationsBell } from "@/components/dashboard/notifications-bell";
import { MyShop } from "@/components/dashboard/my-shop";

export const metadata = { title: "Dashboard — RankForge" };
export const dynamic = "force-dynamic";

const toolLabel = (t: string) =>
  t.startsWith("ai:") ? `AI · ${t.slice(3)}` : (TOOLS.find((x) => x.slug.startsWith(t))?.name ?? t);

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const user = (await getSessionUser())!;
  const { upgraded } = await searchParams;

  const [etsyConn, trackedCount, usedToday, searches, favorites, projects, snapshots] = await Promise.all([
    prisma.etsyConnection.findUnique({ where: { userId: user.id }, select: { id: true } }),
    prisma.trackedKeyword.count({ where: { userId: user.id, active: true } }),
    totalUsedToday(user.id),
    prisma.search.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.project.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 4, include: { _count: { select: { items: true } } } }),
    prisma.rankSnapshot.findMany({ where: { userId: user.id }, orderBy: { takenAt: "desc" }, take: 5 })
  ]);

  const perToolLimit = planLimit(user.plan);
  const pct = perToolLimit === Infinity ? 4 : Math.min(100, Math.round((usedToday / (perToolLimit * 4)) * 100));

  return (
    <main id="main" className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900 dark:text-white">
            Welcome back, {user.name.split(" ")[0] || "seller"}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Plan: <strong className="text-brand-900 dark:text-white">{user.plan}</strong>
            {user.plan === "FREE" && <> — <Link href="/pricing" className="font-semibold text-ember-600 dark:text-ember-400">upgrade for 100× more searches</Link></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <ButtonLink href="/tools" variant="accent" size="sm">Open tools <ArrowUpRight className="ml-1 h-4 w-4" aria-hidden /></ButtonLink>
        </div>
      </div>

      {upgraded && (
        <div role="status" className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
          Payment received — your plan updates as soon as Stripe's webhook lands (usually seconds).
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {/* Usage */}
        <section className="card p-5" aria-label="Usage today">
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900 dark:text-white"><Search className="h-4 w-4 text-ember-500" aria-hidden /> Searches today</h2>
          <p className="mt-3 text-3xl font-extrabold tabular-nums text-brand-900 dark:text-white">
            {usedToday}<span className="text-base font-semibold text-slate-400"> today</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-brand-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-ember-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{perToolLimit === Infinity ? "Unlimited" : `${perToolLimit}/day`} per tool — maxing one tool never locks the others. Resets at midnight UTC.</p>
        </section>

        {/* Projects */}
        <section className="card p-5" aria-label="Projects">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900 dark:text-white"><FolderKanban className="h-4 w-4 text-ember-500" aria-hidden /> Projects</h2>
            <Link href="/dashboard/projects" className="text-xs font-semibold text-ember-600 dark:text-ember-400">All →</Link>
          </div>
          {projects.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No projects yet. Save tag sets and listing drafts into projects from any tool.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link href={`/dashboard/projects/${p.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:border-ember-300 dark:border-brand-800 dark:text-slate-200">
                    <span className="truncate">{p.name}</span>
                    <span className="text-xs text-slate-400">{p._count.items} items</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Favorites */}
        <section className="card p-5" aria-label="Favorites">
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900 dark:text-white"><Star className="h-4 w-4 text-ember-500" aria-hidden /> Recent favorites</h2>
          {favorites.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Star tags and keywords in any results table to keep them here.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {favorites.map((f) => (
                <li key={f.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-brand-800 dark:text-slate-200">
                  {f.value}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-4 space-y-4">
        <OnboardingChecklist etsyConnected={Boolean(etsyConn)} hasSearches={searches.length > 0} hasTracked={trackedCount > 0} />
        <MyShop />
        <TrackedKeywords />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Recent searches */}
        <section className="card p-5" aria-label="Recent searches">
          <h2 className="text-sm font-bold text-brand-900 dark:text-white">Recent research</h2>
          {searches.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Your searches will appear here. Start with the <Link href="/tools/etsy/tag-generator" className="font-semibold text-ember-600 dark:text-ember-400">Tag Generator</Link>.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-1.5 font-semibold">Query</th>
                  <th className="py-1.5 font-semibold">Tool</th>
                  <th className="py-1.5 font-semibold">Where</th>
                </tr>
              </thead>
              <tbody>
                {searches.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 dark:border-brand-800">
                    <td className="py-2 font-medium text-slate-800 dark:text-slate-100">{s.query}</td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{toolLabel(s.tool)}</td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{s.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Rank history */}
        <section className="card p-5" aria-label="Rank checks">
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900 dark:text-white"><TrendingUp className="h-4 w-4 text-ember-500" aria-hidden /> Latest rank checks</h2>
          {snapshots.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Track where a listing ranks for a keyword with the <Link href="/tools/etsy/rank-check" className="font-semibold text-ember-600 dark:text-ember-400">Rank Checker</Link> — every check saves a snapshot so you can see movement over time.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {snapshots.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm dark:border-brand-800">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800 dark:text-slate-100">"{s.keyword}"</span>
                    <span className="block truncate text-xs text-slate-400">{s.listingRef}</span>
                  </span>
                  <span className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${s.position ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300" : "bg-slate-100 text-slate-500 dark:bg-brand-800 dark:text-slate-400"}`}>
                    {s.position ? `#${s.position}` : "not in top 100"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
