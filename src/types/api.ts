// ─── External Imports ──────────────────────────────────────────────────────────
// (imports must come before exports per TypeScript best practice)
import type { AdminBooking, AdminClient, AdminGallery, AdminPackage } from "@/types/admin";
import type { BookingSummary } from "@/types/booking";
import type { AdminPhoto, ClientGallery } from "@/types/gallery";

export type { ApiErrorResponse } from "@/lib/api/response";

// ─── Base Response Types ───────────────────────────────────────────────────────

/**
 * Standard success response wrapper.
 * Semua API endpoints (kecuali list) harus return format ini.
 *
 * @example
 * ```typescript
 * // API route
 * return NextResponse.json({ data: booking } satisfies ApiSuccessResponse<BookingDetail>);
 *
 * // Frontend hook
 * const { data } = useQuery<ApiSuccessResponse<BookingDetail>>(...);
 * const booking = data?.data;
 * ```
 */
export type ApiSuccessResponse<T = unknown> = {
  data: T;
  success?: true;
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
 * Standard paginated list response.
 * Semua API list endpoints harus return format ini.
 *
 * @example
 * ```typescript
 * // API route
 * return NextResponse.json({
 *   data: bookings,
 *   pagination: { page, pageSize, total, totalPages }
 * } satisfies ApiPaginatedResponse<AdminBooking>);
 * ```
 */
export type ApiPaginatedResponse<T> = {
  data: T[];
  pagination: PaginationMeta;
};

// ─── Legacy (backward compat) ─────────────────────────────────────────────────

/**
 * @deprecated Gunakan ApiPaginatedResponse<T> sebagai gantinya.
 * Masih ada di beberapa routes lama yang belum dimigrate.
 */
export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// ─── Domain Response Types ─────────────────────────────────────────────────────

// Booking responses
export type BookingListResponse = ApiPaginatedResponse<AdminBooking>;
export type BookingDetailResponse = ApiSuccessResponse<BookingSummary>;
export type BookingCreateResponse = ApiSuccessResponse<{ kodeBooking: string; id: string }>;

// Gallery responses
export type GalleryListResponse = ApiPaginatedResponse<AdminGallery>;
export type ClientGalleryResponse = ApiSuccessResponse<{
  gallery: ClientGallery;
  pagination: PaginationMeta; // Use named type for consistency
}>;
export type PhotoListResponse = ApiSuccessResponse<{ photos: AdminPhoto[] }>;

// Client responses
export type ClientListResponse = ApiPaginatedResponse<AdminClient>;
export type ClientDetailResponse = ApiSuccessResponse<AdminClient>;

// Package responses
export type PackageListResponse = ApiPaginatedResponse<AdminPackage>;

