import { PrismaClient } from "@prisma/client";

// Validate all critical env variables when this module is first imported
import { env } from "@/lib/env";

declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Prisma singleton with connection pool tuned per environment.
 * Connection limit is set via DATABASE_URL query param:
 *   ?connection_limit=10 (production) or ?connection_limit=5 (development)
 * Falls back to Prisma default if not set in DATABASE_URL.
 */
function createPrismaClient() {
  const url = new URL(env.DATABASE_URL);
  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set(
      "connection_limit",
      process.env.NODE_ENV === "production" ? "10" : "5"
    );
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: { db: { url: url.toString() } },
  });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
