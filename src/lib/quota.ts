import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getSessionUser, Plan, SessionUser } from "@/lib/auth";

const COOKIE = "rf_usage";

export interface QuotaState {
  used: number;
  limit: number; // Infinity serialized as -1 in API responses
  remaining: number;
  allowed: boolean;
  plan: Plan | "ANONYMOUS";
  tool: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * RankHero-style PER-TOOL quotas: FREE (and anonymous) gets 3 uses per tool
 * per day, BUSINESS 300 per tool, ENTERPRISE unlimited. Hitting the limit on
 * the Tag Generator doesn't lock you out of the Rank Checker.
 */
export function planLimit(plan: Plan | "ANONYMOUS"): number {
  switch (plan) {
    case "BUSINESS": return Number(process.env.BUSINESS_DAILY_SEARCHES ?? 300);
    case "ENTERPRISE": return Infinity;
    default: return Number(process.env.FREE_DAILY_SEARCHES ?? 3);
  }
}

type CookieShape = { d: string; tools: Record<string, number> };

async function cookieState(): Promise<CookieShape> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return { d: today(), tools: {} };
  try {
    const parsed = JSON.parse(raw) as CookieShape & { c?: number };
    if (parsed.d !== today()) return { d: today(), tools: {} };
    // migrate the old {d,c} single-counter shape gracefully
    if (typeof parsed.c === "number" && !parsed.tools) return { d: parsed.d, tools: { all: parsed.c } };
    return { d: parsed.d, tools: parsed.tools ?? {} };
  } catch {
    return { d: today(), tools: {} };
  }
}

async function dbUsed(userId: string, tool: string): Promise<number> {
  const row = await prisma.usageDay.findUnique({
    where: { userId_day_tool: { userId, day: today(), tool } }
  });
  return row?.searches ?? 0;
}

function state(used: number, plan: Plan | "ANONYMOUS", tool: string): QuotaState {
  const limit = planLimit(plan);
  return {
    used,
    limit,
    remaining: limit === Infinity ? Infinity : Math.max(0, limit - used),
    allowed: used < limit,
    plan,
    tool
  };
}

export async function checkQuota(user?: SessionUser | null, tool = "all"): Promise<QuotaState> {
  const u = user === undefined ? await getSessionUser() : user;
  if (u) return state(await dbUsed(u.id, tool), u.plan, tool);
  const c = await cookieState();
  return state(c.tools[tool] ?? 0, "ANONYMOUS", tool);
}

export async function consumeQuota(user?: SessionUser | null, tool = "all"): Promise<QuotaState> {
  const u = user === undefined ? await getSessionUser() : user;

  if (u) {
    const current = await checkQuota(u, tool);
    if (!current.allowed) return current;
    const row = await prisma.usageDay.upsert({
      where: { userId_day_tool: { userId: u.id, day: today(), tool } },
      create: { userId: u.id, day: today(), tool, searches: 1 },
      update: { searches: { increment: 1 } }
    });
    return state(row.searches, u.plan, tool);
  }

  const current = await checkQuota(null, tool);
  if (!current.allowed) return current;
  const c = await cookieState();
  c.tools[tool] = (c.tools[tool] ?? 0) + 1;
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify(c), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24
  });
  return state(c.tools[tool], "ANONYMOUS", tool);
}

/** Total uses today across every tool (dashboard aggregate). */
export async function totalUsedToday(userId: string): Promise<number> {
  const agg = await prisma.usageDay.aggregate({
    where: { userId, day: today() },
    _sum: { searches: true }
  });
  return agg._sum.searches ?? 0;
}

/** JSON-safe copy (Infinity → -1). */
export function quotaJson(q: QuotaState) {
  return {
    ...q,
    limit: q.limit === Infinity ? -1 : q.limit,
    remaining: q.remaining === Infinity ? -1 : q.remaining
  };
}
