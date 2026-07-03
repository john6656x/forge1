import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, Plan } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchSupplierProduct, classifyUrl } from "@/lib/supplier";

function watchLimit(plan: Plan): number {
  switch (plan) {
    case "BUSINESS": return Number(process.env.WATCHED_BUSINESS ?? 50);
    case "ENTERPRISE": return Number(process.env.WATCHED_ENTERPRISE ?? 500);
    default: return Number(process.env.WATCHED_FREE ?? 3);
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const watches = await prisma.watchedProduct.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { snapshots: { orderBy: { takenAt: "desc" }, take: 30 } }
  });
  return NextResponse.json({
    watches: watches.map((w) => ({ ...w, snapshots: [...w.snapshots].reverse() })),
    limit: watchLimit(user.plan)
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED", message: "Sign in to monitor supplier products." }, { status: 401 });

  const parsed = z.object({
    url: z.string().trim().min(8).max(600),
    alertPct: z.number().min(0).max(90).optional().default(1)
  }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST", message: "Give me a product URL." }, { status: 400 });

  const count = await prisma.watchedProduct.count({ where: { userId: user.id } });
  const limit = watchLimit(user.plan);
  if (count >= limit) {
    return NextResponse.json({ error: "WATCH_LIMIT", message: `Your plan monitors up to ${limit} products. Upgrade for more.` }, { status: 402 });
  }

  // Validate by fetching once, right now — a watch that can't fetch on day
  // one should fail loudly at creation, not silently in tonight's cron.
  const { platform, externalId } = classifyUrl(parsed.data.url);
  let first;
  try {
    first = await fetchSupplierProduct(parsed.data.url);
  } catch (err) {
    return NextResponse.json({
      error: "FETCH_FAILED",
      message: `Couldn't read the product right now: ${err instanceof Error ? err.message : "error"} — check the URL, or see the docs for the scraper-proxy / affiliate-API options.`
    }, { status: 422 });
  }

  const watch = await prisma.watchedProduct.create({
    data: {
      userId: user.id,
      url: parsed.data.url,
      platform,
      externalId,
      title: first.title,
      imageUrl: first.imageUrl,
      currency: first.currency,
      lastPrice: first.price,
      lastStock: first.stock,
      alertPct: parsed.data.alertPct,
      checkedAt: new Date(),
      snapshots: { create: { price: first.price, currency: first.currency, stock: first.stock } }
    }
  }).catch((e) => (String(e).includes("Unique") ? "duplicate" as const : Promise.reject(e)));

  if (watch === "duplicate") {
    return NextResponse.json({ error: "DUPLICATE", message: "You're already monitoring this URL." }, { status: 409 });
  }
  return NextResponse.json({ watch, strategy: first.strategy }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = z.object({
    id: z.string(),
    status: z.enum(["active", "paused"]).optional(),
    alertPct: z.number().min(0).max(90).optional()
  }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  const { id, ...data } = parsed.data;
  await prisma.watchedProduct.updateMany({
    where: { id, userId: user.id },
    data: { ...data, ...(data.status === "active" ? { failCount: 0, lastError: null } : {}) }
  });
  return NextResponse.json({ updated: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  await prisma.watchedProduct.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ deleted: true });
}
