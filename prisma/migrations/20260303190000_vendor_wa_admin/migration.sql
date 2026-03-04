-- Migration: vendor_wa_admin
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "wa_admin" TEXT;
-- Set default nomor WA admin untuk vendor yang sudah ada
UPDATE "vendors" SET "wa_admin" = '6282353345446' WHERE "wa_admin" IS NULL;
