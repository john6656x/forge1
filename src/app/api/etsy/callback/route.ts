import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { etsyOAuthGet, exchangeCode, SCOPES } from "@/lib/etsy-oauth";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login", req.nextUrl.origin));

  const back = (q: string) => NextResponse.redirect(new URL(`/settings?etsy=${q}`, req.nextUrl.origin));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const pkceRaw = req.cookies.get("rf_pkce")?.value;
  if (!code || !state || !pkceRaw) return back("invalid");

  let pkce: { v: string; s: string };
  try {
    pkce = JSON.parse(pkceRaw);
  } catch {
    return back("invalid");
  }
  if (pkce.s !== state) return back("state-mismatch");

  try {
    const t = await exchangeCode(code, pkce.v);
    const conn = await prisma.etsyConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        etsyUserId: t.etsyUserId,
        accessTokenEnc: encryptSecret(t.accessToken),
        refreshTokenEnc: encryptSecret(t.refreshToken),
        tokenExpiresAt: t.expiresAt,
        scopes: SCOPES.join(" ")
      },
      update: {
        etsyUserId: t.etsyUserId,
        accessTokenEnc: encryptSecret(t.accessToken),
        refreshTokenEnc: encryptSecret(t.refreshToken),
        tokenExpiresAt: t.expiresAt,
        status: "active"
      }
    });

    // Resolve the seller's shop right away so the dashboard can greet it.
    try {
      const shops = await etsyOAuthGet<{ count: number; results: { shop_id: number; shop_name: string }[] }>(
        conn.id,
        `/users/${t.etsyUserId}/shops`
      );
      const shop = shops.results?.[0] ?? (shops as unknown as { shop_id?: number; shop_name?: string });
      if (shop && "shop_id" in shop && shop.shop_id) {
        await prisma.etsyConnection.update({
          where: { id: conn.id },
          data: { shopId: String(shop.shop_id), shopName: shop.shop_name ?? null }
        });
      }
    } catch {
      // Shop lookup is best-effort; the connection itself is stored.
    }

    const res = back("connected");
    res.cookies.delete("rf_pkce");
    return res;
  } catch (err) {
    console.error("[etsy-oauth]", err);
    return back("failed");
  }
}
