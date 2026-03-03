-- Migration: custom_fields_update
-- Tambah field label, isRequired, isActive ke custom_fields

ALTER TABLE "custom_fields"
  ADD COLUMN IF NOT EXISTS "label"       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "is_required" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_active"   BOOLEAN NOT NULL DEFAULT true;

-- Update label dari namaField yang sudah ada
UPDATE "custom_fields" SET "label" = "nama_field" WHERE "label" = '';

CREATE INDEX IF NOT EXISTS "custom_fields_vendor_id_idx" ON "custom_fields"("vendor_id");
