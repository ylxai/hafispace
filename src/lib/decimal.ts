import { Prisma } from "@prisma/client";

/**
 * Recursively convert Prisma Decimal fields to numbers for JSON serialization.
 * Handles objects, arrays, and nested structures while preserving special types.
 * 
 * ⚠️ Type Note: The return type structure may differ from input type T
 * (Decimal fields become numbers). For true type safety, consider using this
 * at known conversion points rather than generic contexts.
 * 
 * Example:
 *   const booking = await prisma.booking.findUnique(...);
 *   // Type: Booking (with Decimal fields)
 *   const serializable = convertDecimalToNumber(booking);
 *   // Type: Booking (but Decimal → number at runtime)
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

  // ✅ FIX #3: Preserve special objects (Date, Map, Set, etc)
  if (typeof data === "object") {
    // Don't convert special objects that have their own serialization
    if (
      data instanceof Date ||
      data instanceof Map ||
      data instanceof Set ||
      data instanceof RegExp ||
      data instanceof Error
    ) {
      return data;
    }

    // Only convert plain objects
    if (Object.getPrototypeOf(data) === Object.prototype || Object.getPrototypeOf(data) === null) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = convertDecimalToNumber(value);
      }
      return result as T;
    }

    // Return other objects as-is
    return data;
  }

  // Primitive values
  return data;
}
