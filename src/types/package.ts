/**
 * Shared package types — single source of truth untuk Package domain.
 *
 * Digunakan oleh:
 * - src/types/admin.ts (PackageKategori alias)
 * - src/app/admin/packages/_components/package-types.ts (re-export)
 *
 * Nilai canonical sesuai DB dan validation.ts Zod schema.
 */

export type PackageCategory = "PREWED" | "WEDDING" | "PERSONAL" | "EVENT" | "LAINNYA";
