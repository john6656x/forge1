import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { acquireEtsySlot, withBackoff } from "@/lib/rate-limit";

/**
 * Etsy OAuth 2.0 with PKCE — "Connect your Etsy shop".
 * Ported from TagSmith's etsy_oauth.py. PKCE means no client secret is
 * needed: the same ETSY_API_KEY keystring is the client_id. The user must
 * register the redirect URI (default: {BETTER_AUTH_URL}/api/etsy/callback)
 * in their Etsy app settings.
 *
 * Tokens are stored AES-256-GCM-encrypted (crypto.ts) and refreshed
 * proactively 10 minutes before expiry, handling refresh-token rotation.
 */

const AUTH_URL = "https://www.etsy.com/oauth/connect";
const TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";
export const SCOPES = ["listings_r", "shops_r", "email_r"]; // read-only at MVP

export function redirectUri(): string {
  const base = process.env.ETSY_REDIRECT_URI;
  if (base) return base;
  const app = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return `${app.replace(/\/$/, "")}/api/etsy/callback`;
}

export function generatePkce(): { verifier: string; challenge: string; state: string } {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(24).toString("base64url");
  return { verifier, challenge, state };
}

export function authUrl(challenge: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ETSY_API_KEY ?? "",
    redirect_uri: redirectUri(),
    scope: SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256"
  });
  return `${AUTH_URL}?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

export async function exchangeCode(code: string, verifier: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ETSY_API_KEY ?? "",
      redirect_uri: redirectUri(),
      code,
      code_verifier: verifier
    })
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as TokenResponse;
  // Etsy access tokens are "{user_id}.{token}" — the prefix is the Etsy user id.
  const etsyUserId = data.access_token.split(".")[0] ?? "";
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    etsyUserId
  };
}

async function refreshTokens(refreshToken: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ETSY_API_KEY ?? "",
      refresh_token: refreshToken
    })
  });
  if (!res.ok) throw new Error(`Token refresh failed (${res.status})`);
  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken, // may rotate
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000)
  };
}

/** Decrypted, guaranteed-fresh access token for a stored connection. */
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const conn = await prisma.etsyConnection.findUniqueOrThrow({ where: { id: connectionId } });
  const tenMin = 10 * 60 * 1000;
  if (conn.tokenExpiresAt.getTime() > Date.now() + tenMin) {
    return decryptSecret(conn.accessTokenEnc);
  }
  const fresh = await refreshTokens(decryptSecret(conn.refreshTokenEnc));
  await prisma.etsyConnection.update({
    where: { id: conn.id },
    data: {
      accessTokenEnc: encryptSecret(fresh.accessToken),
      refreshTokenEnc: encryptSecret(fresh.refreshToken),
      tokenExpiresAt: fresh.expiresAt,
      status: "active"
    }
  });
  return fresh.accessToken;
}

/** Authenticated Etsy API GET on behalf of the connected seller. */
export async function etsyOAuthGet<T>(connectionId: string, path: string, params: Record<string, string | number> = {}): Promise<T> {
  const token = await getValidAccessToken(connectionId);
  const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])));
  const url = `https://openapi.etsy.com/v3/application${path}${qs.size ? `?${qs}` : ""}`;
  return withBackoff(async () => {
    await acquireEtsySlot();
    const res = await fetch(url, {
      headers: { "x-api-key": process.env.ETSY_API_KEY ?? "", authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`Etsy API ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as T;
  });
}
