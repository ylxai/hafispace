-- Remove deprecated Cloudinary fields from vendors table
-- These are replaced by the VendorCloudinary table for multi-account support

-- Drop deprecated columns if they exist
ALTER TABLE vendors DROP COLUMN IF EXISTS cloudinary_cloud_name;
ALTER TABLE vendors DROP COLUMN IF EXISTS cloudinary_api_key;
ALTER TABLE vendors DROP COLUMN IF EXISTS cloudinary_api_secret;

-- Drop duplicate columns from custom_fields table
ALTER TABLE custom_fields DROP COLUMN IF EXISTS label;
ALTER TABLE custom_fields DROP COLUMN IF EXISTS is_required;

-- Add payment method field to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method VARCHAR(20) DEFAULT 'CASH';
