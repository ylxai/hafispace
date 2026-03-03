-- Migration: optimize_indexes
-- Tambah missing indexes untuk performa query

-- Notification: composite index vendorId + isRead (query paling umum)
CREATE INDEX IF NOT EXISTS "notifications_vendor_id_is_read_idx" ON "notifications"("vendor_id", "is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");

-- ActivityLog: index vendorId + createdAt
CREATE INDEX IF NOT EXISTS "activity_logs_vendor_id_idx" ON "activity_logs"("vendor_id");
CREATE INDEX IF NOT EXISTS "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- PhotoSelection: unique constraint galleryId + fileId (satu foto sekali per gallery)
-- dan composite index galleryId + isLocked (query paling umum)
ALTER TABLE "photo_selections" DROP CONSTRAINT IF EXISTS "photo_selections_gallery_id_file_id_key";
ALTER TABLE "photo_selections" ADD CONSTRAINT "photo_selections_gallery_id_file_id_key" UNIQUE ("gallery_id", "file_id");

DROP INDEX IF EXISTS "photo_selections_is_locked_idx";
CREATE INDEX IF NOT EXISTS "photo_selections_gallery_id_is_locked_idx" ON "photo_selections"("gallery_id", "is_locked");
