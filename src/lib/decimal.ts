import { Prisma } from "@prisma/client";

/**
 * A recursive mapped type that converts Prisma.Decimal fields to number.
 * Inspired by TypeScript's `Jsonified` type for deep object serialization.
 * 
 * @see https://github.com/microsoft/TypeScript/blob/v5.9.3/tests/baselines/reference/inferTypes1.errors.txt
 * 
 * Type transformation rules:
 * - `Prisma.Decimal` → `number`
 * - `Date`, `Map`, `Set`, `RegExp`, `Error` → preserved as-is
 * - Arrays → recursively transform elements
 * - Plain objects → recursively transform properties
 * - Primitives → preserved as-is
 * 
 * ⚠️ **Known Limitation - Class Instances:**
 * 
 * TypeScript cannot distinguish plain objects from class instances at the type level.
 * The type will recursively map ALL objects, but the runtime implementation
 * skips class instances (returns them as-is).
 * 
 * **Consequence:** If you pass a class instance with `Decimal` fields to this function:
 * - Runtime: Class instance returned unchanged (Decimal fields NOT converted)
 * - Type: Type system thinks Decimal fields are converted to number
 * - Result: Type lie! JSON.stringify will still fail on Decimal fields
 * 
 * **Recommendation:** Only use this function with:
 * - ✅ Prisma query results (plain objects from database)
 * - ✅ Plain JavaScript objects (object literals, `Object.create(null)`)
 * - ❌ NOT with class instances that contain Decimal fields
 * 
 * **Example (Safe Usage):**
 * ```typescript
 * const booking = await prisma.booking.findUnique(...); // Plain object ✅
 * const safe = convertDecimalToNumber(booking);
 * // Type: Serializable<Booking> (Decimal → number)
 * // Runtime: Actually converted ✅
 * ```
 * 
 * **Example (Unsafe - Type Lie):**
 * ```typescript
 * class MyBooking { price: Prisma.Decimal = new Prisma.Decimal(100); }
 * const instance = new MyBooking(); // Class instance ❌
 * const unsafe = convertDecimalToNumber(instance);
 * // Type: Serializable<MyBooking> (thinks price is number)
 * // Runtime: price is STILL Decimal (not converted!)
 * // JSON.stringify(unsafe) → ERROR! ❌
 * ```
 */
type Serializable<T> = 
  T extends Prisma.Decimal ? number
  : T extends null | undefined ? T
  : T extends string | number | boolean ? T
  : T extends Date | Map<unknown, unknown> | Set<unknown> | RegExp | Error ? T
  : T extends (infer E)[] ? Serializable<E>[]
  : T extends object ? { [P in keyof T]: Serializable<T[P]> }
  : T;

/**
 * Recursively convert Prisma Decimal fields to numbers for JSON serialization.
 * Handles objects, arrays, and nested structures while preserving special types.
 * 
 * ✅ Type-safe: Returns accurate Serializable<T> type reflecting the transformation.
 * 
 * **Edge cases handled:**
 * - `null` / `undefined` → preserved as-is
 * - `Prisma.Decimal` → converted to `number`
 * - Arrays → recursively map each element
 * - Special objects (Date, Map, Set, RegExp, Error) → preserved as-is
 * - Plain objects (`Object.prototype` or `null` prototype) → recursively convert properties
 * - Other objects (class instances, etc.) → preserved as-is
 * - Primitives → preserved as-is
 * 
 * Example:
 *   const booking = await prisma.booking.findUnique(...);
 *   // Type: Booking (with Decimal fields)
 *   const serializable = convertDecimalToNumber(booking);
 *   // Type: Serializable<Booking> (Decimal → number, Date preserved)
 */
export function convertDecimalToNumber<T>(data: T): Serializable<T> {
  if (data === null || data === undefined) {
    return data as Serializable<T>;
  }

  // Handle Prisma Decimal
  if (data instanceof Prisma.Decimal) {
    return data.toNumber() as Serializable<T>;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => convertDecimalToNumber(item)) as Serializable<T>;
  }

  // Preserve special objects (Date, Map, Set, RegExp, Error)
  if (typeof data === "object") {
    // Don't convert special objects that have their own serialization
    if (
      data instanceof Date ||
      data instanceof Map ||
      data instanceof Set ||
      data instanceof RegExp ||
      data instanceof Error
    ) {
      return data as Serializable<T>;
    }

    /**
     * Only convert plain objects (created via `{}` or `Object.create(null)`).
     * 
     * This check handles:
     * - Plain objects: `{ foo: 'bar' }` → `Object.getPrototypeOf(obj) === Object.prototype`
     * - Null-prototype objects: `Object.create(null)` → `Object.getPrototypeOf(obj) === null`
     * - Class instances: Skipped (e.g., custom domain objects should be preserved)
     * 
     * Performance: Cache prototype to avoid double `getPrototypeOf` call.
     */
    const proto = Object.getPrototypeOf(data);
    if (proto === Object.prototype || proto === null) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = convertDecimalToNumber(value);
      }
      return result as Serializable<T>;
    }

    // Return other objects (class instances, etc.) as-is
    return data as Serializable<T>;
  }

  // Primitive values (string, number, boolean, symbol, bigint)
  return data as Serializable<T>;
}
