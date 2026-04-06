import { describe, expect, it } from "vitest";

import { createPaginationResponse, parsePaginationParams } from "@/lib/api/pagination";

describe("parsePaginationParams", () => {
  function makeParams(params: Record<string, string>) {
    return new URLSearchParams(params);
  }

  describe("page parsing", () => {
    it("should default page to 1 when not provided", () => {
      const { page } = parsePaginationParams(makeParams({}));
      expect(page).toBe(1);
    });

    it("should parse valid page number", () => {
      const { page } = parsePaginationParams(makeParams({ page: "5" }));
      expect(page).toBe(5);
    });

    it("should clamp page to minimum 1 for zero", () => {
      const { page } = parsePaginationParams(makeParams({ page: "0" }));
      expect(page).toBe(1);
    });

    it("should clamp page to minimum 1 for negative", () => {
      const { page } = parsePaginationParams(makeParams({ page: "-5" }));
      expect(page).toBe(1);
    });

    it("should fallback to 1 for non-numeric page", () => {
      const { page } = parsePaginationParams(makeParams({ page: "abc" }));
      expect(page).toBe(1);
    });

    it("should fallback to 1 for empty page", () => {
      const { page } = parsePaginationParams(makeParams({ page: "" }));
      expect(page).toBe(1);
    });
  });

  describe("limit parsing", () => {
    it("should default limit to 20 when not provided", () => {
      const { limit } = parsePaginationParams(makeParams({}));
      expect(limit).toBe(20);
    });

    it("should parse valid limit", () => {
      const { limit } = parsePaginationParams(makeParams({ limit: "50" }));
      expect(limit).toBe(50);
    });

    it("should clamp limit to maximum 100", () => {
      const { limit } = parsePaginationParams(makeParams({ limit: "999" }));
      expect(limit).toBe(100);
    });

    it("should clamp limit to minimum 1 for zero", () => {
      const { limit } = parsePaginationParams(makeParams({ limit: "0" }));
      expect(limit).toBe(1);
    });

    it("should clamp limit to minimum 1 for negative", () => {
      const { limit } = parsePaginationParams(makeParams({ limit: "-10" }));
      expect(limit).toBe(1);
    });

    it("should fallback to 20 for non-numeric limit", () => {
      const { limit } = parsePaginationParams(makeParams({ limit: "xyz" }));
      expect(limit).toBe(20);
    });
  });

  describe("skip calculation", () => {
    it("should calculate skip correctly for page 1", () => {
      const { skip } = parsePaginationParams(makeParams({ page: "1", limit: "20" }));
      expect(skip).toBe(0);
    });

    it("should calculate skip correctly for page 2", () => {
      const { skip } = parsePaginationParams(makeParams({ page: "2", limit: "20" }));
      expect(skip).toBe(20);
    });

    it("should calculate skip correctly for page 3 with limit 10", () => {
      const { skip } = parsePaginationParams(makeParams({ page: "3", limit: "10" }));
      expect(skip).toBe(20);
    });

    it("should have skip 0 for default params", () => {
      const { skip } = parsePaginationParams(makeParams({}));
      expect(skip).toBe(0);
    });
  });

  describe("combined", () => {
    it("should return correct page, limit, skip for valid params", () => {
      const result = parsePaginationParams(makeParams({ page: "3", limit: "15" }));
      expect(result).toEqual({ page: 3, limit: 15, skip: 30 });
    });
  });
});

describe("createPaginationResponse", () => {
  it("should calculate totalPages correctly", () => {
    const result = createPaginationResponse(1, 20, 100);
    expect(result.totalPages).toBe(5);
  });

  it("should round up totalPages for partial page", () => {
    const result = createPaginationResponse(1, 20, 101);
    expect(result.totalPages).toBe(6);
  });

  it("should return 0 totalPages for 0 total", () => {
    const result = createPaginationResponse(1, 20, 0);
    expect(result.totalPages).toBe(0);
  });

  it("should return 1 totalPages when total equals limit", () => {
    const result = createPaginationResponse(1, 20, 20);
    expect(result.totalPages).toBe(1);
  });

  it("should include all required fields", () => {
    const result = createPaginationResponse(2, 10, 50);
    expect(result).toEqual({ page: 2, limit: 10, total: 50, totalPages: 5 });
  });
});
