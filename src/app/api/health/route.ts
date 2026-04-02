import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import logger from "@/lib/logger";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "ok" });
  } catch (error) {
    logger.error({ err: error }, "Health check failed: database is unreachable.");
    return NextResponse.json({ code: "SERVICE_UNAVAILABLE", message: "Database unreachable", status: "error", db: "unreachable" }, { status: 503 });
  }
}
