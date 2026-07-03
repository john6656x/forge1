export type Competitor = {
  slug: string;
  name: string;
  tagline: string;
  priceNote: string;
  rows: [string, string, string][]; // [feature, RankForge, competitor]
};

const shared: [string, string][] = [
  ["Free daily searches", "3 full reports"],
  ["Tag Generator with competition + volume", "✓"],
  ["12-month trend charts", "✓"],
  ["Trademark warnings on tags", "✓"],
  ["AI listing optimizer", "✓ (Business)"],
  ["Rank tracking", "✓ (Business)"],
  ["Starting paid price", "$9.99/mo"]
];

export const competitors: Competitor[] = [
  {
    slug: "erank",
    name: "eRank",
    tagline: "The long-standing incumbent — broad toolset, dated interface.",
    priceNote: "Paid plans from $5.99–$29.99/mo; free tier is heavily limited per-feature.",
    rows: shared.map(([f, rf], i) => [f, rf, ["Limited lookups", "✓", "Partial", "✗", "✗", "✓ (Pro)", "$5.99/mo"][i]] as [string, string, string])
  },
  {
    slug: "marmalead",
    name: "Marmalead",
    tagline: "Keyword-first tool with a grading metaphor, single plan.",
    priceNote: "One plan at $19/mo; no free tier beyond trial.",
    rows: shared.map(([f, rf], i) => [f, rf, ["Trial only", "✓", "✓", "✗", "✗", "✗", "$19/mo"][i]] as [string, string, string])
  },
  {
    slug: "everbee",
    name: "EverBee",
    tagline: "Chrome-extension centric, strong on product analytics.",
    priceNote: "Free extension tier; Growth from $29.99/mo.",
    rows: shared.map(([f, rf], i) => [f, rf, ["Extension only", "Partial", "✓", "✗", "✓", "✗", "$29.99/mo"][i]] as [string, string, string])
  },
  {
    slug: "alura",
    name: "Alura",
    tagline: "All-in-one suite with email tooling, higher entry price.",
    priceNote: "Free tier with small limits; paid from $19.99/mo.",
    rows: shared.map(([f, rf], i) => [f, rf, ["Small limits", "✓", "Partial", "✗", "✓", "✗", "$19.99/mo"][i]] as [string, string, string])
  }
];

export const competitorBySlug = (slug: string) => competitors.find((c) => c.slug === slug);
