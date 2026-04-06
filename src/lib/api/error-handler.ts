import { NextResponse } from "next/server";

import type { ApiErrorResponse } from "@/lib/api/response";
import { AuthError } from "@/lib/auth/context";
import logger from "@/lib/logger";

/**
 * Business logic error for domain-specific errors that need specific HTTP status codes.
 * Use this for errors like "cannot delete because has dependencies", "quota exceeded", etc.
 *
 * Consistent with AuthError — both extend Error and are handled by handleApiError.
 *
 * @example
 * throw new BusinessError("Cannot delete booking with galleries", "HAS_GALLERIES", 400);
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400
  ) {
    super(message);
    this.name = "BusinessError";
  }
}

/**
 * Central error handler for API routes.
 * Converts different error types to consistent API responses.
 * 
 * @param error - Any error thrown in API route
 * @returns NextResponse with appropriate status and error body
 */
export function handleApiError(error: unknown): NextResponse {
  // Auth errors (401)
  if (error instanceof AuthError) {
    return NextResponse.json<ApiErrorResponse>(
      { 
        code: error.code, 
        message: error.message 
      },
      { status: error.status }
    );
  }

  // Business logic errors (4xx) — domain-specific errors with known status codes
  if (error instanceof BusinessError) {
    return NextResponse.json<ApiErrorResponse>(
      {
        code: error.code,
        message: error.message,
      },
      { status: error.status }
    );
  }
  
  // Validation errors (400)
  if (error instanceof Error && error.name === "ValidationError") {
    return NextResponse.json<ApiErrorResponse>(
      { 
        code: "VALIDATION_ERROR", 
        message: error.message 
      },
      { status: 400 }
    );
  }
  
  // Generic errors (500) - log and return safe message
  logger.error({ err: error }, "Unhandled API error");
  
  return NextResponse.json<ApiErrorResponse>(
    { 
      code: "INTERNAL_ERROR", 
      message: "Internal server error" // Don't leak error details
    },
    { status: 500 }
  );
}
