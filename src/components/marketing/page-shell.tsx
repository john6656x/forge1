import { ReactNode } from "react";
import { SiteHeader } from "@/components/marketing/header";
import { SiteFooter } from "@/components/marketing/footer";

export function MarketingPage({
  title,
  lede,
  children
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="border-b border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-950">
          <div className="container-page">
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-900 dark:text-white sm:text-4xl">
              {title}
            </h1>
            {lede ? (
              <p className="mt-3 max-w-2xl text-lg text-slate-600 dark:text-slate-300">{lede}</p>
            ) : null}
          </div>
        </section>
        <section className="py-12">
          <div className="container-page">{children}</div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
