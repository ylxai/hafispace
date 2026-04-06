import type { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { BusinessError, handleApiError } from "@/lib/api/error-handler";
import { AuthError } from "@/lib/auth/context";

// Mock logger to prevent noise in test output
vi.mock("@/lib/logger", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Helper to parse NextResponse body
async function parseResponse(response: NextResponse) {
  const body = await response.json();
  return { status: response.status, body };
}

describe("BusinessError", () => {
  it("should create error with required fields", () => {
    const error = new BusinessError("Cannot delete", "HAS_GALLERIES", 400);

    expect(error.message).toBe("Cannot delete");
    expect(error.code).toBe("HAS_GALLERIES");
    expect(error.status).toBe(400);
    expect(error.name).toBe("BusinessError");
    expect(error instanceof Error).toBe(true);
    expect(error instanceof BusinessError).toBe(true);
  });

  it("should default status to 400", () => {
    const error = new BusinessError("Bad request", "BAD_REQUEST");

    expect(error.status).toBe(400);
  });

  it("should support custom status codes", () => {
    const error = new BusinessError("Conflict", "CONFLICT", 409);

    expect(error.status).toBe(409);
  });

  it("should be catchable as Error", () => {
    expect(() => {
      throw new BusinessError("test", "TEST");
    }).toThrow(Error);
  });

  it("should be catchable as BusinessError", () => {
    expect(() => {
      throw new BusinessError("test", "TEST");
    }).toThrow(BusinessError);
  });
});

describe("handleApiError", () => {
  describe("AuthError handling", () => {
    it("should return 401 for AuthError", async () => {
      const error = new AuthError("Authentication required");
      const response = handleApiError(error);
      const { status, body } = await parseResponse(response);

      expect(status).toBe(401);
      expect(body.code).toBe("AUTH_ERROR");
      expect(body.message).toBe("Authentication required");
    });

    it("should return correct status for custom AuthError", async () => {
      const error = new AuthError("Forbidden", "FORBIDDEN", 403);
      const response = handleApiError(error);
      const { status, body } = await parseResponse(response);

      expect(status).toBe(403);
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBe("Forbidden");
    });
  });

  describe("BusinessError handling", () => {
    it("should return 400 for BusinessError by default", async () => {
      const error = new BusinessError("Cannot delete booking with galleries", "HAS_GALLERIES");
      const response = handleApiError(error);
      const { status, body } = await parseResponse(response);

      expect(status).toBe(400);
      expect(body.code).toBe("HAS_GALLERIES");
      expect(body.message).toBe("Cannot delete booking with galleries");
    });

    it("should return 409 for CONFLICT BusinessError", async () => {
      const error = new BusinessError("Cannot delete only account", "CONFLICT", 409);
      const response = handleApiError(error);
      const { status, body } = await parseResponse(response);

      expect(status).toBe(409);
      expect(body.code).toBe("CONFLICT");
    });

    it("should not leak internal error details", async () => {
      const error = new BusinessError("Safe message", "SAFE_CODE", 400);
      const response = handleApiError(error);
      const { body } = await parseResponse(response);

      expect(body.message).toBe("Safe message");
    });
  });

  describe("ValidationError handling", () => {
    it("should return 400 for ValidationError", async () => {
      const error = new Error("Invalid input");
      error.name = "ValidationError";
      const response = handleApiError(error);
      const { status, body } = await parseResponse(response);

      expect(status).toBe(400);
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.message).toBe("Invalid input");
    });
  });

  describe("Generic error handling", () => {
    it("should return 500 for generic Error", async () => {
      const error = new Error("Database connection failed");
      const response = handleApiError(error);
      const { status, body } = await parseResponse(response);

      expect(status).toBe(500);
      expect(body.code).toBe("INTERNAL_ERROR");
      expect(body.message).toBe("Internal server error");
    });

    it("should NOT leak original error message for generic errors", async () => {
      const error = new Error("SELECT * FROM users -- sensitive query");
      const response = handleApiError(error);
      const { body } = await parseResponse(response);

      expect(body.message).not.toContain("SELECT");
      expect(body.message).toBe("Internal server error");
    });

    it("should return 500 for non-Error objects", async () => {
      const response = handleApiError("string error");
      const { status, body } = await parseResponse(response);

      expect(status).toBe(500);
      expect(body.code).toBe("INTERNAL_ERROR");
      expect(body.message).toBe("Internal server error");
    });

    it("should return 500 for null", async () => {
      const response = handleApiError(null);
      const { status } = await parseResponse(response);

      expect(status).toBe(500);
    });

    it("should return 500 for undefined", async () => {
      const response = handleApiError(undefined);
      const { status } = await parseResponse(response);

      expect(status).toBe(500);
    });
  });

  describe("Error priority order", () => {
    it("AuthError should take priority over generic Error", async () => {
      const error = new AuthError("Unauthorized");
      const response = handleApiError(error);
      const { status } = await parseResponse(response);

      expect(status).toBe(401);
    });

    it("BusinessError should take priority over generic Error", async () => {
      const error = new BusinessError("Business rule violated", "RULE", 422);
      const response = handleApiError(error);
      const { status } = await parseResponse(response);

      expect(status).toBe(422);
    });
  });
});
