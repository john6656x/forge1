import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.notification.count({ where: { userId: user.id, read: false } })
  ]);
  return NextResponse.json({ notifications, unread });
}

/** Mark read: {ids: [...]} or {all: true}. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = z.object({ ids: z.array(z.string()).optional(), all: z.boolean().optional() })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  await prisma.notification.updateMany({
    where: { userId: user.id, ...(parsed.data.all ? {} : { id: { in: parsed.data.ids ?? [] } }) },
    data: { read: true }
  });
  return NextResponse.json({ ok: true });
}
