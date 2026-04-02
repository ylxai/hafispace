/**
 * Shared TypeScript types untuk Gallery system.
 * Import dari sini — single source of truth untuk semua Photo & Gallery client types.
 *
 * Admin gallery types sudah ada di @/types/admin:
 * - AdminGallery, GalleryStatus → import dari @/types/admin
 *
 * File ini berisi types untuk:
 * - Photo (public-safe, no storageKey)
 * - ClientGallery (gallery view untuk client)
 * - GallerySettings (konfigurasi galeri)
 * - PhotoSelectionItem (seleksi foto oleh client)
 */

// Import for internal use in this file
import type { GalleryStatus } from "@/types/admin";

// Re-export gallery-related types dari admin untuk convenience
export type { AdminGallery, GalleryStatus } from "@/types/admin";

// ─── Photo ────────────────────────────────────────────────────────────────────

/**
 * Photo type untuk API response (public-safe).
 *
 * ⚠️ SECURITY: `storageKey` TIDAK diexpose ke client.
 * Gunakan type ini di semua components yang menampilkan foto.
 *
 * Single source of truth — ganti semua local Photo definitions dengan ini.
 *
 * @example
 * ```typescript
 * import type { ApiPhoto } from "@/types/gallery";
 *
 * function PhotoCard({ photo }: { photo: ApiPhoto }) { ... }
 * ```
 */
export interface ApiPhoto {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  createdAt?: string;
  urutan?: number | null;
}

// ─── Gallery Settings ─────────────────────────────────────────────────────────

/**
 * Konfigurasi galeri (dari GallerySetting model di Prisma).
 */
export interface GallerySettings {
  enableDownload: boolean;
  enablePrint: boolean;
  enableOriginalDownload: boolean;
  watermarkEnabled: boolean;
  watermarkText: string | null;
  bannerClientName: string | null;
  bannerEventDate: string | null;
  welcomeMessage: string | null;
  thankYouMessage: string | null;
  maxSelection: number | null;
}

// ─── Client Gallery ───────────────────────────────────────────────────────────

/**
 * Gallery lengkap untuk client view (/gallery/[token]).
 *
 * Fields verified against actual API response from:
 * GET /api/public/gallery/[token]
 *
 * ⚠️ Key differences from admin view:
 * - `isSelectionLocked` (NOT `isLocked`) - true if any selection is submitted
 * - `vendor` object included for branding
 * - `selectionCount` for display
 * - Cursor-based pagination (not offset)
 */
export interface ClientGallery {
  id: string;
  namaProject: string;
  status: GalleryStatus;  // from @/types/admin
  clientToken: string;
  viewCount: number;
  // Vendor info for branding
  vendor: {
    namaStudio: string | null;
    logoUrl: string | null;
  };
  // Gallery settings
  settings: GallerySettings | null;
  // Photos (paginated via cursor)
  photos: ApiPhoto[];
  // Selection data
  selectionCount: number;
  selections: string[];     // Array of Photo.id (= PhotoSelection.fileId)
  isSelectionLocked: boolean; // true if any selection is locked (submitted)
                              // ⚠️ NOT 'isLocked' - field name verified from API code
}

// ─── Photo Selection ──────────────────────────────────────────────────────────

/**
 * Foto yang sudah diseleksi oleh client.
 *
 * ⚠️ IMPORTANT: `fileId` = `Photo.id` (BUKAN storageKey!)
 * Ini adalah keputusan arsitektur untuk abstrak dari storage implementation.
 *
 * @see docs/guides/gallery-view.mdx untuk penjelasan lengkap
 */
export interface PhotoSelectionItem {
  id: string;
  fileId: string;      // = Photo.id
  filename: string;
  url: string;         // = Photo.url (CDN URL) - consistent with ApiPhoto.url
  selectionType: "EDIT" | "PRINT";
  printSize: string | null;
  isLocked: boolean;
  selectedAt: string;
  lockedAt: string | null;
}

// ─── Admin Photo ──────────────────────────────────────────────────────────────

/**
 * Photo dengan admin-specific fields (untuk admin panel).
 * Extends ApiPhoto dengan fields tambahan yang hanya dibutuhkan admin.
 */
export interface AdminPhoto extends ApiPhoto {
  isDeleted: boolean;
  urutan: number | null;
  cloudinaryPublicId?: string | null;
}

// ─── Gallery Token Info ───────────────────────────────────────────────────────

/**
 * Info token galeri (untuk admin token management).
 */
export interface GalleryTokenInfo {
  clientToken: string;
  tokenExpiresAt: string | null;
  shareUrl: string;
}
