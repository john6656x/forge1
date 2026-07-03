import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Experiments tracker — a change log per listing. Every tool tells sellers
 * WHAT to change; the markers these entries put on the rank charts show
 * whether the change WORKED. Nobody in the market does this well.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const listingRef = req.nextUrl.searchParams.get("listingRef");
  const experiments = await prisma.experiment.findMany({
    where: { userId: user.id, ...(listingRef ? { listingRef } : {}) },
    orderBy: { at: "desc" },
    take: 100
  });
  return NextResponse.json({ experiments });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED", message: "Sign in to log changes." }, { status: 401 });
  const parsed = z.object({
    listingRef: z.string().trim().min(1).max(300),
    label: z.string().trim().min(1).max(80),
    note: z.string().trim().max(400).optional()
  }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  const experiment = await prisma.experiment.create({ data: { userId: user.id, ...parsed.data } });
  return NextResponse.json({ experiment }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  await prisma.experiment.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ deleted: true });
}
