import { Metadata } from "next";
import { MarketingPage } from "@/components/marketing/page-shell";

export const metadata: Metadata = { title: "Terms of Service" };

const sections = [
  ["1. The service", "RankForge provides SEO research and content tools for online sellers. Data is provided 'as is' for informational purposes; rankings and sales outcomes are not guaranteed."],
  ["2. Accounts & fair use", "Free accounts include a limited number of daily searches. Automated scraping, credential sharing, and reselling of data are prohibited."],
  ["3. Subscriptions", "Paid plans renew automatically until cancelled. You can cancel anytime from Settings; access continues until the end of the billing period."],
  ["4. Intellectual property", "You own your listings and content. We own the platform, tooling, and aggregated datasets. 'Etsy' is a trademark of Etsy, Inc.; RankForge is not affiliated with or endorsed by Etsy."],
  ["5. Liability", "To the maximum extent permitted by law, RankForge is not liable for indirect or consequential damages arising from use of the service."],
  ["6. Changes", "We may update these terms; material changes will be announced in-app at least 14 days in advance."]
];

export default function TermsPage() {
  return (
    <MarketingPage title="Terms of Service" lede="Last updated: July 2026. Placeholder terms — replace with counsel-reviewed text before launch.">
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
