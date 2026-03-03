import { NextResponse } from "next/server";

export type ApiErrorResponse = {
  code: string;
  message: string;
  details?: unknown;
};

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
