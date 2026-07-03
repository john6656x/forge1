import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

/**
 * Prisma 7 "Rust-free" client over a driver adapter.
 * - Dev default: SQLite via libsql ("file:./prisma/dev.db") — zero setup.
 * - Production Postgres: `npm i @prisma/adapter-pg pg`, switch the datasource
 *   provider in prisma/schema.prisma to "postgresql", and swap the adapter
 *   below for `new PrismaPg({ connectionString: process.env.DATABASE_URL })`.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
