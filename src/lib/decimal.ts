import { Prisma } from "@prisma/client";

/**
 * Recursively convert Prisma Decimal fields to numbers for JSON serialization.
 * Handles objects, arrays, and nested structures.
 */
export function convertDecimalToNumber<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Prisma Decimal
  if (data instanceof Prisma.Decimal) {
    return data.toNumber() as T;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => convertDecimalToNumber(item)) as T;
  }

  // Handle objects
  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = convertDecimalToNumber(value);
    }
    return result as T;
  }

  // Primitive values
  return data;
}
