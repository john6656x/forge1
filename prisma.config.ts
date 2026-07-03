import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 config. The CLI (db push / migrate / studio) reads the connection
// from here; the runtime client gets its driver adapter in src/lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db"
  }
});
