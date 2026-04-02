import { NextResponse } from "next/server";

import type { ApiErrorResponse } from "@/lib/api/response";
import { AuthError } from "@/lib/auth/context";

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
  
  // Validation errors (400) - could add custom ValidationError class
  if (error instanceof Error && error.name === "ValidationError") {
    return NextResponse.json<ApiErrorResponse>(
      { 
        code: "VALIDATION_ERROR", 
        message: error.message 
      },
      { status: 400 }
    );
  }
  
  // Generic errors (500)
  return NextResponse.json<ApiErrorResponse>(
    { 
      code: "INTERNAL_ERROR", 
      message: error instanceof Error ? error.message : "Internal server error"
    },
    { status: 500 }
  );
}
