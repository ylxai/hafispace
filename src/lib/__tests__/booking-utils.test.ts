import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { generateKodeBooking, generateUniqueKodeBooking } from "@/lib/booking-utils";

describe("generateKodeBooking", () => {
  it("should generate code with correct format BK{YY}{MM}-{RANDOM}", () => {
    const code = generateKodeBooking();
    expect(code).toMatch(/^BK\d{4}-[0-9A-Z]{4}$/);
  });

  it("should generate unique codes (probabilistic — 100 iterations)", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateKodeBooking()));
    // With 1.6M combinations, 100 samples should all be unique
    expect(codes.size).toBe(100);
  });

  it("should use current year (2-digit)", () => {
    const code = generateKodeBooking();
    const year = new Date().getFullYear().toString().slice(-2);
    expect(code.startsWith(`BK${year}`)).toBe(true);
  });

  it("should use current month (2-digit padded)", () => {
    const code = generateKodeBooking();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    // BK{YY}{MM}-{RANDOM} — month is at position 4-5 (0-indexed after "BK")
    expect(code.slice(4, 6)).toBe(month);
  });

  it("should have RANDOM part in uppercase", () => {
    const code = generateKodeBooking();
    const randomPart = code.split("-")[1];
    expect(randomPart).toBe(randomPart?.toUpperCase());
  });

  it("should have RANDOM part of length 4", () => {
    const code = generateKodeBooking();
    const randomPart = code.split("-")[1];
    expect(randomPart).toHaveLength(4);
  });

  it("should have total length of 11 characters (BK2603-A1B2)", () => {
    const code = generateKodeBooking();
    expect(code).toHaveLength(11);
  });
});

describe("generateUniqueKodeBooking", () => {
  it("should return result from checkUnique on first success", async () => {
    const mockCheckUnique = vi.fn().mockResolvedValue({ id: "booking-1" });

    const result = await generateUniqueKodeBooking(mockCheckUnique);

    expect(result).toEqual({ id: "booking-1" });
    expect(mockCheckUnique).toHaveBeenCalledTimes(1);
  });

  it("should retry on P2002 collision and succeed on second attempt", async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint violation",
      { code: "P2002", clientVersion: "5.0.0" }
    );

    const mockCheckUnique = vi.fn()
      .mockRejectedValueOnce(p2002Error)
      .mockResolvedValue({ id: "booking-2" });

    const result = await generateUniqueKodeBooking(mockCheckUnique);

    expect(result).toEqual({ id: "booking-2" });
    expect(mockCheckUnique).toHaveBeenCalledTimes(2);
  });

  it("should throw after maxAttempts collisions", async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint violation",
      { code: "P2002", clientVersion: "5.0.0" }
    );

    const mockCheckUnique = vi.fn().mockRejectedValue(p2002Error);

    await expect(generateUniqueKodeBooking(mockCheckUnique, 3)).rejects.toThrow(
      "Failed to generate unique booking code after 3 attempts"
    );
    expect(mockCheckUnique).toHaveBeenCalledTimes(3);
  });

  it("should NOT retry on non-P2002 errors", async () => {
    const dbError = new Error("Database connection failed");

    const mockCheckUnique = vi.fn().mockRejectedValue(dbError);

    await expect(generateUniqueKodeBooking(mockCheckUnique)).rejects.toThrow(
      "Database connection failed"
    );
    // Should throw immediately without retry
    expect(mockCheckUnique).toHaveBeenCalledTimes(1);
  });

  it("should use custom maxAttempts", async () => {
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint violation",
      { code: "P2002", clientVersion: "5.0.0" }
    );

    const mockCheckUnique = vi.fn().mockRejectedValue(p2002Error);

    await expect(generateUniqueKodeBooking(mockCheckUnique, 5)).rejects.toThrow(
      "Failed to generate unique booking code after 5 attempts"
    );
    expect(mockCheckUnique).toHaveBeenCalledTimes(5);
  });

  it("should pass generated code to checkUnique", async () => {
    const mockCheckUnique = vi.fn().mockResolvedValue(null);

    await generateUniqueKodeBooking(mockCheckUnique);

    const calledWith = mockCheckUnique.mock.calls[0]?.[0] as string;
    expect(calledWith).toMatch(/^BK\d{4}-[0-9A-Z]{4}$/);
  });
});
