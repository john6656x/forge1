// Offline DB bootstrap — identical to `prisma db push` for the schema in
// prisma/schema.prisma, but with hand-written DDL so it runs with zero
// network access. Prefer `npm run db:push` when Prisma can download its CLI
// engines; use `npm run db:init` anywhere that can't.
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const db = createClient({ url });

const ddl = [
  `CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT 0,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "emailAlerts" BOOLEAN NOT NULL DEFAULT 1,
    "emailDigest" BOOLEAN NOT NULL DEFAULT 1
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "user_email_key" ON "user"("email")`,
  `CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "session_token_key" ON "session"("token")`,
  `CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("userId")`,
  `CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "account_providerId_accountId_key" ON "account"("providerId","accountId")`,
  `CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account"("userId")`,
  `CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME,
    "updatedAt" DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS "usage_day" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "day" TEXT NOT NULL,
    "tool" TEXT NOT NULL DEFAULT 'all',
    "searches" INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "usage_day_userId_day_tool_key" ON "usage_day"("userId","day","tool")`,
  `CREATE TABLE IF NOT EXISTS "subscription" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "subscription_stripeSubscriptionId_key" ON "subscription"("stripeSubscriptionId")`,
  `CREATE INDEX IF NOT EXISTS "subscription_userId_idx" ON "subscription"("userId")`,
  `CREATE TABLE IF NOT EXISTS "search" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "tool" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "search_userId_createdAt_idx" ON "search"("userId","createdAt")`,
  `CREATE TABLE IF NOT EXISTS "favorite" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "favorite_userId_kind_value_key" ON "favorite"("userId","kind","value")`,
  `CREATE TABLE IF NOT EXISTS "project" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "project_userId_idx" ON "project"("userId")`,
  `CREATE TABLE IF NOT EXISTS "project_item" (
    "id" TEXT PRIMARY KEY,
    "projectId" TEXT NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "project_item_projectId_idx" ON "project_item"("projectId")`,
  `CREATE TABLE IF NOT EXISTS "rank_snapshot" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "listingRef" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "position" INTEGER,
    "takenAt" DATETIME NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "rank_snapshot_lookup_idx" ON "rank_snapshot"("userId","listingRef","keyword","takenAt")`
];

for (const stmt of ddl) await db.execute(stmt);
console.log(`DB ready at ${url} (${ddl.length} statements applied).`);
db.close();

// v2.0 tables (script re-run safe: IF NOT EXISTS everywhere)
const ddl2 = [
  `CREATE TABLE IF NOT EXISTS "etsy_connection" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "etsyUserId" TEXT NOT NULL,
    "shopId" TEXT,
    "shopName" TEXT,
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "tokenExpiresAt" DATETIME NOT NULL,
    "scopes" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "etsy_connection_userId_key" ON "etsy_connection"("userId")`,
  `CREATE TABLE IF NOT EXISTS "tracked_keyword" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "listingRef" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Global',
    "active" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "tracked_keyword_unique" ON "tracked_keyword"("userId","listingRef","keyword","location")`,
  `CREATE INDEX IF NOT EXISTS "tracked_keyword_active_idx" ON "tracked_keyword"("active")`,
  `CREATE TABLE IF NOT EXISTS "api_budget" (
    "id" TEXT PRIMARY KEY,
    "day" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "api_budget_day_key" ON "api_budget"("day")`,
  `CREATE TABLE IF NOT EXISTS "analysis_cache" (
    "id" TEXT PRIMARY KEY,
    "contentHash" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL,
    "ai" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "analysis_cache_hash_key" ON "analysis_cache"("contentHash")`
];
const db2 = createClient({ url });
for (const stmt of ddl2) await db2.execute(stmt);
console.log(`v2 tables ready (${ddl2.length} statements).`);
db2.close();

// v2.3 tables
const ddl3 = [
  `CREATE TABLE IF NOT EXISTS "experiment" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "listingRef" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT,
    "at" DATETIME NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "experiment_user_listing_idx" ON "experiment"("userId","listingRef")`
];
const db3 = createClient({ url });
for (const stmt of ddl3) await db3.execute(stmt);
console.log(`v3 tables ready (${ddl3.length} statements).`);
db3.close();

// v2.4 tables
const ddl4 = [
  `CREATE TABLE IF NOT EXISTS "api_token" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "tokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "lastUsedAt" DATETIME
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "api_token_userId_key" ON "api_token"("userId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "api_token_hash_key" ON "api_token"("tokenHash")`
];
const db4 = createClient({ url });
for (const stmt of ddl4) await db4.execute(stmt);
console.log(`v4 tables ready (${ddl4.length} statements).`);
db4.close();

// v2.5 tables
const ddl5 = [
  `CREATE TABLE IF NOT EXISTS "watched_product" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "url" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT,
    "title" TEXT,
    "imageUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lastPrice" REAL,
    "lastStock" TEXT NOT NULL DEFAULT 'unknown',
    "alertPct" REAL NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "checkedAt" DATETIME,
    "createdAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "watched_product_user_url_key" ON "watched_product"("userId","url")`,
  `CREATE INDEX IF NOT EXISTS "watched_product_status_idx" ON "watched_product"("status")`,
  `CREATE TABLE IF NOT EXISTS "product_snapshot" (
    "id" TEXT PRIMARY KEY,
    "watchId" TEXT NOT NULL REFERENCES "watched_product"("id") ON DELETE CASCADE,
    "price" REAL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "stock" TEXT NOT NULL DEFAULT 'unknown',
    "takenAt" DATETIME NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "product_snapshot_watch_idx" ON "product_snapshot"("watchId","takenAt")`,
  `CREATE TABLE IF NOT EXISTS "notification" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "notification_user_read_idx" ON "notification"("userId","read")`
];
const db5 = createClient({ url });
for (const stmt of ddl5) await db5.execute(stmt);
console.log(`v5 tables ready (${ddl5.length} statements).`);
db5.close();
