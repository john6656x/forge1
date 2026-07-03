import { SiteHeader } from "@/components/marketing/header";
import { SiteFooter } from "@/components/marketing/footer";
import { FinalCta, Hero, PricingTeaser, Simplicity, StatsBar, Testimonials, ToolGridSection } from "@/components/marketing/sections";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <StatsBar />
        <Simplicity />
        <ToolGridSection />
        <Testimonials />
        <PricingTeaser />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
