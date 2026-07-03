/**
 * Internal scheduler — makes RankForge fully self-contained on any server.
 *
 * Next.js calls register() once when the production server boots. We use it
 * to run the three cron jobs *in-process*, so a plain `npm start` on a VPS
 * gives you working supplier-watch notifications, rank tracking, and weekly
 * digests with ZERO external setup (no crontab, no Vercel crons).
 *
 * The jobs are invoked over localhost HTTP against the existing, tested
 * /api/cron/* routes (same code path as an external scheduler would hit),
 * authenticated with CRON_SECRET.
 *
 * Config (all optional):
 *   INTERNAL_CRON=0                 → disable entirely (use external cron instead)
 *   SUPPLIER_CHECK_INTERVAL_MIN=60  → supplier sweep cadence (min 10)
 *   PORT=3000                       → must match the port `next start` uses
 *
 * External cron still works exactly as documented in .env.example — this is
 * purely additive. If you schedule both, runs are cheap and idempotent.
 */

const BOOT_DELAY_MS = 90_000; // let the server finish booting before the first tick

async function hit(path: string) {
  const port = process.env.PORT ?? "3000";
  const secret = process.env.CRON_SECRET;
  if (!secret) return; // routes would reject anyway; configured in .env
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: { authorization: `Bearer ${secret}` },
      // Supplier sweeps pace themselves 1.5–3.5s per watch; allow long runs.
      signal: AbortSignal.timeout(280_000)
    });
    const body = await res.json().catch(() => ({}));
    console.log(`[internal-cron] ${path} → ${res.status}`, JSON.stringify(body));
  } catch (err) {
    console.warn(`[internal-cron] ${path} failed:`, err instanceof Error ? err.message : err);
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.INTERNAL_CRON === "0") return;
  // Skip in `next dev` — hot reload would stack timers.
  if (process.env.NODE_ENV !== "production") return;

  const g = globalThis as typeof globalThis & { __rfCron?: boolean };
  if (g.__rfCron) return; // double-registration guard
  g.__rfCron = true;

  const supplierEveryMin = Math.max(10, Number(process.env.SUPPLIER_CHECK_INTERVAL_MIN ?? 60));

  console.log(
    `[internal-cron] enabled — supplier watch every ${supplierEveryMin}min, ` +
    `rank tracking daily, digest weekly. Set INTERNAL_CRON=0 to use external cron instead.`
  );

  // Supplier watch (price/stock → notifications + alert emails): hourly by default.
  setTimeout(() => {
    hit("/api/cron/supplier");
    setInterval(() => hit("/api/cron/supplier"), supplierEveryMin * 60_000);
  }, BOOT_DELAY_MS);

  // Daily: rank snapshots for tracked keywords + Etsy OAuth token refresh.
  setTimeout(() => {
    hit("/api/cron/daily");
    setInterval(() => hit("/api/cron/daily"), 24 * 3600_000);
  }, BOOT_DELAY_MS + 30_000);

  // Weekly digest email.
  setTimeout(() => {
    hit("/api/cron/weekly");
    setInterval(() => hit("/api/cron/weekly"), 7 * 24 * 3600_000);
  }, BOOT_DELAY_MS + 60_000);
}
