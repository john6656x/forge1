import { prisma } from "@/lib/db";
import { emailShell, sendEmail } from "@/lib/email";
import { fetchSupplierProduct, SupplierBlockedError, SupplierRemovedError } from "@/lib/supplier";

export interface WatchEvent {
  type: "price_drop" | "price_up" | "sold_out" | "back_in_stock" | "removed" | "watch_error";
  title: string;
  body: string;
}

const MAX_CONSECUTIVE_FAILS = 5;

/**
 * Check a single watch: fetch, diff against last known state, persist a
 * snapshot, and return the events the diff produced. Shared by the hourly
 * cron and the manual "Check now" button so behavior never diverges.
 *
 * Anti-false-positive rules, deliberately conservative:
 *  - a bot-check page = "unknown", produces NO event and no snapshot noise
 *  - "removed" only fires on explicit signals (404/410 or the page saying so)
 *  - price alerts respect the watch's alertPct threshold
 */
export async function checkWatch(watchId: string): Promise<WatchEvent[]> {
  const w = await prisma.watchedProduct.findUniqueOrThrow({ where: { id: watchId } });
  const events: WatchEvent[] = [];
  const name = (w.title ?? w.url).slice(0, 70);

  try {
    const p = await fetchSupplierProduct(w.url);

    // Price diff
    if (p.price !== null && w.lastPrice !== null && w.lastPrice > 0) {
      const pct = ((p.price - w.lastPrice) / w.lastPrice) * 100;
      if (Math.abs(pct) >= w.alertPct) {
        const dir = pct < 0 ? "price_drop" : "price_up";
        events.push({
          type: dir,
          title: `${dir === "price_drop" ? "Price dropped" : "Price increased"}: ${name}`,
          body: `${w.currency} ${w.lastPrice.toFixed(2)} → ${p.currency} ${p.price.toFixed(2)} (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%).`
        });
      }
    }

    // Stock transitions
    if (p.stock === "out_of_stock" && w.lastStock === "in_stock") {
      events.push({ type: "sold_out", title: `SOLD OUT: ${name}`, body: "The supplier listing is out of stock. Pause your linked listings or switch suppliers." });
    }
    if (p.stock === "in_stock" && (w.lastStock === "out_of_stock" || w.lastStock === "removed")) {
      events.push({ type: "back_in_stock", title: `Back in stock: ${name}`, body: "The supplier listing is available again." });
    }

    await prisma.$transaction([
      prisma.productSnapshot.create({
        data: { watchId: w.id, price: p.price, currency: p.currency, stock: p.stock }
      }),
      prisma.watchedProduct.update({
        where: { id: w.id },
        data: {
          title: w.title ?? p.title,
          imageUrl: w.imageUrl ?? p.imageUrl,
          lastPrice: p.price ?? w.lastPrice,
          currency: p.currency,
          lastStock: p.stock === "unknown" ? w.lastStock : p.stock,
          status: "active",
          failCount: 0,
          lastError: null,
          checkedAt: new Date()
        }
      })
    ]);
  } catch (err) {
    if (err instanceof SupplierRemovedError) {
      if (w.lastStock !== "removed") {
        events.push({ type: "removed", title: `REMOVED: ${name}`, body: "The supplier pulled this product from sale. Your linked listings need a new source." });
      }
      await prisma.$transaction([
        prisma.productSnapshot.create({ data: { watchId: w.id, price: null, currency: w.currency, stock: "removed" } }),
        prisma.watchedProduct.update({ where: { id: w.id }, data: { lastStock: "removed", failCount: 0, lastError: null, checkedAt: new Date() } })
      ]);
    } else {
      const blocked = err instanceof SupplierBlockedError;
      const failCount = w.failCount + 1;
      const nowErrored = failCount >= MAX_CONSECUTIVE_FAILS && w.status !== "error";
      if (nowErrored) {
        events.push({
          type: "watch_error",
          title: `Monitoring degraded: ${name}`,
          body: blocked
            ? "The supplier keeps serving bot checks. A SCRAPER_API_TEMPLATE or AliExpress affiliate keys will restore reliable monitoring — see the docs."
            : `${failCount} consecutive check failures: ${err instanceof Error ? err.message.slice(0, 140) : "error"}`
        });
      }
      await prisma.watchedProduct.update({
        where: { id: w.id },
        data: {
          failCount,
          status: failCount >= MAX_CONSECUTIVE_FAILS ? "error" : w.status,
          lastError: err instanceof Error ? err.message.slice(0, 300) : "error",
          checkedAt: new Date()
        }
      }).catch(() => {});
    }
  }

  // Persist in-site notifications for every event.
  for (const e of events) {
    await prisma.notification.create({
      data: { userId: w.userId, type: e.type, title: e.title, body: e.body, url: w.url }
    }).catch(() => {});
  }
  return events;
}

/** One combined email per user per run — never one email per event. */
export async function emailWatchEvents(userId: string, events: WatchEvent[]): Promise<"sent" | "skipped" | "failed" | "muted"> {
  if (events.length === 0) return "muted";
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.emailAlerts) return "muted";
  const rows = events.map((e) => `<tr>
    <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a"><strong>${e.title}</strong><br><span style="color:#475569">${e.body}</span></td>
  </tr>`).join("");
  const critical = events.some((e) => e.type === "sold_out" || e.type === "removed");
  return sendEmail({
    to: u.email,
    subject: `${critical ? "⚠ Supplier alert" : "Supplier update"}: ${events.length} change${events.length === 1 ? "" : "s"} on watched products`,
    html: emailShell("Supplier watch report", `
      <p style="font-size:14px;color:#334155;line-height:1.6">Your monitored supplier products changed:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">${rows}</table>
      <p style="margin:18px 0 0"><a href="${(process.env.BETTER_AUTH_URL ?? "http://localhost:3000")}/tools/etsy/supplier-watch" style="background:#e56425;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:12px;font-weight:700;font-size:14px">Open Supplier Watch</a></p>`)
  });
}
