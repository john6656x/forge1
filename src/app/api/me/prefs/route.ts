import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const u = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { emailAlerts: true, emailDigest: true } });
  return NextResponse.json(u);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = z.object({ emailAlerts: z.boolean().optional(), emailDigest: z.boolean().optional() }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  const u = await prisma.user.update({ where: { id: user.id }, data: parsed.data, select: { emailAlerts: true, emailDigest: true } });
  return NextResponse.json(u);
}
