import { prisma } from "@/lib/db";

/**
 * Etsy API guardrails, ported from TagSmith's Redis token bucket:
 *  - in-process token bucket (ETSY_RATE_LIMIT_RPS, default 8 rps, Etsy allows 10)
 *  - persistent DAILY budget in the api_budget table (ETSY_DAILY_BUDGET,
 *    default 9500 of Etsy's 10k) with 60%/85% console alerts
 *  - exponential backoff with jitter for 429s (see withBackoff)
 *
 * The bucket is per-process; the budget is global (DB). If you scale to many
 * instances, move the bucket to Redis — the acquire() contract stays the same.
 */

const rate = Number(process.env.ETSY_RATE_LIMIT_RPS ?? 8);
const capacity = rate;
let tokens = capacity;
let last = Date.now();

async function acquireLocal(): Promise<void> {
  for (;;) {
    const now = Date.now();
    tokens = Math.min(capacity, tokens + ((now - last) / 1000) * rate);
    last = now;
    if (tokens >= 1) {
      tokens -= 1;
      return;
    }
    await new Promise((r) => setTimeout(r, Math.ceil(((1 - tokens) / rate) * 1000)));
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function consumeDailyBudget(): Promise<void> {
  const budget = Number(process.env.ETSY_DAILY_BUDGET ?? 9500);
  const row = await prisma.apiBudget.upsert({
    where: { day: today() },
    create: { day: today(), count: 1 },
    update: { count: { increment: 1 } }
  }).catch(() => null);
  if (!row) return; // budget tracking must never take the API down

  const ratio = row.count / budget;
  if (row.count > budget) {
    throw new Error(`Etsy daily API budget exhausted (${row.count}/${budget}). Resets at midnight UTC.`);
  }
  if (ratio >= 0.85) console.warn(`[etsy-budget] CRITICAL: ${row.count}/${budget} (${Math.round(ratio * 100)}%)`);
  else if (ratio >= 0.6) console.warn(`[etsy-budget] warning: ${row.count}/${budget} (${Math.round(ratio * 100)}%)`);
}

/** Call before every real Etsy API request. */
export async function acquireEtsySlot(): Promise<void> {
  await acquireLocal();
  await consumeDailyBudget();
}

/** Retry helper: exponential backoff + jitter, for 429/5xx-style failures. */
export async function withBackoff<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const retriable = msg.includes("429") || msg.includes("502") || msg.includes("503");
      if (!retriable || attempt >= retries) throw err;
      const backoff = Math.pow(2, attempt + 1) * 500 + Math.random() * 400;
      await new Promise((r) => setTimeout(r, backoff));
      attempt += 1;
    }
  }
}
