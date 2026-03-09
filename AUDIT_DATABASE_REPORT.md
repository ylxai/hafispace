# Database & Prisma Schema Audit Report

## Executive Summary
Comprehensive audit of Prisma schema (`prisma/schema.prisma`) and database-related API routes. Found **14 issues** across schema design, query patterns, and API consistency. Most are medium-severity quality issues; no critical data integrity problems detected.

---

## 1. FIELD NAMING INCONSISTENCIES

### 1.1 Mixed Language: Indonesian vs English
**Severity:** MEDIUM | **Impact:** Code maintainability, API consistency

The codebase mixes Indonesian and English field names inconsistently across models:

#### Vendor Model (prisma/schema.prisma)
- Lines 14-30: Mix of Indonesian (`namaStudio`, `logoUrl`) and English (`phone`, `email`, `status`)
- Lines 14-41: Inconsistent camelCase with Indonesian: `namaStudio`, `googleRefreshToken`, `cloudinaryCloudName`, `dpPercentage`, `rekeningPembayaran`, `syaratKetentuan`, `waAdmin`, `notifEmail`, `notifGalleryDelivered`
- **Issue**: `notifEmail` is English prefix `notif` + English suffix `Email`. Compare with `notifGalleryDelivered` (same pattern) vs `enableViesusEnhancement` (fully English).

#### Booking Model (prisma/schema.prisma, lines 117-152)
- Heavily Indonesian: `kodeBooking`, `namaClient`, `hpClient`, `emailClient`, `paketId`, `paketCustom`, `hargaPaket`, `tanggalSesi`, `lokasiSesi`, `dpAmount`, `dpStatus`
- Mixed in same query responses (e.g., events/route.ts line 39 returns `paket` but schema has `paketCustom`)

#### Package Model (prisma/schema.prisma, lines 73-94)
- Indonesian: `namaPaket`, `harga`, `deskripsi`, `fitur`, `isCustomable`, `urutan`, `kuotaEdit`, `includeCetak`, `maxSelection`

#### CustomField Model (prisma/schema.prisma, lines 262-278)
- **Redundant field naming**: Lines 265 & 271 have `namaField` (Indonesian) and `label` (English) — both serve similar purposes
- Line 272 has `isRequired` (English) but line 268 has `wajib` (Indonesian) — both boolean flags for the same concept
- **Recommendation**: Pick one per concept or establish clear distinction

---

## 2. REDUNDANT COLUMNS

### 2.1 Cloudinary Credentials in Two Tables
**Severity:** MEDIUM | **Impact:** Data consistency, API complexity

**Issue**: Cloudinary credentials exist in both `Vendor` and `VendorCloudinary` models:

**Vendor Model** (prisma/schema.prisma, lines 28-30):
```prisma
cloudinaryCloudName     String?
cloudinaryApiKey        String?
cloudinaryApiSecret     String?
```

**VendorCloudinary Model** (prisma/schema.prisma, lines 55-71):
```prisma
cloudName   String   @map("cloud_name")
apiKey      String   @map("api_key")
apiSecret   String   @map("api_secret")
isDefault   Boolean  @default(false) @map("is_default")
isActive    Boolean  @default(true)  @map("is_active")
```

**Current Code Usage**:
- `src/app/api/admin/galleries/[id]/upload/route.ts` (lines 85-87): Reads from `Vendor` model
- `src/app/api/admin/settings/cloudinary/route.ts` (lines 87-89): Writes to `Vendor` model
- `src/app/api/admin/settings/cloudinary/route.ts` (line 35): Checks vendor's main credentials

**Problem**: `VendorCloudinary` appears designed for multi-account support but `Vendor` maintains legacy/default credentials. When `VendorCloudinary` records exist, it's unclear which should take precedence.

**Recommendation**: 
- Deprecate `cloudinaryCloudName`, `cloudinaryApiKey`, `cloudinaryApiSecret` from `Vendor`
- Use `VendorCloudinary` with `isDefault: true` instead
- Update upload logic to query `VendorCloudinary` with `isDefault` or `isActive` filter

---

### 2.2 CustomField Redundant Boolean Fields
**Severity:** LOW | **Impact:** Code confusion, migration burden

CustomField (prisma/schema.prisma, lines 262-278):
- **Line 268**: `wajib Boolean @default(false)` (Indonesian: "required")
- **Line 272**: `isRequired Boolean @default(false)` (English: "required")

Same semantic meaning, different names. Code should normalize to one.

**Recommendation**: Remove `wajib`, rename schema to use `isRequired` everywhere. Run migration to consolidate.

---

## 3. MISSING INDEXES FOR QUERY PATTERNS

### 3.1 Missing Composite Indexes
**Severity:** MEDIUM | **Impact:** Query performance at scale

#### Vendor Model - No index on frequently filtered fields
- **Line 11**: `username` is `@unique` ✓
- **Line 12**: `email` is `@unique` ✓
- **Missing**: No index on `status` field (line 19) — likely used for filtering active vendors
- **Recommendation**: Add `@@index([status])` for vendor list/filtering operations

#### Booking Model - Suboptimal composite indexes
- **Line 144**: `@@index([vendorId])` — too broad
- **Line 145**: `@@index([vendorId, status])` ✓ Good
- **Line 146**: `@@index([vendorId, tanggalSesi])` ✓ Good
- **Missing**: When filtering by `status` + `createdAt` (common in dashboards), no composite index
- **Recommendation**: Add `@@index([vendorId, status, createdAt])` for dashboard filters

#### Payment Model - Missing vendor+date filter
- **Line 167-169**: Indexes exist for individual foreign keys
- **Missing**: No composite for `@@index([vendorId, createdAt])` — common query for revenue reports
- **Recommendation**: Add `@@index([vendorId, createdAt])`

#### Gallery Model - No index on status+createdAt
- **Line 192-196**: Multiple individual indexes
- **Missing**: `@@index([vendorId, status, createdAt])` for filtering galleries by status + date range
- **Recommendation**: Add for efficient dashboard queries

#### PhotoSelection Model - Redundant indexes
- **Lines 253-258**: Six separate indexes, some overlapping
  - Line 253: `@@index([galleryId, isLocked])`
  - Line 254: `@@index([galleryId, selectedAt])`
  - Line 258: `@@index([galleryId])` — **REDUNDANT** with above two
- **Recommendation**: Remove line 258 (covered by lines 253-254). Consider merging 253+254 into `@@index([galleryId, isLocked, selectedAt])`

---

## 4. MISSING NULLABLE/REQUIRED CONSTRAINTS ISSUES

### 4.1 Inconsistent Nullability in Relations
**Severity:** LOW | **Impact:** Data validation, API contracts

#### Booking Model (prisma/schema.prisma)
- **Line 120**: `clientId` is optional (`String?`) — a booking can exist without a client
- **Line 138**: Relation is `Client?` (optional)
- **Line 139**: Relation is `Package?` (optional)
- **Issue**: If a booking has no `clientId`, the API response (`events/route.ts` line 45) returns `"Unknown"` instead of null, hiding data integrity issues
- **Business Logic Question**: Should a booking always have a client? If yes, change to required `String`

#### Gallery Model (prisma/schema.prisma)
- **Line 176**: `bookingId` is optional (`String?`) — a gallery can exist without a booking
- **Issue**: API at `galleries/route.ts` line 45 safely handles null: `gallery.booking?.namaClient ?? "Unknown"` — but schema doesn't enforce relationship

#### GallerySetting Model (prisma/schema.prisma)
- **Line 202**: `@@unique` on `galleryId` ensures 1:1 relationship — correct
- **Lines 203-213**: All settings are optional Booleans/strings with defaults
- **Issue**: No NOT NULL constraints — allows empty settings rows. Consider `@default` on all fields if they represent required configuration

---

## 5. N+1 QUERY PATTERNS

### 5.1 Potential N+1 in DELETE operations
**Severity:** MEDIUM | **Impact:** Performance for bulk operations

#### src/app/api/admin/clients/route.ts - DELETE handler (lines 72-128)
```typescript
// Line 90: First query — fetch client
const client = await prisma.client.findFirst({...})

// Line 105: SECOND query — count bookings
const bookingCount = await prisma.booking.count({
  where: { clientId },
})
```
**Issue**: Two separate database calls for a single delete operation. If this endpoint is called in a loop, becomes O(n) queries.

**Better approach**: Use `_count` in the first query:
```typescript
const client = await prisma.client.findFirst({
  where: { id: clientId, vendorId: session.user.id },
  select: {
    id: true,
    _count: { select: { bookings: true } }
  }
})
if (client._count.bookings > 0) { ... }
```

#### src/app/api/admin/events/route.ts - DELETE handler (lines 167-228)
```typescript
// Line 186: First query — fetch booking
const booking = await prisma.booking.findFirst({...})

// Line 201: SECOND query — count galleries
const galleryCount = await prisma.gallery.count({
  where: { bookingId },
})
```
Same issue as clients. Should use:
```typescript
const booking = await prisma.booking.findFirst({
  where: { id: bookingId, vendorId: session.user.id },
  select: {
    id: true,
    _count: { select: { galleries: true } }
  }
})
```

#### src/app/api/admin/galleries/route.ts - DELETE handler (lines 107-165)
```typescript
// Line 125: Uses include with _count — CORRECT ✓
const gallery = await prisma.gallery.findFirst({
  where: { id: galleryId, vendorId: session.user.id },
  include: {
    _count: { select: { photos: true, selections: true } }
  }
})
```
This one is already optimized.

---

## 6. MISSING PAGINATION IN LISTING ENDPOINTS

### 6.1 Clients endpoint lacks pagination
**Severity:** MEDIUM | **Impact:** Scalability with large datasets

#### src/app/api/admin/clients/route.ts - GET handler (lines 7-41)
```typescript
const clients = await prisma.client.findMany({
  where: { vendorId: session.user.id },
  // ... select and orderBy
  // NO skip/take — fetches ALL clients
})
```
**Issue**: Fetches all clients without pagination. If a vendor has 10,000 clients, endpoint returns all at once.

**Response** (line 40): `NextResponse.json({ items: formatted })` — no pagination metadata.

**Contrast**: 
- `events/route.ts` (line 16-18): Implements pagination ✓
- `galleries/route.ts` (line 15-17): Implements pagination ✓
- `clients/route.ts`: **NO pagination** ✗
- `packages/route.ts` (line 22): NO pagination ✗

**Recommendation**: Add pagination to both endpoints:
```typescript
const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10)));
const skip = (page - 1) * limit;

const [clients, total] = await Promise.all([
  prisma.client.findMany({ where, skip, take: limit, ... }),
  prisma.client.count({ where })
])
// Return pagination metadata
```

---

## 7. UNUSED FIELDS IN SCHEMA

### 7.1 Fields defined but never queried
**Severity:** LOW | **Impact:** Code clutter, maintenance burden

#### Vendor Model
- **Line 17**: `googleRefreshToken` — Never found in codebase queries
- **Line 18**: `googleFolderId` — Never found in codebase queries
- **Lines 24-27**: R2 storage fields (`r2AccessKeyId`, `r2SecretAccessKey`, `r2BucketName`, `r2Endpoint`) — Never used in any query
- **Purpose**: Likely legacy features or planned future integrations

#### Package Model
- **Line 79**: `fitur` (JSON) — Never queried in any route
- **Line 80**: `isCustomable` — Never used in queries (line 57 in `packages/route.ts` doesn't extract it)
- **Question**: Are these dead code or incomplete implementation?

#### Booking Model
- Line uses `maxSelection` but schema also has `Package.maxSelection` — redundant

#### Client Model
- **Line 103**: `customFields` (JSON) — Defined but never queried or populated
- **Note**: Public booking API (`src/app/api/public/booking/route.ts` line 64) populates this, but admin API never reads it

**Recommendation**: 
- Document intent for Google/R2 fields (legacy/future?)
- Remove unused fields after confirming no active dependencies
- Complete implementation of `fitur`, `isCustomable`, or remove

---

## 8. INCONSISTENT RESPONSE ERROR HANDLING

### 8.1 Raw NextResponse.json() bypassing response helpers
**Severity:** MEDIUM | **Impact:** API consistency, error handling standardization

Response helpers exist at `src/lib/api/response.ts` but not always used:

#### src/app/api/admin/events/route.ts
- **Line 134-137**: Raw `NextResponse.json()` instead of response helper
  ```typescript
  return NextResponse.json(
    { code: "NOT_FOUND", message: "Package not found or unauthorized" },
    { status: 404 }
  );
  ```
  **Should use**: `notFoundResponse("Package not found or unauthorized")`

- **Line 179-182**: Raw JSON for validation error
  ```typescript
  return NextResponse.json(
    { code: "VALIDATION_ERROR", message: "Booking ID is required" },
    { status: 400 }
  );
  ```
  **Should use**: `validationErrorResponse({ id: "Booking ID is required" })`

- **Line 194-197, 206-212, 269-272, 282-285**: Multiple raw responses

#### src/app/api/admin/galleries/route.ts
- **Line 118-121**: Raw validation error
- **Line 138-141**: Raw not found error
- **Line 146-152**: Raw custom error

#### src/app/api/admin/clients/route.ts
- **Line 83-86, 98-101, 110-116, 142-145, 164-167**: Multiple raw responses instead of helpers

#### src/app/api/admin/packages/route.ts
- **Line 121-124**: Raw error for constraint violation
  ```typescript
  return NextResponse.json(
    { error: `Paket digunakan oleh ${bookingCount} booking...` },
    { status: 409 }
  );
  ```
  **Issue**: Uses `error` key instead of `code`+`message` pattern — inconsistent with others

#### src/app/api/admin/settings/route.ts
- **Line 76-79**: Custom validation error response (acceptable, adds `details`)

**Recommendation**: 
- Create additional helpers: `validationErrorResponse(fieldName, message)` for single-field errors
- Create `conflictResponse(message)` for 409 errors
- Audit and replace all raw `NextResponse.json()` in error paths

---

## 9. INCONSISTENT USE OF SELECT vs INCLUDE

### 9.1 Mixed patterns in same codebase
**Severity:** LOW | **Impact:** Query clarity, potential performance issues

#### Pattern 1: SELECT with _count (preferred for list endpoints)
- `src/app/api/admin/events/route.ts` (lines 23-41): ✓ Uses select + _count
- `src/app/api/admin/clients/route.ts` (lines 16-26): ✓ Uses select + _count

#### Pattern 2: INCLUDE with full relations
- `src/app/api/admin/galleries/route.ts` (lines 22-27): Uses include → fetches full booking object
  ```typescript
  include: {
    booking: true,  // Fetches ENTIRE booking record
    _count: { select: { photos: true, selections: true } }
  }
  ```
  **Issue**: Line 45 only uses `gallery.booking?.namaClient` — could be optimized with select:
  ```typescript
  select: {
    booking: { select: { namaClient: true } }
  }
  ```

#### Pattern 3: DELETE handlers with include
- `src/app/api/admin/galleries/route.ts` (lines 130-134): Uses include for _count — acceptable
- `src/app/api/admin/events/route.ts` (lines 186-191): Uses findFirst without count — N+1 issue (see section 5.1)

**Recommendation**: Establish convention:
1. List endpoints: Always use `select` + `_count` (excludes unnecessary fields)
2. Detail endpoints: Can use `include` for nested data if needed
3. Delete pre-checks: Use `select` with `_count` to avoid N+1

---

## 10. QUERY OPTIMIZATION ISSUES

### 10.1 Booking.clientId with unprojected client data
**Severity:** LOW | **Impact:** Potential confusion in API contracts

#### src/app/api/admin/events/route.ts GET (lines 20-49)
```typescript
select: {
  id: true,
  // ... other fields
  paket: { select: { namaPaket: true } },  // ← Nested select for related data
  _count: { select: { galleries: true } },
}
// Line 57: Uses paket.namaPaket
```
**Issue**: Queries `paketId` foreign key but doesn't fetch client data (even though `clientId` exists). Inconsistent with how paket is handled.

**Question**: Should event listing also include client name if `clientId` is set?

### 10.2 Gallery.booking always fetched but selectively used
**Severity:** LOW | **Impact:** Unnecessary data transfer

`src/app/api/admin/galleries/route.ts` line 23:
```typescript
include: {
  booking: true,  // Fetches ALL booking fields
}
// Line 45: Only uses booking?.namaClient
```

Better as:
```typescript
select: {
  booking: { select: { namaClient: true } }
}
```

---

## SUMMARY TABLE

| Issue | Category | Severity | Files Affected | Status |
|-------|----------|----------|----------------|--------|
| Mixed Indonesian/English naming | Inconsistency | MEDIUM | schema.prisma, all routes | Requires refactoring |
| Redundant Cloudinary credentials | Design | MEDIUM | schema.prisma, settings/cloudinary/* | Needs consolidation |
| Redundant CustomField booleans | Design | LOW | schema.prisma | Single migration |
| Missing indexes on status/date | Performance | MEDIUM | schema.prisma | Add 3-4 indexes |
| N+1 in DELETE operations | Performance | MEDIUM | clients, events routes | Consolidate queries |
| No pagination on clients/packages | Scalability | MEDIUM | clients, packages routes | Add pagination |
| Unused schema fields | Maintenance | LOW | schema.prisma | Document/remove |
| Raw NextResponse in errors | Consistency | MEDIUM | All routes | Replace with helpers |
| Inconsistent SELECT vs INCLUDE | Pattern | LOW | galleries route | Standardize |
| Suboptimal nested selects | Optimization | LOW | events, galleries routes | Fine-tune selects |

---

## RECOMMENDATIONS (Priority Order)

### P0 — Do First (Breaking Changes Need Planning)
1. **Consolidate Cloudinary credentials**: Move from `Vendor` → `VendorCloudinary` exclusively
   - Deprecate 3 Vendor fields
   - Add migration to populate `VendorCloudinary` from `Vendor` for existing records
   - Update upload logic to use multi-account

2. **Add missing indexes**: Minimal downtime, significant performance gain
   - `Vendor: @@index([status])`
   - `Booking: @@index([vendorId, status, createdAt])`
   - `Payment: @@index([vendorId, createdAt])`
   - `Gallery: @@index([vendorId, status, createdAt])`
   - Remove redundant `PhotoSelection: @@index([galleryId])`

### P1 — Do Soon (Code Quality)
3. **Add pagination to clients & packages** endpoints
4. **Fix N+1 queries** in DELETE handlers (consolidate to single query with _count)
5. **Replace raw NextResponse.json()** with response helpers (create new ones as needed)
6. **Standardize SELECT patterns**: Use select + _count for lists, include selectively

### P2 — Later (Cleanup)
7. **Remove unused fields**: Google/R2 storage fields if truly legacy
8. **Consolidate CustomField naming**: Remove `wajib`, standardize on `isRequired`
9. **Decide on `fitur`/`isCustomable`**: Complete feature or remove code
10. **Document field purposes**: Clarify intent for optional relations (Booking.clientId, etc.)

---

## Testing Checklist
- [ ] After Cloudinary consolidation: Test upload with default & non-default accounts
- [ ] After index additions: Verify query plans in EXPLAIN output
- [ ] After pagination: Load test clients/packages endpoints with 10k+ records
- [ ] After N+1 fixes: Verify single query execution in slow query logs
- [ ] After error handler unification: Test all error paths return consistent format
- [ ] Full E2E: Create booking → create gallery → upload photos → delete workflow

