/**
 * Email transport (Resend, https://resend.com — free tier: 100 emails/day).
 * Env-gated: with no RESEND_API_KEY every send becomes a logged no-op, so the
 * app never breaks without it. Set:
 *   RESEND_API_KEY="re_..."
 *   EMAIL_FROM="RankForge <alerts@yourdomain.com>"   (verified domain in Resend)
 * Used by: password reset (auth.ts), rank-drop alerts (cron/daily),
 * weekly digest (cron/weekly).
 */

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<"sent" | "skipped" | "failed"> {
  if (!emailEnabled()) {
    console.warn(`[email] skipped (no RESEND_API_KEY): "${opts.subject}" → ${opts.to}`);
    return "skipped";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "RankForge <onboarding@resend.dev>",
        to: opts.to,
        subject: opts.subject,
        html: opts.html
      })
    });
    if (!res.ok) {
      console.error(`[email] Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("[email]", err);
    return "failed";
  }
}

/* Minimal, client-safe HTML shell shared by every email. */
export function emailShell(title: string, bodyHtml: string): string {
  const app = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden">
      <tr><td style="background:#273F4F;padding:18px 28px">
        <span style="color:#ffffff;font-size:18px;font-weight:800">🔥 RankForge</span>
      </td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 14px;font-size:20px;color:#0f172a">${title}</h1>
        ${bodyHtml}
        <p style="margin:26px 0 0;font-size:12px;color:#94a3b8">You're receiving this because email notifications are on in your
        <a href="${app}/settings" style="color:#e56425">RankForge settings</a>.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}
