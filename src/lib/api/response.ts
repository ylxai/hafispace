import { NextResponse } from "next/server";
import type { z } from "zod";

export type ApiErrorResponse = {
  code: string;
  message: string;
  details?: unknown;
};

/**
 * Safely parse request body JSON.
 * Returns { ok: true, data } atau { ok: false, response } jika body bukan valid JSON.
 */
export async function parseRequestBody(request: Request): Promise<
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse }
> {
  try {
    const data = await request.json();
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json<ApiErrorResponse>(
        { code: "BAD_REQUEST", message: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }
}

/**
 * Parse dan validasi request body dengan Zod schema.
 * Returns { ok: true, data: T } atau { ok: false, response } jika parsing/validasi gagal.
 */
export async function parseAndValidate<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }
> {
  const parseResult = await parseRequestBody(request);
  if (!parseResult.ok) return parseResult;

  const validation = schema.safeParse(parseResult.data);
  if (!validation.success) {
    return {
      ok: false,
      response: validationErrorResponse(validation.error.format()),
    };
  }

  return { ok: true, data: validation.data };
}

/**
 * Return 401 Unauthorized response.
 * Use when user is not authenticated.
 */
export function unauthorizedResponse() {
  return NextResponse.json<ApiErrorResponse>(
    { code: "UNAUTHORIZED", message: "Unauthorized" },
    { status: 401 }
  );
}

/**
 * Return 403 Forbidden response.
 * Use when user is authenticated but not authorized for the resource.
 */
export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json<ApiErrorResponse>(
    { code: "FORBIDDEN", message },
    { status: 403 }
  );
}

/**
 * Return 400 Validation Error response.
 * Use when request body fails validation.
 */
export function validationErrorResponse(details: unknown) {
  return NextResponse.json<ApiErrorResponse>(
    { code: "VALIDATION_ERROR", message: "Invalid request", details },
    { status: 400 }
  );
}

/**
 * Return 404 Not Found response.
 * Use when requested resource doesn't exist.
 */
export function notFoundResponse(message = "Resource not found") {
  return NextResponse.json<ApiErrorResponse>(
    { code: "NOT_FOUND", message },
    { status: 404 }
  );
}

/**
 * Return 500 Internal Server Error response.
 * Use for unexpected server errors.
 */
export function internalErrorResponse(message = "Internal server error") {
  return NextResponse.json<ApiErrorResponse>(
    { code: "INTERNAL_ERROR", message },
    { status: 500 }
  );
}
