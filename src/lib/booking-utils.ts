import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";

/**
 * Generate unique booking code with format: BK{YY}{MM}-{RANDOM}
 * Example: BK2603-A1B2
 * 
 * - YY: 2-digit year
 * - MM: 2-digit month
 * - RANDOM: 4-char base-36 string (36^4 = 1,679,616 combinations)
 */
export function generateKodeBooking(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  
  // Use cryptographically secure random number generator (CSPRNG)
  // to generate a 4-character base-36 string.
  const random = randomInt(0, 36 ** 4).toString(36).padStart(4, "0").toUpperCase();
  
  return `BK${year}${month}-${random}`;
}

/**
 * Generate unique booking code with retry on collision.
 * Retries up to maxAttempts times if unique constraint is violated.
 * 
 * @param checkUnique - Async function that attempts to use the generated code
 * @param maxAttempts - Maximum retry attempts (default: 3)
 * @returns Result from checkUnique function
 * @throws Error if all attempts fail or non-collision error occurs
 */
export async function generateUniqueKodeBooking<T>(
  checkUnique: (kodeBooking: string) => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const kodeBooking = generateKodeBooking();
    
    try {
      return await checkUnique(kodeBooking);
    } catch (error) {
      // Check if error is Prisma unique constraint violation (P2002)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < maxAttempts
      ) {
        // Retry with new code
        continue;
      }
      
      // Re-throw if not a collision or max attempts reached
      throw error;
    }
  }
  
  throw new Error(`Failed to generate unique booking code after ${maxAttempts} attempts`);
}
