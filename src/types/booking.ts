/**
 * Shared TypeScript types untuk Booking system.
 * Import dari sini — single source of truth untuk semua Booking types.
 *
 * Admin booking list type sudah ada di @/types/admin:
 * - AdminBooking, BookingStatus, DpStatus → import dari @/types/admin
 *
 * File ini berisi types tambahan:
 * - BookingDetail (full booking dengan relasi)
 * - Payment (pembayaran)
 * - BookingSummary (booking + kalkulasi finansial)
 * - Client (data klien)
 * - Package (paket foto)
 */

// Re-export booking-related types dari admin untuk convenience
export type { AdminBooking, BookingStatus, DpStatus } from "@/types/admin";
export type { AdminClient,AdminPackage, PackageKategori, PackageStatus } from "@/types/admin";

// ─── Client ───────────────────────────────────────────────────────────────────

/**
 * Data klien lengkap (dari Client model di Prisma).
 * Digunakan di booking detail dan form.
 */
export interface Client {
  id: string;
  namaClient: string;
  hpClient: string;
  emailClient: string | null;
  alamatClient: string | null;
  instagram: string | null;
  createdAt: string;
}

// ─── Package ──────────────────────────────────────────────────────────────────

/**
 * Paket foto untuk booking (public view).
 * Untuk admin view, gunakan AdminPackage dari @/types/admin.
 */
export interface Package {
  id: string;
  namaPaket: string;
  harga: number;         // Decimal → number (via convertDecimalToNumber)
  deskripsi: string | null;
  kuotaEdit: number | null;
  maxSelection: number | null;
  includeCetak: boolean | null;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

/**
 * Record pembayaran booking.
 * `jumlahBayar` adalah Decimal di DB, sudah dikonversi ke number di API response.
 */
export interface Payment {
  id: string;
  bookingId: string;
  jumlahBayar: number;   // Decimal → number
  metodeBayar: string;
  tanggalBayar: string;
  catatan: string | null;
  createdAt: string;
}

// ─── Booking Detail ───────────────────────────────────────────────────────────

/**
 * Booking lengkap dengan relasi (untuk detail page dan invoice).
 * Untuk booking list, gunakan AdminBooking dari @/types/admin.
 *
 * `hargaPaket` adalah Decimal di DB, sudah dikonversi ke number di API response.
 */
export interface BookingDetail {
  id: string;
  kodeBooking: string;
  namaClient: string;
  hpClient: string;
  emailClient: string | null;
  alamatClient: string | null;
  tanggalSesi: string;
  lokasiSesi: string | null;
  hargaPaket: number;    // Decimal → number
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  dpStatus: "UNPAID" | "PARTIAL" | "PAID";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  paketId: string | null;
  clientId: string | null;
  paket: Package | null;
  client: Client | null;
  payments: Payment[];
  galleries: BookingGallery[];
}

/**
 * Gallery yang terkait dengan booking (summary only).
 */
export interface BookingGallery {
  id: string;
  namaProject: string;
  status: "DRAFT" | "IN_REVIEW" | "DELIVERED";
  clientToken: string;
  photoCount: number;
  selectionCount: number;
}

// ─── Booking Summary ──────────────────────────────────────────────────────────

/**
 * Kalkulasi finansial booking.
 * Digunakan di detail page dan invoice.
 */
export interface BookingSummary {
  booking: BookingDetail;
  totalBayar: number;
  sisaTagihan: number;
  isPaid: boolean;       // sisaTagihan === 0
  isOverpaid: boolean;   // totalBayar > hargaPaket
}

// ─── Public Booking (form submission) ────────────────────────────────────────

/**
 * Data yang disubmit klien saat booking via form publik.
 */
export interface PublicBookingSubmit {
  namaClient: string;
  hpClient: string;
  emailClient?: string;
  alamatClient?: string;
  tanggalSesi: string;
  lokasiSesi?: string;
  paketId: string;
  notes?: string;
  vendorToken: string;
}

/**
 * Response setelah booking berhasil dibuat via form publik.
 */
export interface PublicBookingResult {
  kodeBooking: string;
  namaClient: string;
  tanggalSesi: string;
  hargaPaket: number;
  invoiceUrl: string;
}
