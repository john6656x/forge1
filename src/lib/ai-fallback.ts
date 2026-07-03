import { getProvider } from "@/lib/providers";
import { analyzeTitle2026 } from "@/lib/grades";
import { Location } from "@/lib/providers/types";

/**
 * Deterministic, rule-based generators used whenever no LLM key is set.
 * They lean on the marketplace provider for keyword data, so output is still
 * grounded and useful — just template-driven instead of model-written.
 */

const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export async function fallbackTitles(product: string, keyword: string, location: Location): Promise<string[]> {
  // 2026 rules: one natural phrase under 15 words / ~50–90 chars, product first,
  // ONE gift/occasion angle. Keyword variations belong in the tags, not here.
  const report = await getProvider().getTagReport(keyword || product, location);
  const good = report.tags.filter((t) => !t.trademarkRisk).sort((a, b) => b.volume - a.volume).map((t) => t.name);
  const k = cap(keyword || product);
  const p = cap(product);
  // Angle/style picks must NOT contain the main keyword, or the templates
  // would reintroduce it and trip the 2026 stuffing detector.
  const kw = (keyword || product).toLowerCase();
  const clean = good.filter((g) => !g.includes(kw) && !kw.includes(g));
  const angleA = cap(clean.find((g) => /gift|for /.test(g)) ?? "Thoughtful Gift");
  const styleA = cap(clean.find((g) => !/gift|for /.test(g)) ?? "Handmade");
  const clamp = (t: string) => {
    if (t.split(/\s+/).length <= 15 && t.length <= 95) return t;
    const words = t.split(/\s+/).slice(0, 14).join(" ");
    return words.length > 95 ? words.slice(0, 92).replace(/[,|\s—-]+\S*$/, "") : words;
  };
  const seen = new Set<string>();
  return [
    `${styleA} ${p} | ${angleA}`,
    `${k} — Handmade ${p} for Everyday Use`,
    `Personalized ${p} | Made to Order ${k}`,
    `${p} with ${styleA} Finish — ${angleA}`,
    `Custom ${k} | ${styleA} ${p}`
  ].map(clamp).filter((t) => { const key = t.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
}

export async function fallbackDescription(product: string, keyword: string, tone: string, location: Location): Promise<string> {
  const report = await getProvider().getTagReport(keyword || product, location);
  const kws = report.tags.filter((t) => !t.trademarkRisk).slice(0, 6).map((t) => t.name);
  const k = keyword || product;
  const toneLine =
    tone === "playful" ? "Warning: may cause spontaneous smiling." :
    tone === "luxury" ? "Quietly luxurious, made to be noticed." :
    "Made with care, built to last.";
  return [
    `${cap(k)} — ${toneLine}`,
    ``,
    `WHY YOU'LL LOVE IT`,
    `• Thoughtfully made ${product.toLowerCase()} designed around what buyers actually search for: ${kws.slice(0, 3).join(", ")}.`,
    `• Ships carefully packaged and gift-ready.`,
    `• Made to order — small variations make each piece one of a kind.`,
    ``,
    `DETAILS`,
    `• Materials and dimensions: [fill in]`,
    `• Processing time: [fill in]`,
    ``,
    `PERFECT FOR`,
    `${kws.slice(3).map(cap).join(" · ") || "Birthdays · Anniversaries · Just because"}`,
    ``,
    `HOW TO ORDER`,
    `1. Choose your options  2. Add personalization in the note box  3. Add to cart`,
    ``,
    `Questions? Message us — we answer fast.`
  ].join("\n");
}

export async function fallbackListing(product: string, keyword: string, location: Location) {
  const report = await getProvider().getTagReport(keyword || product, location);
  const tags = report.tags
    .filter((t) => !t.trademarkRisk)
    .sort((a, b) => b.volume / (b.competition + 10) - a.volume / (a.competition + 10))
    .slice(0, 13)
    .map((t) => t.name.slice(0, 20));
  const titles = await fallbackTitles(product, keyword, location);
  const description = await fallbackDescription(product, keyword, "warm", location);
  return { titles, tags, description, materials: report.materials.slice(0, 5).map((m) => m.name) };
}

export function fallbackOptimize(title: string, description: string, tags: string[]) {
  const checks: { label: string; pass: boolean; advice: string }[] = [];
  const tagList = tags.map((t) => t.trim()).filter(Boolean);

  checks.push({
    label: "13 tags used",
    pass: tagList.length === 13,
    advice: tagList.length === 13 ? "All slots filled." : `You're using ${tagList.length}/13 — add ${13 - tagList.length} more long-tail tags.`
  });
  checks.push({
    label: "Tags ≤ 20 characters",
    pass: tagList.every((t) => t.length <= 20),
    advice: tagList.every((t) => t.length <= 20) ? "All tags fit Etsy's limit." : `Too long: ${tagList.filter((t) => t.length > 20).join(", ")}.`
  });
  checks.push({
    label: "Multi-word tags majority",
    pass: tagList.filter((t) => t.includes(" ")).length >= Math.ceil(tagList.length / 2),
    advice: "Long-tail tags match specific buyer searches with less competition."
  });
  const titleA = analyzeTitle2026(title, tagList);
  checks.push({
    label: "Title under 15 words (2026 rule)",
    pass: titleA.words <= 15,
    advice: titleA.words <= 15 ? `${titleA.words} words — good.` : `${titleA.words} words — Etsy's 2026 guidance penalizes keyword-stuffed titles; keyword variations belong in tags.`
  });
  checks.push({
    label: "No keyword stuffing in title",
    pass: titleA.stuffedWords.length === 0 && titleA.separatorChains < 5,
    advice: titleA.stuffedWords.length ? `Repeated ${titleA.stuffedWords.map((w) => `"${w}"`).join(", ")} 3+ times — rewrite as one natural phrase.` : titleA.separatorChains >= 5 ? "Too many comma/pipe fragments — reads like a keyword list." : "Reads naturally."
  });
  checks.push({
    label: "Buyer phrase in the first 70 characters",
    pass: tagList.some((t) => title.toLowerCase().slice(0, 70).includes(t.toLowerCase())),
    advice: "Mobile shows ~70 characters; lead with what the product is, in the buyer's words."
  });
  checks.push({
    label: "Description opens with keywords",
    pass: tagList.some((t) => description.toLowerCase().slice(0, 180).includes(t.toLowerCase())),
    advice: "The first ~160 characters double as your Google snippet."
  });
  checks.push({
    label: "Description is scannable",
    pass: /\n/.test(description) && description.length > 300,
    advice: "Short sections with headers outperform a wall of text."
  });

  const score = Math.round((checks.filter((c) => c.pass).length / checks.length) * 100);
  return { score, checks };
}

export function fallbackPromptImprove(prompt: string): string {
  const p = prompt.trim();
  return [
    `You are an experienced Etsy SEO copywriter.`,
    ``,
    `TASK`,
    p,
    ``,
    `CONTEXT TO CONSIDER`,
    `- Target marketplace: Etsy (13 tags, 140-char titles, gift-driven buyers)`,
    `- Optimize for long-tail buyer phrases, not single words`,
    `- Avoid trademarked terms entirely`,
    ``,
    `OUTPUT FORMAT`,
    `- Be specific and concrete; no fluff`,
    `- If generating tags: max 20 characters each, lowercase`,
    `- If generating a title: front-load the primary keyword`,
    ``,
    `QUALITY BAR`,
    `Ask one clarifying question ONLY if the product is ambiguous; otherwise deliver.`
  ].join("\n");
}

export async function fallbackVideoScript(product: string, keyword: string, location: Location) {
  const report = await getProvider().getTagReport(keyword || product, location);
  const hooks = report.tags.filter((t) => !t.trademarkRisk).slice(0, 3).map((t) => t.name);
  return {
    hook: `POV: you finally found the ${keyword || product} everyone asks about`,
    scenes: [
      { seconds: "0–2", shot: "Close-up of the finished piece, natural light", overlay: `the ${keyword || product} everyone asks about` },
      { seconds: "2–6", shot: "Hands-on process clip (making/packing)", overlay: `handmade, not mass produced` },
      { seconds: "6–10", shot: "Three quick angles / variants", overlay: hooks.join(" · ") },
      { seconds: "10–13", shot: "Gift-wrap or unboxing moment", overlay: "gift-ready 🎁" },
      { seconds: "13–15", shot: "Logo / shop name end card", overlay: "link in bio → Etsy" }
    ],
    caption: `${cap(keyword || product)} — handmade & made to order. ${hooks.map((h) => "#" + h.replace(/\s+/g, "")).join(" ")}`,
    tip: "Etsy listing videos are muted autoplay, 5–15s: lead with the product, use text overlays, skip the intro."
  };
}

/** Rule-based review digest: theme extraction by sentiment bucket. */
export function fallbackReviewSummary(raw: string): string {
  const lines = raw.split("\n").filter(Boolean);
  const buckets = { pos: [] as string[], neg: [] as string[] };
  for (const l of lines) {
    const m = l.match(/^\[(\d)★\]\s*(.*)$/);
    if (!m) continue;
    (Number(m[1]) >= 4 ? buckets.pos : Number(m[1]) <= 2 ? buckets.neg : buckets.pos).push(m[2].toLowerCase());
  }
  const themes = (texts: string[], words: string[]) => words.filter((w) => texts.some((t) => t.includes(w)));
  const praise = themes(buckets.pos, ["quality", "shipping", "fast", "beautiful", "personaliz", "packag", "gift", "communicat", "craftsmanship"]);
  const pain = themes(buckets.neg, ["damaged", "late", "slow", "photos", "quality", "response", "sizing", "cheap", "refund"]);
  const parts: string[] = [];
  parts.push(`${lines.length} recent reviews analyzed: ${buckets.pos.length} favorable, ${buckets.neg.length} critical.`);
  if (praise.length) parts.push(`Buyers repeatedly mention ${praise.slice(0, 4).join(", ")} on the positive side — lean on these in listing copy.`);
  if (pain.length) parts.push(`Critical reviews cluster around ${pain.slice(0, 3).join(", ")} — the highest-payoff fix is addressing the first of these.`);
  if (!praise.length && !pain.length) parts.push("No dominant theme emerges; the feedback is varied.");
  parts.push("Rule-based digest — add an LLM API key for a written narrative summary.");
  return parts.join(" ");
}
