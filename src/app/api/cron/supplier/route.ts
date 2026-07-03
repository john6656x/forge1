import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkWatch, emailWatchEvents, WatchEvent } from "@/lib/supplier-events";

export const maxDuration = 300;

/**
 * Supplier monitor — schedule HOURLY:
 *   Vercel: {"crons":[{"path":"/api/cron/supplier","schedule":"0 * * * *"}]}
 *   crontab: 0 * * * * curl -H "authorization: Bearer $CRON_SECRET" https://your.app/api/cron/supplier
 *
 * Politeness built in: watches are processed with a randomized 1.5–3.5s gap
 * so the target site never sees a burst, and error'd watches back off.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const watches = await prisma.watchedProduct.findMany({
    where: { status: { in: ["active", "error"] } },
    orderBy: { checkedAt: "asc" },
    take: 300
  });

  const perUser = new Map<string, WatchEvent[]>();
  let checked = 0;
  const delayMs = () => 1500 + Math.random() * 2000;

  for (const w of watches) {
    // Errored watches retry at a slower cadence: only if last check is >6h old.
    if (w.status === "error" && w.checkedAt && Date.now() - w.checkedAt.getTime() < 6 * 3600 * 1000) continue;
    const events = await checkWatch(w.id);
    checked += 1;
    if (events.length) perUser.set(w.userId, [...(perUser.get(w.userId) ?? []), ...events]);
    if (w.platform !== "demo") await new Promise((r) => setTimeout(r, delayMs()));
  }

  let emailsSent = 0;
  let emailsSkipped = 0;
  for (const [userId, events] of perUser) {
    const status = await emailWatchEvents(userId, events);
    if (status === "sent") emailsSent += 1;
    else if (status !== "muted") emailsSkipped += 1;
  }

  const totalEvents = [...perUser.values()].reduce((s, e) => s + e.length, 0);
  return NextResponse.json({ ok: true, checked, events: totalEvents, emailsSent, emailsSkipped });
}
