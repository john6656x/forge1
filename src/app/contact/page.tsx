import { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the RankForge team."
};

export default function ContactPage() {
  return (
    <MarketingPage title="Contact us" lede="Questions, feedback, or partnership ideas — we read everything.">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-6">
          <h2 className="font-bold text-brand-900 dark:text-white">Support</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            support@rankforge.app — replies within one business day.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="font-bold text-brand-900 dark:text-white">Sales & partnerships</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            hello@rankforge.app — bulk seats, agencies, integrations.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="font-bold text-brand-900 dark:text-white">Press</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            press@rankforge.app — see the <a className="link-quiet underline" href="/press">press page</a> for assets.
          </p>
        </div>
      </div>
    </MarketingPage>
  );
}
