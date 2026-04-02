import type { Logger } from "pino";

import logger from "./logger";

/**
 * Create a child logger with request ID context
 * 
 * Usage in API routes:
 * ```typescript
 * import { withRequestId } from "@/lib/logger-context";
 * 
 * export async function POST(request: Request) {
 *   const log = withRequestId(request, logger);
 *   log.info("Processing request");
 *   // ...
 *   log.error({ err }, "Request failed");
 * }
 * ```
 * 
 * The request ID is injected by middleware.ts via x-request-id header.
 */
export function withRequestId(request: Request, baseLogger: Logger): Logger {
  const requestId = request.headers.get("x-request-id");
  
  if (!requestId) {
    // No request ID in header, return base logger
    return baseLogger;
  }
  
  // Return child logger with requestId in context
  return baseLogger.child({ requestId });
}

/**
 * Type-safe logger factory for API routes
 * Automatically extracts request ID from headers
 */
export function createApiLogger(request: Request): Logger {
  return withRequestId(request, logger);
}
