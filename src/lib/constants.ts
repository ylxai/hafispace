/**
 * Client-safe constants — tidak ada dependency ke server env vars.
 * Untuk constants yang butuh env vars, gunakan @/lib/constants.server
 */

// ─── Gallery & Photo Selection ───────────────────────────────────────────────

export const DEFAULT_MAX_SELECTION = 40;
export const MAX_SELECTION_LIMIT = 200;
export const MAX_GLOBAL_SELECTION_LIMIT = 500; // ✅ Hard limit for API submission
export const CLOUDINARY_MAX_RESULTS = 500;

// ─── UI Feedback Delays (ms) ─────────────────────────────────────────────────

export const SAVED_FEEDBACK_DURATION_MS = 3000;
export const SUCCESS_FEEDBACK_DURATION_MS = 2000;
export const UPLOAD_COMPLETE_FEEDBACK_MS = 1200;
export const TOAST_DEFAULT_DURATION_MS = 5000;

// ─── Touch / Gesture ─────────────────────────────────────────────────────────

export const MIN_SWIPE_DISTANCE_PX = 50;

// ─── Pagination & Query Limits ────────────────────────────────────────────────

export const DASHBOARD_UPCOMING_BOOKINGS_LIMIT = 5;

// ─── Cookie ──────────────────────────────────────────────────────────────────

export const GALLERY_VIEW_COOKIE_TTL_SECONDS = 60 * 60 * 24;
