import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Lightweight connection status (no Etsy API calls). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ connected: false, signedIn: false });
  const conn = await prisma.etsyConnection.findUnique({ where: { userId: user.id } });
  return NextResponse.json({
    signedIn: true,
    connected: Boolean(conn),
    shopName: conn?.shopName ?? null,
    status: conn?.status ?? null,
    keyPresent: Boolean(process.env.ETSY_API_KEY)
  });
}
