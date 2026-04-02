// ─── External Imports ──────────────────────────────────────────────────────────
// (imports must come before exports per TypeScript best practice)
import type { AdminBooking, AdminClient, AdminGallery, AdminPackage } from "@/types/admin";
import type { BookingSummary } from "@/types/booking";
import type { AdminPhoto, ClientGallery } from "@/types/gallery";

export type { ApiErrorResponse } from "@/lib/api/response";

// ─── Base Response Types ───────────────────────────────────────────────────────

/**
 * Success response wrapper.
 *
 * IMPORTANT: Most detail API endpoints return raw objects (NO wrapper):
 * - GET /admin/galleries/[id] → raw Gallery object
 * - GET /admin/clients/[id] → raw Client object
 * - GET /admin/packages → { packages: [] } (named key!)
 *
 * This type is used for endpoints that explicitly wrap in { data }.
 * For most endpoints, use the specific domain response types below.
 *
 * @note In feat/response-types branch, all endpoints will be standardized.
 */
export type ApiSuccessResponse<T = unknown> = {
  data: T;
  /**
   * Optional success indicator - only included by specific endpoints (e.g., auth, mutations).
   * Most API endpoints return raw objects or { data: T } without this field.
   */
  success?: true;
};

/**
 * Standard pagination metadata.
 * Uses `pageSize` consistently (admin.ts uses `limit` - will be unified in feat/response-types).
 *
 * Note: Public gallery uses cursor-based pagination: { hasNextPage, nextCursor, totalPhotos? }
 * This PaginationMeta is for offset-based pagination (admin list endpoints).
 */
export type PaginationMeta = {
  page: number;
  pageSize: number;   // Use pageSize (not limit) - unified across shared types
  total: number;
  totalPages: number;
};

/**
 * Cursor-based pagination for photo lists (public gallery).
 * Different from offset pagination used in admin lists.
 */
export type CursorPaginationMeta = {
  hasNextPage: boolean;
  nextCursor: string | null;
  totalPhotos?: number;
};

/**
 * Paginated list response - matches ACTUAL API response shape.
 *
 * All list endpoints use `items` key (NOT `data`):
 * - GET /admin/galleries → { items: [], pagination: {} }
 * - GET /admin/bookings/[id]/payments → { items: [], pagination: {} }
 * - GET /admin/clients → { items: [], pagination: {} }
 * - GET /admin/events → { items: [], pagination: {} }
 *
 * @note In feat/response-types branch, these will be migrated to `data` key.
 * @note This type does NOT include a `success` field (unlike ApiSuccessResponse).
 *       Paginated responses use a different structure pattern:
 *       { items: T[], pagination: PaginationMeta }
 *       rather than { success: true, data: T[], pagination: ... }
 */
export type ApiPaginatedResponse<T> = {
  items: T[];        // ← actual API field name (not 'data')
  pagination: PaginationMeta;
};

// ─── Domain Response Types ─────────────────────────────────────────────────────

// Booking responses
export type BookingListResponse = ApiPaginatedResponse<AdminBooking>;
export type BookingDetailResponse = ApiSuccessResponse<BookingSummary>;
export type BookingCreateResponse = ApiSuccessResponse<{ kodeBooking: string; id: string }>;

// Gallery responses
export type GalleryListResponse = ApiPaginatedResponse<AdminGallery>; // { items: [], pagination: {} }

/**
 * Client gallery response - matches ACTUAL API response:
 * GET /api/public/gallery/[token] → {
 *   gallery: {
 *     id, namaProject, status, clientToken, viewCount,
 *     vendor: { namaStudio, logoUrl },
 *     settings: { maxSelection, enableDownload, ... },
 *     photos: ApiPhoto[],
 *     selectionCount: number,
 *     selections: string[],    // Array of Photo.id (fileId)
 *     isSelectionLocked: boolean,  // NOT isLocked!
 *   },
 *   pagination: { hasNextPage, nextCursor, totalPhotos? }  // Top-level, cursor-based!
 * }
 */
export type ClientGalleryResponse = {
  gallery: ClientGallery; // ClientGallery already includes all fields (see gallery.ts)
  pagination: CursorPaginationMeta; // Top-level, cursor-based pagination
};

/**
 * Admin photo list response.
 */
export type PhotoListResponse = ApiPaginatedResponse<AdminPhoto>; // { items: [], pagination: {} }

// Client responses
export type ClientListResponse = ApiPaginatedResponse<AdminClient>; // { items: [], pagination: {} }
export type ClientDetailResponse = AdminClient; // Raw object (no wrapper)

// Package responses - { packages: [] } (named key!)
export type PackageListResponse = {
  packages: AdminPackage[]; // Named key, no pagination
};

