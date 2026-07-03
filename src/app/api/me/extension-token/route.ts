import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sha256hex } from "@/lib/crypto";

/** Generate (or rotate) the Chrome-extension token. Shown once, stored hashed. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const token = `rfx_${randomBytes(24).toString("base64url")}`;
  await prisma.apiToken.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tokenHash: sha256hex(token) },
    update: { tokenHash: sha256hex(token), createdAt: new Date(), lastUsedAt: null }
  });
  return NextResponse.json({ token });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const row = await prisma.apiToken.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ exists: Boolean(row), createdAt: row?.createdAt ?? null, lastUsedAt: row?.lastUsedAt ?? null });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  await prisma.apiToken.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ revoked: true });
}
