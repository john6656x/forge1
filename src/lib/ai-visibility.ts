import { analyzeTitle2026 } from "@/lib/grades";
import { gradeFromScore } from "@/lib/grades";

/**
 * AI Shopping Visibility — scores how well a listing performs on AI shopping
 * surfaces (ChatGPT, Gemini, Copilot, Google AI Mode), where Etsy listings are
 * now surfaced and purchased directly. Over 20% of Etsy's referral traffic
 * comes from ChatGPT, and conversational search ranks on what the listing
 * actually SAYS: material, dimensions, occasion, recipient, and care become
 * first-class ranking inputs — not just title keywords.
 *
 * The rule engine below is deterministic and honest about what it measures.
 * With an LLM key configured, the same route also gets a model-written
 * agent-perspective assessment on top.
 */

export interface AivDimension {
  key: string;
  name: string;
  score: number; // 0–100
  grade: string;
  finding: string;
  fix: string | null;
}

export interface AivIntent {
  scenario: string; // buyer prompt an AI agent would receive
  match: "strong" | "partial" | "weak";
  why: string;
}

export interface AivReport {
  score: number;
  grade: string;
  dimensions: AivDimension[];
  intents: AivIntent[];
  recommendations: string[];
}

const OCCASIONS = ["birthday", "wedding", "anniversary", "christmas", "valentine", "mother's day", "father's day", "graduation", "housewarming", "baby shower", "engagement"];
const RECIPIENTS = ["for her", "for him", "for mom", "for dad", "for women", "for men", "for kids", "for couples", "for teacher", "for grandma", "for friend", "for boyfriend", "for girlfriend", "for wife", "for husband"];
const CARE_HINTS = ["care", "wash", "clean", "dishwasher", "machine wash", "hand wash", "wipe", "polish", "waterproof"];
const SIZE_RE = /\b\d+(\.\d+)?\s?(x|×)\s?\d+(\.\d+)?|\b\d+(\.\d+)?\s?(cm|mm|inch|inches|in\b|"|oz|ml|liter|litre|ft)/i;
const TIME_RE = /\b(ships?|processing|dispatch|made to order|ready to ship|business days?|weeks?)\b/i;
const PERSONALIZATION_RE = /\b(personali[sz]ed?|custom|engrav|monogram|name|initials?|your text)\b/i;

function dim(key: string, name: string, score: number, finding: string, fix: string | null): AivDimension {
  return { key, name, score: Math.max(0, Math.min(100, score)), grade: gradeFromScore(Math.max(0, Math.min(100, score))), finding, fix };
}

export function scoreAiVisibility(input: {
  title: string;
  description: string;
  tags: string[];
  materials?: string[];
  price?: number;
}): AivReport {
  const { title, description, tags } = input;
  const materials = input.materials ?? [];
  const text = `${title}\n${description}`.toLowerCase();
  const desc = description.toLowerCase();

  // 1. Intent clarity — can an agent tell WHAT this is and WHO it's for?
  const titleA = analyzeTitle2026(title, tags);
  const hasRecipient = RECIPIENTS.some((r) => text.includes(r));
  const hasOccasion = OCCASIONS.some((o) => text.includes(o));
  let intentScore = 40 + (titleA.score >= 75 ? 25 : titleA.score >= 50 ? 12 : 0) + (hasRecipient ? 18 : 0) + (hasOccasion ? 17 : 0);
  const intentClarity = dim(
    "intent",
    "Intent clarity",
    intentScore,
    hasRecipient || hasOccasion
      ? `Agent can infer ${[hasRecipient && "the recipient", hasOccasion && "the occasion"].filter(Boolean).join(" and ")}.`
      : "Nothing tells an agent who this is for or when it's given.",
    hasRecipient && hasOccasion ? null : "Name at least one recipient (\"for mom\") and one occasion (\"birthday\") in plain language — that's what buyers say to AI agents."
  );

  // 2. Structured facts — the attributes conversational search ranks on.
  const facts = {
    material: materials.length > 0 || /\b(wood|ceramic|cotton|linen|silver|gold|steel|leather|resin|clay|glass|wool|brass|acrylic|bamboo|canvas)\b/i.test(text),
    size: SIZE_RE.test(description),
    care: CARE_HINTS.some((c) => desc.includes(c)),
    personalization: PERSONALIZATION_RE.test(text),
    color: /\b(black|white|red|blue|green|amber|beige|grey|gray|pink|gold|silver|natural|navy|teal|terracotta)\b/i.test(text)
  };
  const factCount = Object.values(facts).filter(Boolean).length;
  const missingFacts = Object.entries(facts).filter(([, v]) => !v).map(([k]) => k);
  const structured = dim(
    "facts",
    "Structured facts",
    factCount * 20,
    `${factCount}/5 fact types present (material, size, care, personalization, color).`,
    missingFacts.length ? `Add as plain statements: ${missingFacts.join(", ")}. Agents quote facts — they can't quote what isn't written.` : null
  );

  // 3. Answer readiness — does the text answer the questions agents relay?
  const answers = {
    "shipping/processing time": TIME_RE.test(desc),
    "what's included": /\b(includes?|comes with|set of|you (will )?receive)\b/i.test(desc),
    "how to order/personalize": /\b(add|leave|choose|select|note|checkout|drop.?down)\b/i.test(desc) && facts.personalization || /\b(add to cart|choose|select a)\b/i.test(desc)
  };
  const answered = Object.values(answers).filter(Boolean).length;
  const answerReady = dim(
    "answers",
    "Answer readiness",
    30 + answered * 23,
    `Answers ${answered}/3 of the questions agents relay (timing, contents, how to order).`,
    answered === 3 ? null : `Missing: ${Object.entries(answers).filter(([, v]) => !v).map(([k]) => k).join("; ")}.`
  );

  // 4. Natural language quality — LLMs summarize prose, not keyword soup.
  const sentences = description.split(/[.!?]\s/).filter((s) => s.trim().split(/\s+/).length >= 4).length;
  const nlScore = Math.min(100, (titleA.stuffedWords.length === 0 ? 40 : 10) + Math.min(40, sentences * 8) + (description.length >= 300 ? 20 : description.length >= 120 ? 10 : 0));
  const naturalLang = dim(
    "language",
    "Natural language",
    nlScore,
    sentences >= 4 ? `${sentences} real sentences — summarizable by an LLM.` : "Description is too thin or list-like for an agent to summarize confidently.",
    nlScore >= 80 ? null : "Write full sentences an agent could read aloud to a buyer; keyword lists get skipped."
  );

  // 5. Gift-context coverage — "gift" is Etsy's #1 query; agents get asked for gifts constantly.
  const giftScore = (text.includes("gift") ? 45 : 10) + (hasRecipient ? 25 : 0) + (hasOccasion ? 20 : 0) + (/\bgift (box|wrap|ready|bag)\b/i.test(text) ? 10 : 0);
  const gift = dim(
    "gift",
    "Gift-context coverage",
    giftScore,
    text.includes("gift") ? "Giftability is stated." : "\"Gift\" never appears — agents fielding gift prompts will skip it.",
    giftScore >= 80 ? null : "State giftability explicitly: who it suits, the occasion, and whether it arrives gift-ready."
  );

  const dimensions = [intentClarity, structured, answerReady, naturalLang, gift];
  const score = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);

  // Simulated buyer intents — the prompts an agent actually receives.
  const productNoun = title.split(/[|,–—-]/)[0]?.trim() || "this item";
  const priceLine = input.price ? ` under $${Math.ceil((input.price * 1.4) / 10) * 10}` : "";
  const intents: AivIntent[] = [
    {
      scenario: `"Find a ${hasOccasion ? OCCASIONS.find((o) => text.includes(o)) : "birthday"} gift${priceLine} for ${hasRecipient ? RECIPIENTS.find((r) => text.includes(r))?.replace("for ", "") : "my mom"}"`,
      match: hasRecipient && hasOccasion && text.includes("gift") ? "strong" : hasRecipient || hasOccasion ? "partial" : "weak",
      why: hasRecipient && hasOccasion ? "Recipient, occasion, and giftability are all stated — the agent can match this confidently." : "The agent has to guess the missing half of the intent; it will prefer listings that state it."
    },
    {
      scenario: `"What is ${productNoun} made of and how big is it?"`,
      match: facts.material && facts.size ? "strong" : facts.material || facts.size ? "partial" : "weak",
      why: facts.material && facts.size ? "Material and dimensions are quotable facts." : `Missing ${[!facts.material && "material", !facts.size && "dimensions"].filter(Boolean).join(" and ")} — the agent can't answer, so it surfaces a listing that can.`
    },
    {
      scenario: `"Can it be personalized and how fast does it ship?"`,
      match: facts.personalization && answers["shipping/processing time"] ? "strong" : facts.personalization || answers["shipping/processing time"] ? "partial" : "weak",
      why: facts.personalization && answers["shipping/processing time"] ? "Both personalization and timing are answered in the text." : "Unanswered follow-ups end conversations — and sales."
    }
  ];

  const recommendations = dimensions
    .filter((d) => d.fix)
    .sort((a, b) => a.score - b.score)
    .map((d) => d.fix as string);

  return { score, grade: gradeFromScore(score), dimensions, intents, recommendations };
}
