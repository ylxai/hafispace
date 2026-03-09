# Code Quality Audit Report
**Date**: $(date)
**Files Audited**: 10 files (hooks + lib utilities)

---

## 1. TanStack Query: Inconsistent Query Key Patterns

### Issue: Missing hierarchy and inconsistency in query key structure

**Files affected:**
- `src/hooks/use-admin-events.ts` (line 43)
- `src/hooks/use-admin-galleries.ts` (line 36)
- `src/hooks/use-admin-clients.ts` (line 28)
- `src/hooks/use-admin-metrics.ts` (line 23)

**Problems:**
1. Query keys use string literals instead of a consistent factory pattern
2. No namespace hierarchy (e.g., `["admin", "events", ...]` vs `["admin-bookings", ...]`)
3. Mixed naming conventions: `admin-bookings` vs `admin-galleries` vs `admin-clients` vs `admin-metrics`
4. No type safety for query keys (should use `const` objects or enums)

**Examples:**
```typescript
// ❌ Current (inconsistent)
["admin-bookings", page, limit]        // use-admin-events.ts:43
["admin-galleries", page, limit]       // use-admin-galleries.ts:36
["admin-clients"]                      // use-admin-clients.ts:28
["admin-metrics"]                      // use-admin-metrics.ts:23
```

**Recommendation:**
Create a `src/lib/query-keys.ts` file with a factory pattern:
```typescript
export const adminQueryKeys = {
  all: ['admin'] as const,
  events: {
    all: ['admin', 'events'] as const,
    paginated: (page: number, limit: number) => 
      ['admin', 'events', 'paginated', page, limit] as const,
  },
  galleries: {
    all: ['admin', 'galleries'] as const,
    paginated: (page: number, limit: number) => 
      ['admin', 'galleries', 'paginated', page, limit] as const,
  },
  clients: {
    all: ['admin', 'clients'] as const,
  },
  metrics: {
    all: ['admin', 'metrics'] as const,
  },
} as const;
```

---

## 2. Missing staleTime / gcTime Configuration

### Issue: All queries lack explicit cache configuration

**Files affected:**
- `src/hooks/use-admin-events.ts` (line 42-45)
- `src/hooks/use-admin-galleries.ts` (line 35-38)
- `src/hooks/use-admin-clients.ts` (line 27-30)
- `src/hooks/use-admin-metrics.ts` (line 22-25)

**Current code:**
```typescript
// ❌ No cache configuration
return useQuery({
  queryKey: ["admin-bookings", page, limit],
  queryFn: () => fetchAdminBookings(page, limit),
});
```

**Problems:**
1. No `staleTime` configured (default 0ms = immediately stale)
2. No `gcTime` configured (default 5min, may be excessive for admin data)
3. Admin data typically changes infrequently, should cache longer
4. No differentiation between metrics (high freshness) vs galleries (low freshness)

**Recommendations:**
- **Metrics**: 1 minute stale time (real-time dashboard data)
- **Events/Bookings**: 5 minute stale time (admin rarely refreshes)
- **Galleries/Clients**: 5-10 minute stale time (reference data)

```typescript
// ✅ With cache configuration
return useQuery({
  queryKey: adminQueryKeys.events.paginated(page, limit),
  queryFn: () => fetchAdminBookings(page, limit),
  staleTime: 5 * 60 * 1000,  // 5 minutes
  gcTime: 10 * 60 * 1000,    // 10 minutes
});
```

---

## 3. Hardcoded Values Missing from constants.ts

### Issue: Magic numbers and strings scattered in code

**Files affected:**

#### `src/hooks/use-admin-events.ts`
- Line 41: `limit = 20` (hardcoded default pagination limit)
- Line 32: `/api/admin/events?page=${page}&limit=${limit}` (hardcoded endpoint)

#### `src/hooks/use-admin-galleries.ts`
- Line 34: `limit = 20` (hardcoded default pagination limit)
- Line 25: `/api/admin/galleries?page=${page}&limit=${limit}` (hardcoded endpoint)

#### `src/hooks/use-admin-clients.ts`
- Line 17: `/api/admin/clients` (hardcoded endpoint)

#### `src/hooks/use-admin-metrics.ts`
- Line 12: `/api/admin/metrics` (hardcoded endpoint)

**Recommendation:**
Add to `src/lib/constants.ts`:
```typescript
// API Endpoints
export const API_ENDPOINTS = {
  ADMIN_EVENTS: '/api/admin/events',
  ADMIN_GALLERIES: '/api/admin/galleries',
  ADMIN_CLIENTS: '/api/admin/clients',
  ADMIN_METRICS: '/api/admin/metrics',
} as const;

// Pagination
export const ADMIN_DEFAULT_PAGE_LIMIT = 20;
export const ADMIN_METRICS_STALE_TIME_MS = 60 * 1000;     // 1 min
export const ADMIN_EVENTS_STALE_TIME_MS = 5 * 60 * 1000;  // 5 min
export const ADMIN_GALLERIES_STALE_TIME_MS = 5 * 60 * 1000; // 5 min
export const ADMIN_CLIENTS_STALE_TIME_MS = 10 * 60 * 1000; // 10 min
```

---

## 4. Cloudinary Code Duplication

### Issue: Multiple implementations of same functionality

**Files affected:**
- `src/lib/cloudinary/core.ts`
- `src/lib/cloudinary-upload.ts`

**Duplicated functions:**

| Function | core.ts | cloudinary-upload.ts | Issue |
|----------|---------|---------------------|-------|
| `uploadPhotoToCloudinary()` | Line 104 | Wrapper at line 80 | Redundant wrapper |
| `deleteImageFromCloudinary()` | `deletePhotoFromCloudinary()` line 306 | Line 255 | Same functionality, different names |
| `getImageMetadata()` | `getPhotoFromCloudinary()` line 250 | Line 303 | Duplicate metadata retrieval |
| `listImagesInFolder()` | `listPhotosFromCloudinary()` line 391 | Line 338 | Duplicate list functionality |
| `generateUploadSignature()` | Line 608 | Line 397 | Duplicated signature generation |

**Problems:**
1. **core.ts** has `uploadPhotoToCloudinary()` which handles everything
2. **cloudinary-upload.ts** line 46 (`uploadImageToCloudinary()`) just wraps it (lines 73-86)
3. Two different functions for deletion: `deletePhotoFromCloudinary()` vs `deleteImageFromCloudinary()`
4. Two different functions for metadata: `getPhotoFromCloudinary()` vs `getImageMetadata()`
5. Two implementations of `generateUploadSignature()` with different signatures
6. Unclear which file is "source of truth"

**Examples:**

**core.ts line 306** - Delete with vendor config:
```typescript
export async function deletePhotoFromCloudinary(vendorId: string, publicId: string, ...): Promise<CloudinaryDeletionResult>
```

**cloudinary-upload.ts line 255** - Delete without vendor (legacy):
```typescript
export async function deleteImageFromCloudinary(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image', config?: {...}): Promise<boolean>
```

**core.ts line 250** - Get metadata with vendor:
```typescript
export async function getPhotoFromCloudinary(vendorId: string, publicId: string, ...): Promise<{...}>
```

**cloudinary-upload.ts line 303** - Get metadata without vendor:
```typescript
export async function getImageMetadata(publicId: string): Promise<{...}>
```

**Recommendation:**
- Keep **core.ts** as the single source of truth (multi-vendor support)
- **cloudinary-upload.ts** should only have utility functions:
  - `TRANSFORMATION_PRESETS` (constants) ✓ Good
  - `CLOUDINARY_FOLDERS` (constants) ✓ Good
  - `getResponsiveImageUrls()` (utility) ✓ Good
- Remove/deprecate from cloudinary-upload.ts:
  - `uploadImageToCloudinary()` (line 46) → use `uploadPhotoToCloudinary()` from core
  - `deleteImageFromCloudinary()` (line 255) → use `deletePhotoFromCloudinary()` from core
  - `getImageMetadata()` (line 303) → use `getPhotoFromCloudinary()` from core
  - `listImagesInFolder()` (line 338) → use `listPhotosFromCloudinary()` from core
  - Duplicate `generateUploadSignature()` (line 397) → consolidate in core

---

## 5. Missing Error Handling in Utility Functions

### Issue: Silent failures and inadequate error propagation

**Files affected:**

#### `src/lib/email.ts` - Multiple issues

**Line 31-34:** Silently fails without error detail
```typescript
if (!process.env.RESEND_API_KEY) {
  return { success: false, error: 'No API key' };  // ❌ Too generic
}
```

**Line 37:** Inline formatting (should use lib/format.ts functions)
```typescript
const formatRupiah = (n: number) => new Intl.NumberFormat(...); // ❌ Duplicates src/lib/format.ts:5
const formatDate = (s: string) => new Date(s).toLocaleDateString(...); // ❌ Duplicates src/lib/format.ts:22
```

**Line 62-64:** Error object not properly serialized
```typescript
} catch (error) {
  console.error('Email error:', error);
  return { success: false, error };  // ❌ Error object not stringified
}
```

#### `src/lib/selection-counter.ts` - Dead code

**Lines 32-42:** No-op functions with no real implementation
```typescript
export async function resetSelectionCount(_galleryId: string): Promise<void> {
  // no-op
}

export async function initSelectionCount(_galleryId: string, _count: number): Promise<void> {
  // no-op
}
```

**Issue:** These functions are exported but do nothing. If they're not used, they should be removed. If they're placeholders, they should have proper error handling or comments explaining why they're needed.

#### `src/lib/format.ts` - No error handling

**Line 22-29 (formatDateTime):** No null check
```typescript
export function formatDateTime(dateString: string): string {  // ❌ No null/undefined check
  return new Date(dateString).toLocaleDateString('id-ID', {...});
}
```

**Line 47-50 (formatPhoneNumber):** No validation
```typescript
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\\D/g, '');  // ❌ No validation if phone is empty after regex
  return digits.startsWith('0') ? '62' + digits.slice(1) : digits;
}
```

**Recommendations:**

**email.ts:**
```typescript
// ✅ Better error handling
if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY not configured');
  return { success: false, error: 'Email service not configured' };
}

// ✅ Reuse format utilities
import { formatRupiah, formatDate } from './format';
// Then use: formatRupiah(hargaPaket), formatDate(tanggalSesi)

// ✅ Serialize error properly
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('Email error:', errorMessage);
  return { success: false, error: errorMessage };
}
```

**format.ts:**
```typescript
// ✅ Add null safety
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {...});
}

// ✅ Add validation
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\\D/g, '');
  if (!digits) return '';  // ✅ Handle empty case
  return digits.startsWith('0') ? '62' + digits.slice(1) : digits;
}
```

**selection-counter.ts:**
```typescript
// Option 1: Remove if not needed
// Option 2: If placeholder for future use, add comments:
/**
 * @deprecated Placeholder for future Redis-based selection counting.
 * Currently using database as source of truth.
 */
export async function resetSelectionCount(_galleryId: string): Promise<void> {
  // TODO: Implement Redis reset when migrating from database
}
```

---

## 6. Type Inconsistencies

### Issue: Missing return types, implicit any, and inconsistent typing

**Files affected:**

#### `src/lib/cloudinary/core.ts`

**Line 77-83:** Missing return type
```typescript
export function getCloudinaryConfig(account: CloudinaryAccountConfig) {  // ❌ No return type
  return {
    cloud_name: account.cloudName,
    api_key: account.apiKey,
    api_secret: account.apiSecret,
  };
}
```

**Should be:**
```typescript
interface CloudinaryConfigCredentials {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}

export function getCloudinaryConfig(account: CloudinaryAccountConfig): CloudinaryConfigCredentials {
  // ...
}
```

**Line 502-514:** Unsafe type casting
```typescript
} catch (error: unknown) {
  console.error("Error testing Cloudinary connection:", error);
  let httpCode = 0;
  if (error && typeof error === 'object' && 'http_code' in error) {
    httpCode = (error as { http_code?: number }).http_code ?? 0;  // ❌ Unsafe as cast
  }
  return {
    status: 'ok' as const,  // ❌ Hardcoding 'ok' even on error
    error: error instanceof Error ? error.message : 'Unknown error',
    http_code: httpCode,
    success: false,
  };
}
```

#### `src/lib/cloudinary-upload.ts`

**Line 191-248:** Missing return type annotation
```typescript
export function getResponsiveImageUrls(publicId: string, options?: {...}): {  // ✓ Has return type
  // This one is correct
}
```

**Line 303-333:** Missing return type (should be explicit)
```typescript
export async function getImageMetadata(publicId: string): Promise<{  // ✓ Correct
  // This one is correct
}
```

#### `src/lib/email.ts`

**Line 6-66:** Missing return type annotation
```typescript
export async function sendBookingConfirmationEmail({...}: {...}) {  // ❌ No return type
  // Function returns { success: boolean; error?: ... } but it's not typed
}
```

**Should be:**
```typescript
export async function sendBookingConfirmationEmail({...}: {...}): Promise<{
  success: boolean;
  error?: string | Error;
}> {
  // ...
}
```

#### `src/lib/format.ts` - All functions have return types ✓ Good

#### `src/hooks/use-admin-events.ts`

**Line 31:** Missing return type
```typescript
async function fetchAdminBookings(page: number, limit: number): Promise<AdminBookingsResponse> {  // ✓ Correct
  // This one is correct
}
```

**Line 41:** Hook return type is implicit
```typescript
export function useAdminEvents(page = 1, limit = 20) {  // ❌ Missing return type
  return useQuery({
    queryKey: ["admin-bookings", page, limit],
    queryFn: () => fetchAdminBookings(page, limit),
  });
}
```

**Should be:**
```typescript
import type { UseQueryResult } from '@tanstack/react-query';

export function useAdminEvents(page = 1, limit = 20): UseQueryResult<AdminBookingsResponse, Error> {
  // ...
}
```

**Similar issues in:**
- `src/hooks/use-admin-galleries.ts` (line 34)
- `src/hooks/use-admin-clients.ts` (line 26)
- `src/hooks/use-admin-metrics.ts` (line 21)

---

## 7. Dead Code and Unused Exports

### Issue: No-op functions exported without clear purpose

**Files affected:**

#### `src/lib/selection-counter.ts` - Lines 32-42

```typescript
/** No-op — database adalah source of truth */
export async function resetSelectionCount(_galleryId: string): Promise<void> {
  // no-op
}

/** No-op — database adalah source of truth */
export async function initSelectionCount(
  _galleryId: string,
  _count: number
): Promise<void> {
  // no-op
}
```

**Problems:**
1. Exported functions that do nothing
2. Underscored parameters suggest they're intentionally unused
3. No consumers visible in codebase (search for usage)
4. Comments say "no-op" but no explanation why they're still exported

**Action required:**
- Search codebase to confirm these are not used
- If not used: remove them
- If used: implement them or document why they're needed

---

## 8. Inconsistent Naming Conventions

### Issue: Mixed naming styles across files

**Files affected:**

#### `src/lib/cloudinary/core.ts` - Inconsistent function naming

```typescript
// Core functions (verb-object pattern):
uploadPhotoToCloudinary()      // ✓ Good: action-target
getPhotoFromCloudinary()       // ✓ Good: getter-target
deletePhotoFromCloudinary()    // ✓ Good: action-target
testCloudinaryConnection()     // ✓ Good: action-target

// But also:
isViesusEnhancementEnabled()   // ✓ Good: is-boolean
getVendorCloudinaryClient()    // ⚠️ Inconsistent: get-target-client (should be getCloudinaryClientForVendor?)
getCloudinaryAccount()         // ✓ Good: getter-target
getCloudinaryConfig()          // ✓ Good: getter-target
```

#### `src/lib/cloudinary-upload.ts` - Inconsistent with core.ts

```typescript
uploadImageToCloudinary()      // ⚠️ upload-object (core uses uploadPhotoToCloudinary)
deleteImageFromCloudinary()    // ⚠️ delete-object (core uses deletePhotoFromCloudinary)
getImageMetadata()             // ⚠️ get-metadata (core uses getPhotoFromCloudinary)
listImagesInFolder()           // ⚠️ list-objects (core uses listPhotosFromCloudinary)
```

**Problem:** When both files have similar functions with different names, it's unclear which to use.

**Recommendation:**
Standardize on one naming scheme:
- Option A: Use "Photo" consistently (photography context)
- Option B: Use "Image" consistently (generic context)
- Preferred: **Option A** since this is a photography platform

---

## 9. Missing JSDoc for Complex Functions

### Issue: Complex functions lack documentation

**Files affected:**

#### `src/lib/cloudinary/core.ts`

**Line 104-200 (uploadPhotoToCloudinary):** Complex multi-mode upload
```typescript
export async function uploadPhotoToCloudinary(
  vendorId: string,
  file: Buffer | string,
  filename: string,
  options: {...}
): Promise<{...}> {  // ❌ No JSDoc

  // Complex logic:
  // - Gets vendor config
  // - Decides chunked vs stream upload
  // - Handles both Buffer and data URL
  // - Returns detailed metadata
}
```

**Should have:**
```typescript
/**
 * Upload a photo to Cloudinary with multi-account support.
 *
 * @param vendorId - Vendor ID to determine Cloudinary account
 * @param file - Photo data as Buffer or data URL string
 * @param filename - Original filename (used for uploaded metadata)
 * @param options - Upload configuration
 * @param options.accountId - Specific Cloudinary account ID (uses default if not provided)
 * @param options.folder - Cloudinary folder path (e.g., 'hafispace/galleries/vendor1')
 * @param options.publicId - Custom public ID (auto-generated if omitted)
 * @param options.overwrite - Whether to overwrite existing asset
 * @param options.resourceType - Type of resource: 'image' | 'video' | 'raw' | 'auto'
 *
 * @returns Upload result with public ID, URLs, and metadata
 *
 * @throws Error if vendor has no active Cloudinary account
 * @throws Error if upload to Cloudinary fails
 *
 * @example
 * const result = await uploadPhotoToCloudinary(vendorId, buffer, 'photo.jpg', {
 *   folder: 'hafispace/galleries/vendor1/gallery1',
 *   resourceType: 'image'
 * });
 */
```

#### `src/lib/cloudinary/core.ts` - Lines 615-720

**uploadPhotoToCloudinaryWithViesus:** Complex upload with enhancement
```typescript
export async function uploadPhotoToCloudinaryWithViesus(
  vendorId: string,
  file: Buffer | string,
  filename: string,
  options: {...}
): Promise<{...}> {  // ❌ No JSDoc
  // Handles VIESUS enhancement integration
}
```

#### `src/lib/selection-counter.ts`

All functions need documentation explaining why they're no-ops:
```typescript
// ❌ Unclear why this exists
export async function getSelectionCount(galleryId: string): Promise<number> {
```

Should be:
```typescript
/**
 * Get the count of unlocked photo selections for a gallery.
 *
 * @param galleryId - Gallery ID to count selections for
 * @returns Number of selected photos (isLocked=false)
 *
 * @note This queries the database directly. Redis/Upstash is not used.
 * Database is the source of truth for selection counts.
 */
export async function getSelectionCount(galleryId: string): Promise<number>
```

---

## 10. Format.ts: Duplicate Formatting in email.ts

### Issue: Formatting logic duplicated across files

**email.ts lines 37-38:**
```typescript
const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { 
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0 
}).format(n);

const formatDate = (s: string) => new Date(s).toLocaleDateString('id-ID', { 
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
});
```

**format.ts lines 5-20:**
```typescript
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
```

**Problems:**
1. Same formatting logic implemented twice
2. **email.ts** version has no null safety
3. **email.ts** version uses slightly different options (weekday included)
4. Maintenance burden: changes need to be made in two places

**Recommendation:**
- Reuse `formatRupiah()` from format.ts
- Create new `formatDateLong()` export for email use case:

```typescript
// format.ts - add new export
export function formatDateLong(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
```

```typescript
// email.ts - use utilities
import { formatRupiah, formatDateLong } from '@/lib/format';

// Then in template:
<strong>Tanggal Sesi:</strong> ${formatDateLong(tanggalSesi)}</p>
<strong>Total:</strong> ${formatRupiah(hargaPaket)}</p>
```

---

## Summary Table

| Category | Severity | Count | Files |
|----------|----------|-------|-------|
| Query Key Patterns | Medium | 4 hooks | use-admin-*.ts |
| Missing Cache Config | Medium | 4 hooks | use-admin-*.ts |
| Hardcoded Values | Low | 4 files | hooks + lib/email.ts |
| Cloudinary Duplication | High | 5 functions | core.ts + cloudinary-upload.ts |
| Error Handling | High | 3 files | email.ts, selection-counter.ts, format.ts |
| Type Inconsistencies | Medium | 5 files | All except format.ts |
| Dead Code | High | 2 functions | selection-counter.ts |
| Naming Inconsistency | Medium | 2 files | core.ts + cloudinary-upload.ts |
| Missing JSDoc | Medium | 7 functions | cloudinary/core.ts, selection-counter.ts |
| Code Duplication | High | 2 functions | email.ts, format.ts |

---

## Action Items (Priority Order)

### 🔴 Critical (Fix First)
1. **Remove or implement** dead code in `selection-counter.ts` (lines 32-42)
2. **Consolidate** Cloudinary functions (core.ts as source of truth)
3. **Add error handling** for API key validation in `email.ts`
4. **Fix type safety** in error handling (cloudinary/core.ts line 502)

### 🟠 High Priority (Fix Soon)
5. **Consolidate** format utilities (email.ts should import from format.ts)
6. **Add return types** to all hook functions (use-admin-*.ts)
7. **Create query key factory** (introduce constants for TanStack Query keys)
8. **Add staleTime/gcTime** to all admin queries

### 🟡 Medium Priority (Fix Next Sprint)
9. **Add JSDoc** to complex functions (cloudinary/core.ts, selection-counter.ts)
10. **Standardize naming** across cloudinary files
11. **Add input validation** to format.ts functions
12. **Move magic numbers** to constants.ts

---

## Files Needing Updates

- [ ] `src/hooks/use-admin-events.ts` - Add return types, staleTime/gcTime, use query key factory
- [ ] `src/hooks/use-admin-galleries.ts` - Add return types, staleTime/gcTime, use query key factory
- [ ] `src/hooks/use-admin-clients.ts` - Add return types, staleTime/gcTime, use query key factory
- [ ] `src/hooks/use-admin-metrics.ts` - Add return types, staleTime/gcTime, use query key factory
- [ ] `src/lib/constants.ts` - Add API endpoints, cache times, pagination limits
- [ ] `src/lib/format.ts` - Add null safety, add formatDateLong(), input validation
- [ ] `src/lib/email.ts` - Import format utilities, fix error handling, add return types
- [ ] `src/lib/cloudinary/core.ts` - Add return types, fix unsafe casts, add JSDoc
- [ ] `src/lib/cloudinary-upload.ts` - Remove duplicated functions, keep only utilities
- [ ] `src/lib/selection-counter.ts` - Remove or implement no-op functions, add JSDoc
- [ ] Create `src/lib/query-keys.ts` - New file with TanStack Query key factory
