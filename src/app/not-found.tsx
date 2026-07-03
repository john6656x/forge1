import { SiteHeader } from "@/components/marketing/header";
import { SiteFooter } from "@/components/marketing/footer";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page flex flex-col items-center py-28 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-ember-600 dark:text-ember-400">404</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-900 dark:text-white">This page isn&apos;t listed.</h1>
        <p className="mt-2 max-w-md text-slate-600 dark:text-slate-300">The link may be old, or the page moved. The tools are all still here.</p>
        <div className="mt-6"><ButtonLink href="/tools" variant="accent">Browse all tools</ButtonLink></div>
      </main>
      <SiteFooter />
    </>
  );
}
