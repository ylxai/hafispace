import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with conflict resolution.
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 *
 * @example
 * ```typescript
 * cn("px-4 py-2", isActive && "bg-blue-500", "text-white")
 * // → "px-4 py-2 bg-blue-500 text-white" (when isActive=true)
 *
 * cn("px-2", "px-4") // → "px-4" (tailwind-merge resolves conflict)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
