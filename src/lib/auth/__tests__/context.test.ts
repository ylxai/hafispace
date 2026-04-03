import { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import { getToken } from "next-auth/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, getAuthUser, requireAuth } from "../context";

// Mock next-auth/jwt
vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

describe("Auth Context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAuthUser", () => {
    it("should return user if token is valid", async () => {
      const mockToken: JWT = {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      };

      vi.mocked(getToken).mockResolvedValue(mockToken);

      const mockRequest = new NextRequest("http://localhost:3000/api/test");
      const user = await getAuthUser(mockRequest);

      expect(user).toEqual({
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      });
    });

    it("should return null if token is missing", async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const mockRequest = new NextRequest("http://localhost:3000/api/test");
      const user = await getAuthUser(mockRequest);

      expect(user).toBeNull();
    });

    it("should return null if token has no id", async () => {
      vi.mocked(getToken).mockResolvedValue({ name: "Test" });

      const mockRequest = new NextRequest("http://localhost:3000/api/test");
      const user = await getAuthUser(mockRequest);

      expect(user).toBeNull();
    });

    it("should handle null name and email", async () => {
      const mockToken: JWT = {
        id: "user-123",
        name: null,
        email: null,
      };

      vi.mocked(getToken).mockResolvedValue(mockToken);

      const mockRequest = new NextRequest("http://localhost:3000/api/test");
      const user = await getAuthUser(mockRequest);

      expect(user).toEqual({
        id: "user-123",
        name: null,
        email: null,
      });
    });
  });

  describe("requireAuth", () => {
    it("should return user if authenticated", async () => {
      const mockToken: JWT = {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      };

      vi.mocked(getToken).mockResolvedValue(mockToken);

      const mockRequest = new NextRequest("http://localhost:3000/api/test");
      const user = await requireAuth(mockRequest);

      expect(user.id).toBe("user-123");
      expect(user.name).toBe("Test User");
    });

    it("should throw AuthError if not authenticated", async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const mockRequest = new NextRequest("http://localhost:3000/api/test");

      await expect(requireAuth(mockRequest)).rejects.toThrow(AuthError);
      await expect(requireAuth(mockRequest)).rejects.toThrow(
        "Authentication required"
      );
    });

    it("should throw AuthError with correct code and status", async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const mockRequest = new NextRequest("http://localhost:3000/api/test");

      try {
        await requireAuth(mockRequest);
        expect.fail("Should have thrown AuthError");
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        if (error instanceof AuthError) {
          expect(error.code).toBe("UNAUTHORIZED");
          expect(error.status).toBe(401);
        }
      }
    });
  });

  describe("AuthError", () => {
    it("should create error with default values", () => {
      const error = new AuthError("Test error");

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("AUTH_ERROR");
      expect(error.status).toBe(401);
      expect(error.name).toBe("AuthError");
    });

    it("should create error with custom code and status", () => {
      const error = new AuthError("Forbidden", "FORBIDDEN", 403);

      expect(error.message).toBe("Forbidden");
      expect(error.code).toBe("FORBIDDEN");
      expect(error.status).toBe(403);
    });
  });
});
