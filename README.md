# RankForge — Etsy SEO toolkit (v2.8)

Full-stack Etsy SEO SaaS: 17 tools, accounts, projects, **automatic daily rank tracking**, **"Connect your Etsy shop" OAuth**, AI copywriting with content-hash caching, A+–F listing grades, quotas, and Stripe billing. Next.js 15 (App Router) · TypeScript · Tailwind · Prisma 7 · Better Auth · SQLite (dev) / Postgres (prod).

## Quick start

```bash
npm install
npm run db:push        # creates prisma/dev.db (or: npm run db:init on locked-down networks)
npm run db:seed        # optional: demo@rankforge.app / rankforge123
npm run dev            # http://localhost:3000
```

Everything works immediately: tools run on a deterministic demo dataset (amber "Demo data" badge), AI tools run on the built-in rule engine ("Rule-based" badge), auth/projects/favorites/rank history are fully live on SQLite.

## The two keys that switch it to production mode

**1. Real Etsy data** — create an app at <https://www.etsy.com/developers>, then in `.env`:

```env
ETSY_API_KEY="your-keystring"
MARKETPLACE_PROVIDER="etsy"
```

Restart. Every tool (tags, keywords, shop/listing analysis, rank, trends, best sellers, niches) now queries the Etsy Open API v3 and results show the green "Live Etsy data" badge. Only public-scope endpoints are used — no OAuth dance needed.

**2. Real AI** — paste ONE key in `.env`:

```env
ANTHROPIC_API_KEY="sk-ant-..."   # or OPENAI_API_KEY="sk-..."
```

Restart. Title/Description/Listing Studio/Video/Prompt Improver/Forge AI switch from the rule engine to the model (badge turns violet "AI-generated"). Optional: `LLM_PROVIDER`, `LLM_MODEL`.

## v2.8 — self-contained server deployment

`npm start` now runs the schedulers **in-process** (see `src/instrumentation.ts`): supplier watch sweeps hourly, rank tracking daily, weekly digest weekly — authenticated internally with `CRON_SECRET`. Deploying on a plain VPS is four commands, no crontab and no keys required:

```bash
npm install          # postinstall runs `prisma generate`
npm run db:init      # creates SQLite schema (offline; or db:push with network)
npm run build
npm start            # PORT=3000 by default
```

Ships with `MARKETPLACE_PROVIDER=scrape` → live data from public Etsy pages out of the box. Paste `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` later for real AI, `ETSY_API_KEY` for the official API, `RESEND_API_KEY` for email alerts (in-app notifications work without it). Set `INTERNAL_CRON=0` to hand scheduling back to crontab/Vercel.

## v2.7 — richer public-page extraction (merged from etsy-scraper-pro)

The scrape provider now pulls the fields that make a competitor audit actually useful, straight from Etsy's public pages (no API key):
- **Real competitor tags + materials + styles** off a listing's inline page JS — feed the 2026 grade for real and populate "suggested tags" with the competitor's actual tags instead of estimates.
- **Original price + discount %** (strikethrough detection), **favorites** (listing and shop), and **processing time**.
The standalone Python CLI these were ported from ships in `tools/etsy-scraper-pro/` for bulk/offline harvesting to JSON/CSV.

## v2.6 — Public-page scraping provider (real Etsy data, no API key)

A third data provider sits beside mock and etsy: **`MARKETPLACE_PROVIDER=scrape`** runs every tool on data parsed live from public Etsy pages — the answer to "I want real shop data before/without Etsy API approval."

- **Shop Analyzer** → real name, sales, review count, rating, listing count, "on Etsy since", plus real recent-review text with sentiment (scraped from the shop's reviews page).
- **Listing Analyzer** → real title, price, shop, description, and photos (which feed the 2026 grade and the vision photo audit).
- **Rank Check** → real position by scanning the actual public search results page for the listing id, with the real neighborhood around it.
- Engine (`src/lib/etsy-scrape.ts`): polite token-bucket (1 req/2s default), 60-min page cache, layered parsing (JSON-LD → targeted regex → OpenGraph), and **DataDome/bot-check detection** — a blocked fetch degrades to clearly-labeled estimated data instead of inventing numbers. Fields public pages don't expose (per-keyword search volume, a competitor's exact tags) stay estimated and are badged **"Public-page data"** so the UI never overclaims.
- Route through `SCRAPER_API_TEMPLATE` (same var as Supplier Watch) for production reliability. Honest caveat in the code: this reads public pages only, and Etsy's ToS discourages automated access — run it politely and prefer the official API once you hold a key.

## v2.5 — Supplier Watch (tool #19): 24/7 source-product monitoring

For dropshipping / made-to-order sellers sourcing from AliExpress & co.: add a supplier product URL, and it's monitored hourly. Price moves beyond your ±% threshold, **SOLD OUT**, **REMOVED**, and back-in-stock transitions all produce **in-app notifications** (new bell in the dashboard, `notification` table) and **one batched email per run** (never spam).

**Architecture, honestly explained** (`src/lib/supplier.ts`): AliExpress has no free public product API and runs anti-bot checks, so fetching is layered — (1) the official **AliExpress Affiliate API** if you set `ALIEXPRESS_APP_KEY/SECRET` (signed TOP requests — the truly professional path), (2) any **scraping proxy** via one env var `SCRAPER_API_TEMPLATE` (what commercial monitors run on), (3) **direct fetch** with layered parsers: JSON-LD → OpenGraph → AliExpress `runParams`. A bot-check page is classified "unknown" and never raises a false alarm; 5 consecutive failures flip the watch to "monitoring degraded" with a single notification and a slower retry cadence. Non-AliExpress URLs use the JSON-LD/OG parser, which covers most modern shops. `demo://anything` URLs hit a deterministic mock for demos/tests.

Ops: validate-on-create (a bad URL fails at add time, not at 3am), hourly cron `/api/cron/supplier` with randomized 1.5–3.5s politeness gaps, per-plan limits (3/50/500), manual "Check now" quota-gated per tool, price-history sparklines, pause/resume, CSV export.

## v2.4 — Chrome extension (the EverBee acquisition channel)

`extension/` ships a complete Manifest V3 extension — see `extension/README.md` for the 30-second unpacked install and Web Store packaging notes.

- **On Etsy listing pages**: instant A+–F grade of the title against the 2026 rules, photo-count check, and a "Full audit in RankForge" deep link (`/tools/etsy/listing-analyzer?ref=…` auto-runs). The title analysis is a pure-JS port of `analyzeTitle2026` running **locally** — free, no account, works offline. That's the acquisition hook.
- **On search pages**: page-1 intel (median price, how many top titles are 2026-compliant — "most competitors here still stuff keywords" is an actionable insight nobody else surfaces) plus, with a token, live volume/competition/top-tags for the query.
- **On shop pages**: one-click "Analyze shop in RankForge".
- **Auth**: `rfx_…` Bearer tokens generated in Settings → Chrome extension (stored SHA-256-hashed, rotate/revoke anytime; `api_token` table). CORS-enabled endpoints under `/api/ext/*`; usage counts against the per-tool "extension" quota.
- Defensive DOM parsing with fallback selectors — when Etsy's markup shifts, the panel omits data instead of guessing, and never breaks the page.

## v2.3 — differentiators #2 and #3 + RankHero paid-tier parity

- **Reviews & sentiment** in the Shop Analyzer: 1–5 star distribution bars, a recent-review feed filterable by positive/neutral/negative (star-rating driven, honest), and an **AI review summary** ("what buyers keep saying, what to fix first") with a rule-based theme digest as the no-key fallback. Live data uses Etsy's public `/shops/{id}/reviews` endpoint, failure-safe.
- **AI photo audit** (Listing Analyzer): Etsy's 2026 ranking runs image recognition on the first photo — this audits it with a vision model (Claude or GPT-4o via the new `llmVision` in `src/lib/llm.ts`): scroll-stopping thumbnail, product fill, background, lighting, mobile legibility, plus "the one fix". On live data the listing's photos appear as a click-to-pick strip; any image URL works in demo mode. Without an AI key it says plainly that it can't see pixels — no fake scores.
- **Experiments tracker**: log "changed title / new photos / price drop" against a listing (quick action in Rank Check, `experiment` table + `/api/experiments`). Logged changes appear as **amber dashed markers on the rank sparklines**, so the before/after effect of every edit is visible. No competitor closes this loop.

## v2.2 — retention & activation

- **Email layer** (Resend, env-gated — a logged no-op until `RESEND_API_KEY` is set): rank-drop alerts batched into one email per user per day (fires when a tracked keyword leaves page 1, drops 10+ spots, or exits the top 100), a **Monday weekly digest** with 7-day movement per tracked keyword (`/api/cron/weekly`), and **real password-reset emails** (Better Auth `sendResetPassword` + `/auth/reset-password` page). Per-user toggles in Settings.
- **CSV export everywhere**: tags/materials/styles, keywords, best sellers, trends, niches, shop tag clouds, suggested tags, the rank neighborhood, and tracked keywords — proper escaping + BOM so Excel behaves.
- **Per-tool free tier** (RankHero parity): 3/day **per tool** for free and anonymous users, 300/day per tool on Business — maxing out one tool never locks the others. Cookie + DB quota reworked (`usage_day` now keyed by user+day+tool).
- **Repriced**: Business **$5.99/mo** (was $9.99) — competitive entry against RankHero's Side Hustle tier.
- **Activation**: onboarding checklist on the dashboard (connect shop → first tag search → track a keyword) and **bulk shop audit** — with a connected shop, every listing is graded by the 2026 engine and sorted weakest-first ("start with your 3 weakest listings").

## v2.1 — 2026 algorithm compliance + AI Shopping Visibility

**Etsy's Feb-2026 algorithm rules are now the scoring baseline** (the old "fill 140 characters" meta is penalized by Etsy itself):
- Title analysis rewritten (`analyzeTitle2026` in `src/lib/grades.ts`): under 15 words, mobile-first ~50–90 chars, keyword-stuffing detector (word repeated 3+×), keyword-chain detector, buyer phrase in the first 70 chars. Applied across the Listing Analyzer, Listing Studio optimizer, Title Generator, AI prompts, rule-based fallbacks, and Forge AI's playbooks.
- Profit Calculator flags the **$6 US shipping visibility penalty** and computes the free-shipping-equivalent price.
- AI generation cache keys are versioned (`v2`) — logic changes invalidate stale cached output automatically.

**New tool #18 — AI Visibility Score** (`/tools/etsy/ai-visibility`): scores a listing the way AI shopping agents (ChatGPT / Gemini / Copilot — where Etsy listings are now surfaced and sold) see it: intent clarity, quotable structured facts, answer readiness, natural language, gift-context coverage, plus three simulated buyer prompts with strong/partial/weak match. With an LLM key set, the agent also writes its own first-person verdict.

## v2.0 — what was merged in

From the TagSmith backend (Python) — ported to TypeScript:
- **Connect your Etsy shop** (OAuth 2.0 + PKCE, read-only scopes). Settings → Connect. Unlocks the "My Shop" dashboard card: your own listings *including drafts*, tag-slot warnings, quick audits. Tokens stored AES-256-GCM encrypted (`src/lib/crypto.ts`), refreshed proactively with rotation handling (`src/lib/etsy-oauth.ts`). Register the redirect URI (`/api/etsy/callback`) in your Etsy app.
- **API guardrails** (`src/lib/rate-limit.ts`): token bucket (8 rps) + persistent daily budget (9,500/10,000) with 60%/85% alerts + exponential backoff with jitter. Tiered cache TTLs: 6h public / 1h entities / 10min rank.
- **Daily worker as a cron route** (`/api/cron/daily`, Bearer `CRON_SECRET`): snapshots every tracked keyword and keeps OAuth tokens warm. Pair with the *Track this keyword daily* button in the Rank Checker → sparklines + Δ movement on the dashboard. Plan limits: 2 / 25 / 200 tracked keywords.

From Site-Creator:
- **A+–F letter grades** per section (title 30% / tags 30% / description 25% / images 15%) in the Listing Analyzer — on live data the description length and photo count are real.
- **Content-hash dedup** (`analysis_cache`): identical AI requests are served from cache, cost **zero quota**, and skip the LLM. The hash includes the engine, so adding an AI key later regenerates instead of serving stale rule-based output.

## Honest data notes

- **Search volume** is an estimated proxy (supply count + engagement of top listings, log-blended) — Etsy's API does not expose real search volume; no tool on the market has it. Use volumes to compare keywords, not as absolutes. Competition, prices, tags, shop stats, and rank positions are real API data.
- **Best-seller sales/revenue** are heuristics from public favorites.
- **12-month trend curves** are seasonal models anchored to current data (no history endpoint exists). Real history accumulates in `rank_snapshot` as you use the Rank Checker signed in.

## Billing (optional)

Without Stripe keys the app runs free-tier-only and says so. To enable paid plans: set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BUSINESS`, `STRIPE_PRICE_ENTERPRISE`, and point a webhook at `/api/stripe/webhook` (events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`). Plans map to quotas: FREE 3/day → BUSINESS 300/day → ENTERPRISE unlimited.

## Going to production (Postgres)

1. `npm i @prisma/adapter-pg`
2. `prisma/schema.prisma`: `provider = "postgresql"`
3. `src/lib/db.ts`: swap `PrismaLibSql` for `PrismaPg` (comment shows the line)
4. Set `DATABASE_URL`, run `npm run db:push`

## Scripts

| script | what it does |
|---|---|
| `dev` / `build` / `start` | Next.js |
| `db:push` | sync schema (needs network for Prisma CLI engines) |
| `db:init` | same tables via bundled DDL — zero network |
| `db:seed` | demo account + sample data |

## Architecture map

- `src/lib/providers/` — `MarketplaceProviderFull` interface; `mock.ts` (deterministic PRNG) and `etsy.ts` (Open API v3, cached, rate-limited). Selected in `index.ts` by env.
- `src/lib/llm.ts` — Anthropic/OpenAI wrapper; `src/lib/ai-fallback.ts` — the rule engine.
- `src/app/api/search` — one quota-gated endpoint for all research tools; `api/ai/*` — generation + chat; `api/stripe/*`, `api/favorites`, `api/projects`, `api/me/usage`.
- `src/lib/auth.ts` — Better Auth + Prisma; sessions, plan field; `quota.ts` — cookie (anon) / DB (signed-in) limits.
- Known TODOs: password-reset & verification emails need an email transport (hook in `src/lib/auth.ts`); eBay tools are a roadmap stub; Enterprise "team seats/API" are marketing-page promises, not built.

*Not affiliated with Etsy, Inc. "Etsy" is a trademark of Etsy, Inc.*
