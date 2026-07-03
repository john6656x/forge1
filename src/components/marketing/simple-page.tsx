import { ReactNode } from "react";
import { SiteHeader } from "@/components/marketing/header";
import { SiteFooter } from "@/components/marketing/footer";

export function SimplePage({ title, lead, children }: { title: string; lead: string; children?: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page py-14">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-900 dark:text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 text-lg leading-relaxed text-slate-600 dark:text-slate-300">{lead}</p>
          {children && <div className="prose-slate mt-8 space-y-6 text-slate-700 dark:text-slate-200">{children}</div>}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
