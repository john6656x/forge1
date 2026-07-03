import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, Plan } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LOCATIONS, Location } from "@/lib/providers/types";

function trackLimit(plan: Plan): number {
  switch (plan) {
    case "BUSINESS": return Number(process.env.TRACKED_BUSINESS ?? 25);
    case "ENTERPRISE": return Number(process.env.TRACKED_ENTERPRISE ?? 200);
    default: return Number(process.env.TRACKED_FREE ?? 2);
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const tracked = await prisma.trackedKeyword.findMany({
    where: { userId: user.id, active: true },
    orderBy: { createdAt: "desc" }
  });

  // Attach the last 14 snapshots per tracked pair for sparklines/deltas.
  const withHistory = await Promise.all(
    tracked.map(async (t) => {
      const [snaps, experiments] = await Promise.all([
        prisma.rankSnapshot.findMany({
          where: { userId: user.id, listingRef: t.listingRef, keyword: t.keyword, location: t.location },
          orderBy: { takenAt: "desc" },
          take: 14
        }),
        prisma.experiment.findMany({
          where: { userId: user.id, listingRef: t.listingRef },
          orderBy: { at: "desc" },
          take: 10
        })
      ]);
      return {
        ...t,
        history: snaps.reverse().map((s) => ({ position: s.position, takenAt: s.takenAt })),
        experiments: experiments.map((e) => ({ id: e.id, label: e.label, at: e.at }))
      };
    })
  );

  return NextResponse.json({ tracked: withHistory, limit: trackLimit(user.plan) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED", message: "Sign in to track keywords." }, { status: 401 });

  const parsed = z.object({
    listingRef: z.string().trim().min(1).max(300),
    keyword: z.string().trim().min(1).max(160),
    location: z.enum(LOCATIONS as [Location, ...Location[]]).optional().default("Global")
  }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const count = await prisma.trackedKeyword.count({ where: { userId: user.id, active: true } });
  const limit = trackLimit(user.plan);
  if (count >= limit) {
    return NextResponse.json(
      { error: "TRACK_LIMIT", message: `Your plan tracks up to ${limit} keyword${limit === 1 ? "" : "s"}. Upgrade for more.` },
      { status: 402 }
    );
  }

  const t = await prisma.trackedKeyword.upsert({
    where: {
      userId_listingRef_keyword_location: {
        userId: user.id,
        listingRef: parsed.data.listingRef,
        keyword: parsed.data.keyword,
        location: parsed.data.location
      }
    },
    create: { userId: user.id, ...parsed.data },
    update: { active: true }
  });
  return NextResponse.json({ tracked: t }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  await prisma.trackedKeyword.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ deleted: true });
}
