import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { Location } from "@/lib/providers/types";
import { getValidAccessToken } from "@/lib/etsy-oauth";
import { emailShell, sendEmail } from "@/lib/email";

export const maxDuration = 300;

/**
 * Daily job — RankForge's port of TagSmith's ARQ worker, shaped for Next.js:
 *  1. re-checks every actively tracked keyword and stores a RankSnapshot
 *     (this is what turns the Rank Checker into real rank *tracking*)
 *  2. keeps connected Etsy shops' OAuth tokens warm (refresh rotation)
 *
 * Protected by CRON_SECRET. Schedule it however you deploy:
 *   Vercel (vercel.json): {"crons":[{"path":"/api/cron/daily","schedule":"15 3 * * *"}]}
 *   plain crontab:        15 3 * * * curl -H "authorization: Bearer $CRON_SECRET" https://your.app/api/cron/daily
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Set CRON_SECRET and send it as a Bearer token." }, { status: 401 });
  }

  const provider = getProvider();
  const tracked = await prisma.trackedKeyword.findMany({ where: { active: true }, take: 500 });

  let snapped = 0;
  const errors: string[] = [];
  // Rank-drop alerts, batched one email per user per run (no inbox spam).
  const drops = new Map<string, { keyword: string; from: number | null; to: number | null }[]>();

  for (const t of tracked) {
    try {
      const prev = await prisma.rankSnapshot.findFirst({
        where: { userId: t.userId, listingRef: t.listingRef, keyword: t.keyword, location: t.location },
        orderBy: { takenAt: "desc" }
      });
      const rank = await provider.getRank(t.listingRef, t.keyword, t.location as Location);
      await prisma.rankSnapshot.create({
        data: { userId: t.userId, listingRef: t.listingRef, keyword: t.keyword, location: t.location, position: rank.position }
      });
      snapped += 1;

      // Alert when: fell out of the sampled top-100, left page 1 (≤48 → >48),
      // or dropped 10+ positions.
      const before = prev?.position ?? null;
      const after = rank.position;
      const leftTop = before !== null && after === null;
      const leftPage1 = before !== null && after !== null && before <= 48 && after > 48;
      const bigDrop = before !== null && after !== null && after - before >= 10;
      if (leftTop || leftPage1 || bigDrop) {
        const list = drops.get(t.userId) ?? [];
        list.push({ keyword: t.keyword, from: before, to: after });
        drops.set(t.userId, list);
      }
    } catch (err) {
      errors.push(`${t.keyword}: ${err instanceof Error ? err.message : "error"}`);
      if (errors.length >= 10) break; // budget guard — don't burn the day on failures
    }
  }

  let alertsSent = 0;
  let alertsSkipped = 0;
  for (const [userId, list] of drops) {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u?.emailAlerts) continue;
    const rows = list.map((d) => `<tr>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a"><strong>"${d.keyword}"</strong></td>
      <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#dc2626">${d.from === null ? "—" : `#${d.from}`} → ${d.to === null ? "out of top 100" : `#${d.to}`}</td>
    </tr>`).join("");
    const status = await sendEmail({
      to: u.email,
      subject: `Rank alert: ${list.length} keyword${list.length === 1 ? "" : "s"} dropped`,
      html: emailShell("Some rankings moved against you", `
        <p style="font-size:14px;color:#334155;line-height:1.6">Yesterday's snapshots caught these drops on keywords you track:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">${rows}</table>
        <p style="font-size:14px;color:#334155">Usual causes: a competitor refreshed their listing, seasonality, or a recent edit of yours. The Tag Generator and Listing Analyzer will show what changed in the neighborhood.</p>
        <p style="margin:18px 0 0"><a href="${(process.env.BETTER_AUTH_URL ?? "http://localhost:3000")}/dashboard" style="background:#e56425;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:12px;font-weight:700;font-size:14px">Open the dashboard</a></p>`)
    });
    if (status === "sent") alertsSent += 1;
    else alertsSkipped += 1;
  }

  let refreshed = 0;
  const connections = await prisma.etsyConnection.findMany({ where: { status: "active" } });
  for (const c of connections) {
    try {
      await getValidAccessToken(c.id);
      refreshed += 1;
    } catch {
      await prisma.etsyConnection.update({ where: { id: c.id }, data: { status: "needs-reauth" } }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, source: provider.source, snapshots: snapped, tokensRefreshed: refreshed, alertsSent, alertsSkipped, errors: errors.slice(0, 5) });
}
