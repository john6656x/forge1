import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/providers";
import { LOCATIONS, Location } from "@/lib/providers/types";
import { checkQuota, consumeQuota, quotaJson } from "@/lib/quota";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  tool: z.enum(["tags", "keywords", "shop", "listing", "rank", "trends", "best-sellers", "niches"]),
  q: z.string().trim().min(1).max(160).optional().default(""),
  q2: z.string().trim().max(200).optional(), // second input (e.g. keyword for rank)
  loc: z.enum(LOCATIONS as [Location, ...Location[]]).optional().default("Global")
});

/**
 * One research endpoint for every provider-backed tool. One quota gate.
 * Searches are persisted for signed-in users (dashboard history).
 */
export async function GET(req: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST", issues: parsed.error.issues }, { status: 400 });
  }
  const { tool, q, q2, loc } = parsed.data;
  if (tool !== "trends" && !q) {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Query is required." }, { status: 400 });
  }

  const user = await getSessionUser();
  const quota = await checkQuota(user, tool);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "LIMIT_REACHED", message: "Daily search limit reached.", quota: quotaJson(quota) },
      { status: 429 }
    );
  }

  const provider = getProvider();
  try {
    let data: unknown;
    switch (tool) {
      case "tags": data = await provider.getTagReport(q, loc); break;
      case "keywords": data = await provider.getKeywordIdeas(q, loc); break;
      case "shop": data = await provider.getShopReport(q, loc); break;
      case "listing": data = await provider.getListingReport(q, loc); break;
      case "rank": {
        if (!q2) return NextResponse.json({ error: "BAD_REQUEST", message: "Both listing and keyword are required." }, { status: 400 });
        data = await provider.getRank(q, q2, loc);
        // Persist a snapshot so signed-in sellers accumulate real history.
        if (user) {
          const d = data as { position: number | null };
          await prisma.rankSnapshot.create({
            data: { userId: user.id, listingRef: q, keyword: q2, location: loc, position: d.position }
          }).catch(() => {});
        }
        break;
      }
      case "trends": data = await provider.getTrends(loc, q || undefined); break;
      case "best-sellers": data = await provider.getBestSellers(q, loc); break;
      case "niches": data = await provider.getNicheIdeas(q, loc); break;
    }

    const after = await consumeQuota(user, tool);
    if (user) {
      await prisma.search.create({
        data: { userId: user.id, tool, query: q || "(trends)", location: loc }
      }).catch(() => {});
    }

    return NextResponse.json({ data, source: provider.source, quota: quotaJson(after) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Provider error";
    return NextResponse.json({ error: "PROVIDER_ERROR", message }, { status: 502 });
  }
}
