-- Migration: Schema Cleanup
-- 1. Remove stale total_booking column from clients (never correctly maintained)
-- 2. Remove redundant index on galleries.client_token (UNIQUE already implies index)
-- 3. Remove unused UserRole enum (declared but never used by any model)

-- Remove stale total_booking column
ALTER TABLE "clients" DROP COLUMN IF EXISTS "total_booking";

-- Remove redundant index (UNIQUE constraint already creates an index)
DROP INDEX IF EXISTS "galleries_client_token_idx";

-- Remove unused UserRole enum
DROP TYPE IF EXISTS "UserRole";
