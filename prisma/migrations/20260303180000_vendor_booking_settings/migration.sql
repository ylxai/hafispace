-- Migration: vendor_booking_settings
-- Tambah field booking form settings ke tabel vendors

ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "dp_percentage"        INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "rekening_pembayaran"  TEXT,
  ADD COLUMN IF NOT EXISTS "syarat_ketentuan"     TEXT,
  ADD COLUMN IF NOT EXISTS "theme_color"          TEXT NOT NULL DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS "success_message"      TEXT,
  ADD COLUMN IF NOT EXISTS "booking_form_active"  BOOLEAN NOT NULL DEFAULT true;
