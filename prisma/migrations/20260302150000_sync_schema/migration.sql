-- Add missing columns to vendors table
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "r2_access_key_id" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "r2_secret_access_key" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "r2_bucket_name" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "r2_endpoint" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "cloudinary_cloud_name" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "cloudinary_api_key" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "cloudinary_api_secret" TEXT;
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "enable_viesus_enhancement" BOOLEAN DEFAULT false;

-- Add missing columns to galleries table
ALTER TABLE "galleries" ADD COLUMN IF NOT EXISTS "cloudinary_folder_id" TEXT;
ALTER TABLE "galleries" ADD COLUMN IF NOT EXISTS "storage_provider" TEXT DEFAULT 'Cloudinary';

-- Rename file_id to storage_key in photos table (requires recreating index)
ALTER TABLE "photos" RENAME COLUMN "file_id" TO "storage_key";

-- Recreate the unique index with new column name
-- First drop the old index (if exists)
-- Then create new index is handled by Prisma
