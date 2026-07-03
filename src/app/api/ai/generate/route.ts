import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchImageForVision, llm, llmAvailable, llmJson, llmVision } from "@/lib/llm";
import {
  fallbackDescription, fallbackListing, fallbackOptimize,
  fallbackPromptImprove, fallbackReviewSummary, fallbackTitles, fallbackVideoScript
} from "@/lib/ai-fallback";
import { scoreAiVisibility } from "@/lib/ai-visibility";
import { LOCATIONS, Location } from "@/lib/providers/types";
import { checkQuota, consumeQuota, quotaJson } from "@/lib/quota";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sha256hex } from "@/lib/crypto";

const schema = z.object({
  task: z.enum(["titles", "description", "listing", "optimize", "prompt-improve", "video-script", "ai-visibility", "review-summary", "photo-audit"]),
  product: z.string().trim().max(200).optional().default(""),
  keyword: z.string().trim().max(160).optional().default(""),
  tone: z.enum(["warm", "playful", "luxury"]).optional().default("warm"),
  title: z.string().max(400).optional().default(""),
  description: z.string().max(8000).optional().default(""),
  tags: z.array(z.string().max(40)).max(20).optional().default([]),
  prompt: z.string().max(4000).optional().default(""),
  imageUrl: z.string().trim().url().max(600).optional(),
  loc: z.enum(LOCATIONS as [Location, ...Location[]]).optional().default("Global")
});

const SYSTEM = `You are RankForge's Etsy SEO copywriter, tuned to Etsy's 2026 algorithm. Hard rules:
- TITLES (2026 guidance — keyword stuffing is now PENALIZED): one natural, buyer-friendly phrase, UNDER 15 WORDS and ~50–90 characters. Lead with what the product IS, then one recipient/occasion angle. Sounds like a person wrote it, e.g. "Whimsical Black Cat Coffee Mug | Funny Gift for Book Lovers" — never comma-separated keyword chains, never a word repeated 3+ times.
- TAGS: 13 max, each ≤20 characters, lowercase, long-tail buyer phrases (tags are where keyword variations belong now — not the title).
- DESCRIPTIONS: write for humans AND for AI shopping agents (ChatGPT/Gemini surface Etsy listings): state material, dimensions, care, personalization options, processing time, and who/what occasion it suits — as clear scannable facts.
- Never use trademarked terms (brand names, characters, celebrities).`;

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST", issues: parsed.error.issues }, { status: 400 });
  const p = parsed.data;

  const user = await getSessionUser();
  const quota = await checkQuota(user, p.task);
  if (!quota.allowed) {
    return NextResponse.json({ error: "LIMIT_REACHED", message: "Daily limit reached.", quota: quotaJson(quota) }, { status: 429 });
  }

  const ai = llmAvailable();

  // Content-addressed dedup (from Site-Creator): the same input never costs
  // quota or an LLM call twice. Hash covers the engine too, so adding an API
  // key later regenerates rather than serving stale rule-based output.
  // Bump the version prefix whenever generation logic changes — it invalidates
  // every cached result from the old rules (e.g. the 2026 title rewrite).
  const contentHash = sha256hex(
    ["v2", p.task, ai ? "ai" : "rules", p.product, p.keyword, p.tone, p.title, p.description, p.tags.join(","), p.prompt, p.imageUrl ?? "", p.loc].join("|")
  );
  const cached = await prisma.analysisCache.findUnique({ where: { contentHash } }).catch(() => null);
  if (cached) {
    return NextResponse.json({ data: JSON.parse(cached.resultJson), ai: cached.ai, cached: true, quota: quotaJson(quota) });
  }

  try {
    let data: unknown;
    switch (p.task) {
      case "titles": {
        if (!p.product && !p.keyword) return bad("Give me the product (and ideally the main keyword).");
        data = ai
          ? await llmJson<{ titles: string[] }>({
              system: SYSTEM,
              prompt: `Write 5 Etsy listing titles for product "${p.product}" targeting keyword "${p.keyword || p.product}". JSON: {"titles": string[5]}`
            }).then((r) => r.titles)
          : await fallbackTitles(p.product, p.keyword, p.loc);
        break;
      }
      case "description": {
        if (!p.product && !p.keyword) return bad("Give me the product (and ideally the main keyword).");
        data = ai
          ? await llm({
              system: SYSTEM,
              messages: [{ role: "user", content: `Write an Etsy listing description for "${p.product}" (keyword: "${p.keyword || p.product}", tone: ${p.tone}). Structure: hook line, WHY YOU'LL LOVE IT bullets, DETAILS with [fill in] placeholders for materials/dimensions/processing, PERFECT FOR line, HOW TO ORDER steps.` }],
              maxTokens: 900
            })
          : await fallbackDescription(p.product, p.keyword, p.tone, p.loc);
        break;
      }
      case "listing": {
        if (!p.product) return bad("Describe the product first.");
        data = ai
          ? await llmJson({
              system: SYSTEM,
              prompt: `Full Etsy listing for "${p.product}" targeting "${p.keyword || p.product}". JSON: {"titles": string[3], "tags": string[13], "description": string, "materials": string[5]}. Tags lowercase, ≤20 chars each.`,
              maxTokens: 1400
            })
          : await fallbackListing(p.product, p.keyword, p.loc);
        break;
      }
      case "optimize": {
        if (!p.title && !p.description && p.tags.length === 0) return bad("Paste the listing's title, description and tags.");
        const rules = fallbackOptimize(p.title, p.description, p.tags);
        data = ai
          ? {
              ...rules,
              rewrite: await llmJson<{ title: string; tags: string[]; notes: string[] }>({
                system: SYSTEM,
                prompt: `Improve this Etsy listing. Title: "${p.title}". Tags: ${JSON.stringify(p.tags)}. Description (first 800 chars): "${p.description.slice(0, 800)}". JSON: {"title": string, "tags": string[13], "notes": string[3]} — notes are the three highest-impact changes.`,
                maxTokens: 900
              })
            }
          : rules;
        break;
      }
      case "prompt-improve": {
        if (!p.prompt) return bad("Paste the prompt you want improved.");
        data = ai
          ? await llm({
              system: "You improve prompts for AI copywriting tools. Return only the improved prompt, structured with TASK / CONTEXT / OUTPUT FORMAT / QUALITY BAR sections.",
              messages: [{ role: "user", content: p.prompt }],
              maxTokens: 700
            })
          : fallbackPromptImprove(p.prompt);
        break;
      }
      case "photo-audit": {
        if (!p.imageUrl) return bad("Provide the image URL to audit.");
        if (!ai) {
          data = {
            available: false,
            message: "The photo audit needs a vision-capable AI key (ANTHROPIC_API_KEY or OPENAI_API_KEY). Rule-based mode can grade counts and metadata, but it can't see pixels — and won't pretend to."
          };
          break;
        }
        const img = await fetchImageForVision(p.imageUrl);
        const raw = await llmVision({
          system: `You audit Etsy listing FIRST PHOTOS. Etsy's 2026 ranking uses image recognition on the primary photo, and ~46% of purchases happen in the mobile app where the thumbnail decides the click. Respond ONLY with JSON:
{"firstImpression":"one blunt sentence, as a scrolling buyer","scores":[{"name":"Scroll-stopping thumbnail","score":0-100,"verdict":"..."},{"name":"Product clarity & fill","score":0-100,"verdict":"..."},{"name":"Background & distraction","score":0-100,"verdict":"..."},{"name":"Lighting & color","score":0-100,"verdict":"..."},{"name":"Mobile legibility","score":0-100,"verdict":"..."}],"topFix":"the single highest-impact change"}`,
          prompt: "Audit this Etsy listing's primary photo.",
          imageBase64: img.imageBase64,
          mediaType: img.mediaType,
          maxTokens: 700
        });
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        data = { available: true, ...(jsonMatch ? JSON.parse(jsonMatch[0]) : { firstImpression: raw.slice(0, 300), scores: [], topFix: "" }) };
        break;
      }
      case "review-summary": {
        if (!p.description) return bad("No reviews to summarize.");
        if (ai) {
          const summary = await llm({
            system: "You summarize Etsy shop reviews for the SELLER. In 4-6 sentences: what buyers consistently praise, what they complain about, and the one operational fix with the highest payoff. Concrete, no fluff, no bullet points.",
            messages: [{ role: "user", content: p.description.slice(0, 6000) }],
            maxTokens: 400
          });
          data = { summary };
        } else {
          data = { summary: fallbackReviewSummary(p.description) };
        }
        break;
      }
      case "ai-visibility": {
        if (!p.title && !p.description) return bad("Paste at least the listing's title and description.");
        const base = scoreAiVisibility({ title: p.title, description: p.description, tags: p.tags });
        data = ai
          ? {
              ...base,
              agentVerdict: await llm({
                system: "You are an AI shopping agent (like the ones inside ChatGPT/Gemini that surface Etsy listings). Assess honestly, in 4-6 sentences, whether you would surface this listing for gift-intent prompts, what facts you could quote to a buyer, and the single highest-impact fix. Speak in first person as the agent.",
                messages: [{ role: "user", content: `Title: ${p.title}\nTags: ${p.tags.join(", ")}\nDescription:\n${p.description.slice(0, 2500)}` }],
                maxTokens: 400
              })
            }
          : base;
        break;
      }
      case "video-script": {
        if (!p.product && !p.keyword) return bad("Give me the product first.");
        data = ai
          ? await llmJson({
              system: SYSTEM,
              prompt: `15-second Etsy listing video script for "${p.product}" (keyword "${p.keyword || p.product}"). JSON: {"hook": string, "scenes": [{"seconds": string, "shot": string, "overlay": string}] (5 scenes), "caption": string, "tip": string}. Remember: muted autoplay.`
            })
          : await fallbackVideoScript(p.product, p.keyword, p.loc);
        break;
      }
    }

    const after = await consumeQuota(user, p.task);
    if (user) {
      await prisma.search.create({
        data: { userId: user.id, tool: `ai:${p.task}`, query: (p.product || p.keyword || p.title || p.prompt).slice(0, 120), location: p.loc }
      }).catch(() => {});
    }
    await prisma.analysisCache.create({
      data: { contentHash, task: p.task, resultJson: JSON.stringify(data), ai }
    }).catch(() => {}); // unique collision on a race is fine
    return NextResponse.json({ data, ai, cached: false, quota: quotaJson(after) });
  } catch (err) {
    return NextResponse.json({ error: "AI_ERROR", message: err instanceof Error ? err.message : "Generation failed" }, { status: 502 });
  }
}

function bad(message: string) {
  return NextResponse.json({ error: "BAD_REQUEST", message }, { status: 400 });
}
