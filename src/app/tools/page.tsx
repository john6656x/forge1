import { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/header";
import { SiteFooter } from "@/components/marketing/footer";
import { CATEGORIES, toolsByCategory } from "@/lib/registry";

export const metadata: Metadata = {
  title: "All Tools",
  description: "Every RankForge tool for Etsy sellers: brainstorm niches, analyze shops and listings, and compose listings that rank."
};

export default function ToolsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page py-14">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-900 dark:text-white sm:text-4xl">All tools</h1>
        <p className="mt-2 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          One connected toolkit: brainstorm the niche, analyze the field, compose the listing.
        </p>
        {CATEGORIES.map((cat) => (
          <section key={cat} className="mt-10" aria-labelledby={`cat-${cat}`}>
            <h2 id={`cat-${cat}`} className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {cat}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {toolsByCategory(cat).map((t) => (
                <Link key={t.slug} href={t.href} className="card group p-5 transition-shadow hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-brand-700 dark:bg-brand-800 dark:text-slate-200">
                      <t.icon className="h-5 w-5" aria-hidden />
                    </span>
                    {t.status === "soon" ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-brand-800 dark:text-slate-400">Soon</span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Live</span>
                    )}
                  </div>
                  <h3 className="mt-4 font-bold text-brand-900 group-hover:text-ember-600 dark:text-white dark:group-hover:text-ember-400">{t.name}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.oneLiner}</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
