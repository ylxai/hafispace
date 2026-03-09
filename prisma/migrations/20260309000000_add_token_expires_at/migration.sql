-- AlterTable: tambah kolom token_expires_at di Gallery
-- Nullable (optional) — gallery yang tidak set expiry tetap aktif
ALTER TABLE "Gallery" ADD COLUMN "token_expires_at" TIMESTAMP(3);
