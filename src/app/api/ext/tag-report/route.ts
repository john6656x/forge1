import { NextRequest, NextResponse } from "next/server";
import { extCors, getExtUser } from "@/lib/ext-auth";
import { consumeQuota, checkQuota } from "@/lib/quota";
import { getProvider } from "@/lib/providers";
import { LOCATIONS, Location } from "@/lib/providers/types";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { headers: extCors(req.headers.get("origin")) });
}

/**
 * Compact keyword intel for the on-Etsy overlay: volume, competition, and the
 * top tag candidates for whatever the person just searched on Etsy. Counts
 * against the "extension" per-tool quota.
 */
export async function GET(req: NextRequest) {
  const headers = extCors(req.headers.get("origin"));
  const user = await getExtUser(req);
  if (!user) return NextResponse.json({ error: "INVALID_TOKEN", message: "Generate a token in RankForge → Settings." }, { status: 401, headers });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  const locRaw = req.nextUrl.searchParams.get("loc") ?? "Global";
  const loc = (LOCATIONS as readonly string[]).includes(locRaw) ? (locRaw as Location) : "Global";
  if (!q) return NextResponse.json({ error: "BAD_REQUEST", message: "Missing q." }, { status: 400, headers });

  const sessionish = { ...user, name: "" } as never;
  const quota = await checkQuota(sessionish, "extension");
  if (!quota.allowed) {
    return NextResponse.json({ error: "LIMIT_REACHED", message: "Extension quota used for today — upgrade in RankForge for more." }, { status: 429, headers });
  }

  try {
    const report = await getProvider().getTagReport(q, loc);
    await consumeQuota(sessionish, "extension");
    return NextResponse.json({
      keyword: report.keyword,
      location: report.location,
      volume: report.volume,
      competition: report.competition,
      source: getProvider().source,
      topTags: report.tags.slice(0, 8).map((t) => ({ name: t.name, volume: t.volume, competition: t.competition })),
      priceBands: report.priceBands
    }, { headers });
  } catch (err) {
    return NextResponse.json({ error: "PROVIDER_ERROR", message: err instanceof Error ? err.message : "error" }, { status: 502, headers });
  }
}
