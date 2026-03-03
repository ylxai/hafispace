/**
 * Application-wide constants.
 * Semua magic numbers dan default values dikumpulkan di sini.
 */

// ─── Gallery & Photo Selection ───────────────────────────────────────────────

/** Default maksimal foto yang bisa dipilih per galeri jika booking tidak menentukan */
export const DEFAULT_MAX_SELECTION = 40;

/** Batas atas maksimal seleksi yang diizinkan (divalidasi di Zod schema) */
export const MAX_SELECTION_LIMIT = 200;

/** Maksimal hasil foto dari Cloudinary per fetch */
export const CLOUDINARY_MAX_RESULTS = 500;

// ─── UI Feedback Delays (ms) ─────────────────────────────────────────────────

/** Durasi tampil pesan "Saved" sebelum hilang */
export const SAVED_FEEDBACK_DURATION_MS = 3000;

/** Durasi tampil pesan sukses di galleries page */
export const SUCCESS_FEEDBACK_DURATION_MS = 2000;

/** Durasi tampil progress selesai upload sebelum reset */
export const UPLOAD_COMPLETE_FEEDBACK_MS = 1200;

/** Durasi default toast notification */
export const TOAST_DEFAULT_DURATION_MS = 5000;

// ─── Touch / Gesture ─────────────────────────────────────────────────────────

/** Minimum jarak swipe (px) untuk trigger navigasi di lightbox */
export const MIN_SWIPE_DISTANCE_PX = 50;

// ─── Pagination & Query Limits ────────────────────────────────────────────────

/** Jumlah upcoming bookings yang ditampilkan di dashboard */
export const DASHBOARD_UPCOMING_BOOKINGS_LIMIT = 5;

// ─── Cookie ──────────────────────────────────────────────────────────────────

/** TTL cookie view count gallery (24 jam dalam detik) */
export const GALLERY_VIEW_COOKIE_TTL_SECONDS = 60 * 60 * 24;
