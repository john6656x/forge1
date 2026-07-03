import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { llm, llmAvailable } from "@/lib/llm";
import { getProvider } from "@/lib/providers";
import { checkQuota, consumeQuota, quotaJson } from "@/lib/quota";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000)
  })).min(1).max(30)
});

const SYSTEM = `You are Forge AI, RankForge's Etsy SEO assistant. You help sellers with keyword strategy, tags (13 max, ≤20 chars — keyword variations live here now), titles (2026 rules: natural language, under 15 words, ~50–90 chars, product first — keyword stuffing is penalized), pricing, and shop growth. Be concrete and practical; short answers over essays. Never suggest trademarked terms.`;

/** Keyword-aware rule-based replies when no LLM key is configured. */
async function ruleBasedReply(question: string): Promise<string> {
  const q = question.toLowerCase();
  const kwMatch = question.match(/["“']([^"”']{2,60})["”']/);
  const keyword = kwMatch?.[1];

  if (keyword) {
    const report = await getProvider().getTagReport(keyword, "Global");
    const best = report.tags.filter((t) => !t.trademarkRisk).sort((a, b) => b.volume / (b.competition + 10) - a.volume / (a.competition + 10)).slice(0, 5);
    return `Quick read on "${keyword}": competition ${report.competition}/100, estimated volume ~${report.volume.toLocaleString()}/mo.\n\nStrongest related tags right now:\n${best.map((t) => `• ${t.name} (vol ~${t.volume.toLocaleString()}, comp ${t.competition})`).join("\n")}\n\nWant me to run the full Tag Generator on it? (Tools → Tag Generator)\n\n— Forge AI is in rule-based mode. Add an ANTHROPIC_API_KEY or OPENAI_API_KEY for full conversational answers.`;
  }
  if (q.includes("tag")) {
    return `Tag strategy in 5 rules:\n1. Fill all 13 slots — empty tags are free rankings you're not taking.\n2. Multi-word phrases beat single words ("linen tote bag" > "bag").\n3. Match how buyers gift-search: "for her", "birthday", occasions.\n4. Don't repeat your title verbatim across all tags — cover variations.\n5. Zero trademarked terms, ever.\n\nPut a keyword in quotes and I'll score it live.\n\n— Rule-based mode; add an LLM API key for full chat.`;
  }
  if (q.includes("title")) {
    return `Title rules changed in 2026 — Etsy now penalizes keyword-stuffed titles. What works now:\n1. One natural phrase, under 15 words (~50–90 chars): "[what it is] | [one gift/occasion angle]".\n2. Product first, inside the first ~70 chars (that's all mobile shows).\n3. Never repeat a word 3+ times; keyword variations go in your 13 TAGS, not the title.\n4. Write it like a person would say it — "Whimsical Black Cat Coffee Mug | Funny Gift for Book Lovers".\n\nPut a keyword in quotes and I'll pull live data for it.\n\n— Rule-based mode; add an LLM API key for full chat.`;
  }
  if (q.includes("price") || q.includes("pricing")) {
    return `Pricing quickly: check the price distribution in the Tag Generator first (Bargain/Midrange/Premium bands), price into the band your photos support, and verify margin with the Profit Calculator — Etsy takes $0.20 listing + 6.5% transaction + 3% + $0.25 processing (and 15% if Offsite Ads converts).\n\n— Rule-based mode; add an LLM API key for full chat.`;
  }
  return `I can help with tags, titles, pricing, and keyword strategy. Put any keyword in quotes ("ceramic mug") and I'll score it with live tool data.\n\n— Forge AI is in rule-based mode right now. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env for full conversational answers.`;
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const user = await getSessionUser();
  const quota = await checkQuota(user, "forge-ai");
  if (!quota.allowed) {
    return NextResponse.json({ error: "LIMIT_REACHED", message: "Daily limit reached.", quota: quotaJson(quota) }, { status: 429 });
  }

  try {
    const reply = llmAvailable()
      ? await llm({ system: SYSTEM, messages: parsed.data.messages, maxTokens: 800 })
      : await ruleBasedReply(parsed.data.messages[parsed.data.messages.length - 1].content);

    const after = await consumeQuota(user, "forge-ai");
    return NextResponse.json({ reply, ai: llmAvailable(), quota: quotaJson(after) });
  } catch (err) {
    return NextResponse.json({ error: "AI_ERROR", message: err instanceof Error ? err.message : "Chat failed" }, { status: 502 });
  }
}
