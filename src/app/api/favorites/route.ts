import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const postSchema = z.object({
  kind: z.enum(["tag", "keyword", "listing", "shop"]),
  value: z.string().trim().min(1).max(200),
  meta: z.record(z.string(), z.unknown()).optional()
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return NextResponse.json({
    favorites: favorites.map((f) => ({ ...f, meta: f.meta ? JSON.parse(f.meta) : null }))
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED", message: "Sign in to save favorites." }, { status: 401 });
  const parsed = postSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  const { kind, value, meta } = parsed.data;

  const existing = await prisma.favorite.findUnique({
    where: { userId_kind_value: { userId: user.id, kind, value } }
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ toggled: "removed" });
  }
  await prisma.favorite.create({
    data: { userId: user.id, kind, value, meta: meta ? JSON.stringify(meta) : null }
  });
  return NextResponse.json({ toggled: "added" });
}
