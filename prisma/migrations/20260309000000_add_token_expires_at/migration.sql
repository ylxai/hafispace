-- AlterTable: tambah kolom token_expires_at di galleries
-- Nullable (optional) — gallery yang tidak set expiry tetap aktif
ALTER TABLE "galleries" ADD COLUMN IF NOT EXISTS "token_expires_at" TIMESTAMP(3);
