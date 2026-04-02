/**
 * Shared TypeScript types untuk Admin Dashboard.
 * Semua page admin import types dari sini — single source of truth.
 */

// ─── Booking / Event ─────────────────────────────────────────────────────────

export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type DpStatus = "UNPAID" | "PARTIAL" | "PAID";

export type AdminBooking = {
  id: string;
  kodeBooking: string;
  namaClient: string;
  hpClient: string | null;
  tanggalSesi: string;
  lokasiSesi: string | null;
  status: BookingStatus;
  dpStatus: DpStatus;
  hargaPaket: number;
  namaPaket: string | null;
  paketId: string | null;
  notes: string | null;
  createdAt: string;
  clientId: string | null;
};

// ─── Gallery ─────────────────────────────────────────────────────────────────

export type GalleryStatus = "DRAFT" | "IN_REVIEW" | "DELIVERED";

export type AdminGallery = {
  id: string;
  namaProject: string;
  status: GalleryStatus;
  clientToken: string;
  tokenExpiresAt?: string | null;  // Digunakan di EditGalleryModal untuk token expiry management
  viewCount: number;
  photoCount: number;
  selectionCount: number;
  clientName: string;
  createdAt: string;
};

// ─── Client ──────────────────────────────────────────────────────────────────

export type AdminClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  totalBooking: number;
  createdAt: string;
};

// ─── Package ─────────────────────────────────────────────────────────────────

export type PackageStatus = "ACTIVE" | "INACTIVE";
export type PackageKategori = "WEDDING" | "PREWEDDING" | "MATERNITY" | "BIRTHDAY" | "FAMILY" | "OTHER";

export type AdminPackage = {
  id: string;
  namaPaket: string;
  kategori: PackageKategori;
  harga: number;
  deskripsi: string | null;
  kuotaEdit: number | null;
  maxSelection: number | null;
  includeCetak: boolean | null;
  urutan: number;
  status: PackageStatus;
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export type PaginationMeta = {
  page: number;
  pageSize: number; // Unified with api.ts PaginationMeta (was: limit)
  total: number;
  totalPages: number;
};

// Re-export from api.ts as single source of truth
// PaginatedResponse<T> is now ApiPaginatedResponse<T> from @/types/api
export type { ApiPaginatedResponse as PaginatedResponse } from "@/types/api";
