import { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/page-shell";

export const metadata: Metadata = { title: "Privacy Policy" };

const sections = [
  ["What we collect", "Account details (email, name), searches you run, favorites and projects you save, and standard technical logs. In demo mode, quota usage lives in a first-party cookie only."],
  ["How we use it", "To run the product, enforce plan limits, improve keyword datasets in aggregate, and send transactional email. We do not sell personal data."],
  ["Cookies", "Strictly necessary cookies for sessions and quota. Analytics, if enabled, is cookie-less and aggregated."],
  ["Data retention", "Search history is retained while your account is active; you can delete your account and associated data from Settings."],
  ["Your rights", "Access, correction, export, and deletion requests: privacy@rankforge.app. EU/UK users may also contact their supervisory authority."]
];

export default function PrivacyPage() {
  return (
    <MarketingPage title="Privacy Policy" lede="Last updated: July 2026. Placeholder policy — replace with counsel-reviewed text before launch.">
      <div className="max-w-2xl space-y-6">
        {sections.map(([h, b]) => (
          <div key={h}>
            <h2 className="font-bold text-brand-900 dark:text-white">{h}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{b}</p>
          </div>
        ))}
      </div>
    </MarketingPage>
  );
}
