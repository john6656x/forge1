import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { authUrl, generatePkce } from "@/lib/etsy-oauth";

/**
 * Starts the "Connect your Etsy shop" OAuth flow. The PKCE verifier + state
 * travel in a short-lived httpOnly cookie (TagSmith kept them in a process
 * dict — a cookie survives restarts and multiple instances).
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login", req.nextUrl.origin));
  if (!process.env.ETSY_API_KEY) {
    return NextResponse.redirect(new URL("/settings?etsy=missing-key", req.nextUrl.origin));
  }

  const { verifier, challenge, state } = generatePkce();
  const res = NextResponse.redirect(authUrl(challenge, state));
  res.cookies.set("rf_pkce", JSON.stringify({ v: verifier, s: state }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/etsy",
    maxAge: 600
  });
  return res;
}
