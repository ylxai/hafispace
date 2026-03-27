import { randomInt } from "node:crypto";

/**
 * Generate unique booking code with format: BK{YY}{MM}-{RANDOM}
 * Example: BK2603-A1B2
 * 
 * - YY: 2-digit year
 * - MM: 2-digit month
 * - RANDOM: 4-char base-36 string (1,679,616 combinations)
 */
export function generateKodeBooking(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  
  // Use cryptographically secure random number generator (CSPRNG)
  // to generate a 4-character base-36 string.
  // 36^4 = 1,679,616 possible combinations.
  const random = randomInt(0, 1679616).toString(36).padStart(4, "0").toUpperCase();
  
  return `BK${year}${month}-${random}`;
}
