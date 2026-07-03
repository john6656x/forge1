import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sha256hex } from "@/lib/crypto";
import type { Plan } from "@/lib/auth";

export interface ExtUser {
  id: string;
  email: string;
  plan: Plan;
}

/**
 * Bearer-token auth for the Chrome extension (CORS-friendly — no cookies).
 * The plaintext token lives only in the extension's storage; the DB keeps
 * a SHA-256 hash. Regenerating rotates it instantly.
 */
export async function getExtUser(req: NextRequest): Promise<ExtUser | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !token.startsWith("rfx_")) return null;

  const row = await prisma.apiToken.findUnique({
    where: { tokenHash: sha256hex(token) },
    include: { user: { select: { id: true, email: true, plan: true } } }
  });
  if (!row) return null;

  prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { id: row.user.id, email: row.user.email, plan: row.user.plan as Plan };
}

export function extCors(origin?: string | null): HeadersInit {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type"
  };
}
