/**
 * Vitest global setup - mock required environment variables
 * for tests that import files requiring env validation.
 */

// Mock required env vars to prevent startup errors in tests
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.NEXTAUTH_SECRET ??= "test-secret-for-testing-only";
process.env.NEXTAUTH_URL ??= "http://localhost:3000";
process.env.ENCRYPTION_KEY ??= "0000000000000000000000000000000000000000000000000000000000000000";
process.env.CLOUDINARY_MASTER_KEY ??= "0000000000000000000000000000000000000000000000000000000000000000";
