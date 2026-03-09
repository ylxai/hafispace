import { NextResponse } from "next/server";

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

export function unauthorizedResponse() {
  return NextResponse.json<ApiErrorResponse>(
    { code: "UNAUTHORIZED", message: "Unauthorized" },
    { status: 401 }
  );
}

export function validationErrorResponse(details: unknown) {
  return NextResponse.json<ApiErrorResponse>(
    { code: "VALIDATION_ERROR", message: "Invalid request", details },
    { status: 400 }
  );
}

export function notFoundResponse(message = "Resource not found") {
  return NextResponse.json<ApiErrorResponse>(
    { code: "NOT_FOUND", message },
    { status: 404 }
  );
}

export function internalErrorResponse(message = "Internal server error") {
  return NextResponse.json<ApiErrorResponse>(
    { code: "INTERNAL_ERROR", message },
    { status: 500 }
  );
}
