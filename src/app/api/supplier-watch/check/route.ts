import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkQuota, consumeQuota, quotaJson } from "@/lib/quota";
import { checkWatch } from "@/lib/supplier-events";

/** Manual "Check now" — quota-gated per tool; cron checks stay free. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const owned = await prisma.watchedProduct.findFirst({ where: { id, userId: user.id } });
  if (!owned) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const quota = await checkQuota(user, "supplier-watch");
  if (!quota.allowed) {
    return NextResponse.json({ error: "LIMIT_REACHED", message: "Manual re-checks hit today's per-tool limit — the hourly monitor keeps running regardless." }, { status: 429 });
  }

  const events = await checkWatch(id);
  const after = await consumeQuota(user, "supplier-watch");
  return NextResponse.json({ ok: true, events, quota: quotaJson(after) });
}
