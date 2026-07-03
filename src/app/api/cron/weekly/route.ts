import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emailShell, sendEmail } from "@/lib/email";

export const maxDuration = 300;

/**
 * Weekly digest — the retention engine. One Monday-morning email per user
 * with digest enabled: their tracked keywords with 7-day movement, plus a
 * usage recap. Schedule (same Bearer CRON_SECRET as /api/cron/daily):
 *   Vercel: {"crons":[{"path":"/api/cron/weekly","schedule":"0 6 * * 1"}]}
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const users = await prisma.user.findMany({
    where: { emailDigest: true, trackedKeywords: { some: { active: true } } },
    include: { trackedKeywords: { where: { active: true } } }
  });

  let sent = 0;
  let skipped = 0;
  for (const u of users) {
    const rows: string[] = [];
    for (const t of u.trackedKeywords) {
      const snaps = await prisma.rankSnapshot.findMany({
        where: { userId: u.id, listingRef: t.listingRef, keyword: t.keyword, location: t.location, takenAt: { gte: weekAgo } },
        orderBy: { takenAt: "asc" }
      });
      const first = snaps.find((s) => s.position !== null)?.position ?? null;
      const last = [...snaps].reverse().find((s) => s.position !== null)?.position ?? null;
      const delta = first !== null && last !== null ? first - last : null; // positive = climbed
      const trend =
        delta === null ? `<span style="color:#94a3b8">collecting…</span>`
        : delta > 0 ? `<span style="color:#16a34a;font-weight:700">▲ +${delta}</span>`
        : delta < 0 ? `<span style="color:#dc2626;font-weight:700">▼ ${delta}</span>`
        : `<span style="color:#94a3b8">→ 0</span>`;
      rows.push(`<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a">"${t.keyword}" <span style="color:#94a3b8">· ${t.location}</span></td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:14px">${last === null ? "not in top 100" : `#${last}`}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:14px">${trend}</td>
      </tr>`);
    }
    if (rows.length === 0) continue;

    const status = await sendEmail({
      to: u.email,
      subject: "Your week on Etsy — rank movement inside",
      html: emailShell(`Weekly rank report`, `
        <p style="font-size:14px;color:#334155;line-height:1.6">Hi ${u.name.split(" ")[0] || "there"} — here's how your tracked keywords moved over the last 7 days:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">
          <tr>
            <th align="left" style="padding:8px 10px;font-size:11px;color:#94a3b8;text-transform:uppercase">Keyword</th>
            <th align="left" style="padding:8px 10px;font-size:11px;color:#94a3b8;text-transform:uppercase">Position</th>
            <th align="left" style="padding:8px 10px;font-size:11px;color:#94a3b8;text-transform:uppercase">7-day</th>
          </tr>
          ${rows.join("")}
        </table>
        <p style="margin:18px 0 0"><a href="${(process.env.BETTER_AUTH_URL ?? "http://localhost:3000")}/dashboard" style="background:#e56425;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:12px;font-weight:700;font-size:14px">See the full charts</a></p>`)
    });
    if (status === "sent") sent += 1;
    else skipped += 1;
  }

  return NextResponse.json({ ok: true, digests: users.length, sent, skipped });
}
