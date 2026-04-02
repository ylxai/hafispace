// ─── External Imports ──────────────────────────────────────────────────────────
// (imports must come before exports per TypeScript best practice)
import type { AdminBooking, AdminClient, AdminGallery, AdminPackage } from "@/types/admin";
import type { BookingSummary } from "@/types/booking";
import type { AdminPhoto, ApiPhoto, ClientGallery } from "@/types/gallery";

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
  success?: true; // Optional - not all success responses include this
};

/**
 * Pagination metadata.
 */
export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
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
 *   gallery: { id, namaProject, photos: [], pagination: {} }
 * }
 * Note: pagination is INSIDE gallery object (current behavior)
 */
export type ClientGalleryResponse = {
  gallery: ClientGallery & {
    photos: ApiPhoto[];
    pagination: PaginationMeta; // Nested inside gallery (current API behavior)
  };
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

