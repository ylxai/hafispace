# API Routes Code Quality Audit Report

## Executive Summary

Audit of 8 API endpoints across `/src/app/api/admin/` and `/src/app/api/public/` for code quality, security, and consistency issues.

**Key Findings:**
- ✅ Good: Auth checks mostly consistent, Zod validation widely used
- ⚠️ 12 issues found: Response inconsistencies, missing error handlers, duplicate logic, missing HTTP methods
- 🔴 Critical: Some endpoints missing validation on body/query params

---

## 1. RESPONSE SHAPE INCONSISTENCIES

### Issue 1.1: Inconsistent Success Response Shapes
**Severity:** High (affects API contract consistency)

| File | Pattern | Should be |
|------|---------|-----------|
| `src/app/api/admin/galleries/[id]/route.ts:75-88` | `{ message, photo }` | Use helper or consistent shape |
| `src/app/api/admin/galleries/[id]/route.ts:162-165` | `{ message, photoCount }` | Use helper or consistent shape |
| `src/app/api/admin/galleries/[id]/photos/route.ts:70` | `{ success: true }` | Flat response |
| `src/app/api/admin/galleries/[id]/photos/route.ts:139` | `{ success, deleted }` | Flat response |
| `src/app/api/admin/galleries/[id]/selections/route.ts:75-83` | `{ selections, stats }` | Nested response |
| `src/app/api/public/gallery/[token]/select/route.ts:198-204` | `{ success, action, fileId, selectionCount, maxSelection }` | Flat response |
| `src/app/api/public/gallery/[token]/submit/route.ts:82-89` | `{ success, lockedCount, totalSelections, message }` | Flat response |

**Recommendation:** Create response helpers for:
- Success responses: `successResponse(data)`
- Paginated responses: `paginatedResponse(items, pagination)`
- Standard error responses (already have helpers in `response.ts`)

---

## 2. MISSING INPUT VALIDATION (Zod)

### Issue 2.1: Unvalidated Query/Body Parameters

**`src/app/api/public/gallery/[token]/route.ts` (Lines 50-55)**
- ❌ `cursor` and `limit` query params NOT validated
- Current: `parseInt(url.searchParams.get("limit") ?? String(PHOTOS_PER_PAGE), 10)`
- Missing bounds check on `cursor` format
- **Fix:** Add Zod schema for pagination query params
```typescript
const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(PHOTOS_PER_PAGE),
});
```

**`src/app/api/admin/galleries/[id]/route.ts` (Lines 32-43)**
- ❌ `POST` handler checks multipart/form-data but doesn't validate via Zod
- File validation is manual, should use schema
- **Fix:** Create file upload validation schema

---

## 3. INCONSISTENT ERROR HANDLING PATTERNS

### Issue 3.1: Mixed Error Response Formats

**Lines 44-47 in `src/app/api/admin/galleries/[id]/photos/route.ts`:**
```typescript
return NextResponse.json(
  { code: "NOT_FOUND", message: "Photo not found" },
  { status: 404 }
);
```
✅ Uses consistent format

**Lines 105-111 in `src/app/api/admin/galleries/[id]/upload/route.ts`:**
```typescript
return NextResponse.json(
  { 
    error: "No Cloudinary account configured...",
    code: "CLOUDINARY_NOT_CONFIGURED"
  },
  { status: 400 }
);
```
❌ Inconsistent: `error` instead of `message`

**Lines 120-123 in `src/app/api/admin/galleries/[id]/upload/route.ts`:**
```typescript
return NextResponse.json(
  { error: `Maximum ${MAX_FILES_PER_UPLOAD} files per upload` },
  { status: 400 }
);
```
❌ Inconsistent: Only has `error`, missing `code`

**Similar issues in `src/app/api/public/gallery/[token]/route.ts` (Line 17, 92):**
```typescript
return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
```
❌ Uses `error` instead of `code` + `message` pattern

**Fix:** Standardize all error responses to:
```typescript
{ code: "ERROR_CODE", message: "User-friendly message" }
```

---

## 4. MISSING HTTP METHOD HANDLERS

### Issue 4.1: Route Only Has POST, Should Have GET

**`src/app/api/admin/galleries/[id]/selections/route.ts`**
- ✅ Has GET (line 16), PATCH (line 93), DELETE (line 160)
- Good: Follows REST conventions

**`src/app/api/admin/bookings/[id]/route.ts`**
- ✅ Has GET (line 7), PATCH (line 124)
- ✅ Missing DELETE handler (common pattern for resources)
- If DELETE is intentional, document why

---

## 5. DUPLICATE LOGIC - SHOULD BE EXTRACTED

### Issue 5.1: Gallery Authorization Check (Repeated 4+ times)

**`src/app/api/admin/galleries/[id]/route.ts:21-26` (POST handler)**
```typescript
const gallery = await prisma.gallery.findUnique({
  where: {
    id: galleryId,
    vendorId: session.user.id,
  },
});
```

**`src/app/api/admin/galleries/[id]/route.ts:110-115` (PUT handler)**
```typescript
const gallery = await prisma.gallery.findUnique({
  where: {
    id: galleryId,
    vendorId: session.user.id,
  },
});
```

**`src/app/api/admin/galleries/[id]/upload/route.ts:76-90` (POST handler)**
```typescript
const gallery = await prisma.gallery.findUnique({
  where: {
    id: galleryId,
    vendorId: session.user.id,
  },
  include: { vendor: { select: { ... } } },
});
```

**`src/app/api/admin/galleries/[id]/selections/route.ts:29-46` (GET handler)**
```typescript
const gallery = await prisma.gallery.findUnique({
  where: {
    id: galleryId,
    vendorId: session.user.id,
  },
  include: { selections: {...}, photos: {...} },
});
```

**Fix:** Extract helper function:
```typescript
// src/lib/api/gallery-helpers.ts
export async function getGalleryOrThrow(
  galleryId: string,
  vendorId: string,
  options?: { include?: Record<string, unknown> }
) {
  const gallery = await prisma.gallery.findUnique({
    where: { id: galleryId, vendorId },
    ...options,
  });
  
  if (!gallery) {
    throw new ApiError("Gallery not found", { code: "NOT_FOUND", status: 404 });
  }
  
  return gallery;
}
```

### Issue 5.2: Photo Ownership Verification (Repeated 2+ times)

**`src/app/api/admin/galleries/[id]/photos/route.ts:30-35` (DELETE)**
```typescript
const photo = await prisma.photo.findFirst({
  where: {
    id: photoId,
    galleryId,
    gallery: { vendorId: session.user.id },
  },
});
```

**`src/app/api/admin/galleries/[id]/selections/route.ts:104-111` (PATCH)**
```typescript
const selection = await prisma.photoSelection.findUnique({
  where: { id: selectionId },
  include: { gallery: { select: { vendorId: true } } },
});

if (!selection || selection.gallery.vendorId !== session.user.id) {
  // throw
}
```

**Fix:** Extract helper for vendor authorization checks.

### Issue 5.3: Token Expiry Check (Repeated 2+ times)

**`src/app/api/public/gallery/[token]/route.ts:99-104`**
```typescript
if (gallery.tokenExpiresAt && gallery.tokenExpiresAt < new Date()) {
  return NextResponse.json(..., { status: 410 });
}
```

**`src/app/api/public/gallery/[token]/select/route.ts`** - NOT checked
**`src/app/api/public/gallery/[token]/submit/route.ts`** - NOT checked

**Issue:** Token expiry check is missing in 2 public endpoints!

**Fix:** Create middleware or extract helper:
```typescript
function checkTokenExpiry(gallery: { tokenExpiresAt: Date | null }) {
  if (gallery.tokenExpiresAt && gallery.tokenExpiresAt < new Date()) {
    throw new ApiError("Token expired", { code: "TOKEN_EXPIRED", status: 410 });
  }
}
```

---

## 6. MISSING AUTH CHECKS

### Issue 6.1: Public Endpoints Missing Gallery Status Check

**`src/app/api/public/gallery/[token]/select/route.ts:48-52`**
- ✅ Checks `gallery.status === "DRAFT"`
- Good

**`src/app/api/public/gallery/[token]/submit/route.ts:20-22`**
- ✅ Checks `gallery.status === "DRAFT"`
- Good

**`src/app/api/public/gallery/[token]/route.ts:91-96`**
- ✅ Checks `gallery.status === "DRAFT"`
- Good

✅ Status checks are consistent across public endpoints.

### Issue 6.2: Missing Admin Auth in selections/route.ts PATCH & DELETE

**`src/app/api/admin/galleries/[id]/selections/route.ts:93-98` (PATCH)**
```typescript
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }
  // ...but galleryId is NOT extracted from params!
}
```
❌ Missing `{ params }` parameter - **this endpoint has a BUG!**
- Function signature should be: `PATCH(request: Request, { params }: { params: Promise<{ id: string }> })`
- Currently, `params` is undefined, so gallery ID can't be validated

**Same issue in DELETE handler (line 160)**

**Fix:**
```typescript
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }  // ADD THIS
) {
  const { id: galleryId } = await params;
  // ... rest of code
}
```

---

## 7. HARDCODED VALUES - SHOULD BE CONSTANTS

### Issue 7.1: Magic Numbers Without Constants

| Location | Value | Should be constant |
|----------|-------|-------------------|
| `src/app/api/admin/galleries/[id]/upload/route.ts:11` | `15 * 1024 * 1024` | ✅ Assigned to `MAX_FILE_SIZE` |
| `src/app/api/admin/galleries/[id]/upload/route.ts:12` | `100` | ✅ Assigned to `MAX_FILES_PER_UPLOAD` |
| `src/app/api/admin/galleries/[id]/upload/route.ts:173` | `5` | ❌ `BATCH_SIZE` hardcoded, should be constant |
| `src/app/api/public/gallery/[token]/route.ts:5` | `50` | ✅ Assigned to `PHOTOS_PER_PAGE` |
| `src/app/api/public/gallery/[token]/route.ts:54` | `100` | ❌ Hardcoded max limit, should reference constant |
| `src/app/api/public/gallery/[token]/route.ts:6` | `24 * 60 * 60` | ✅ Assigned to `FINGERPRINT_TTL_SECONDS` |
| `src/app/api/public/gallery/[token]/select/route.ts:22` | `120` | ❌ Rate limit hardcoded, should be constant |
| `src/app/api/public/gallery/[token]/select/route.ts:22` | `60_000` | ❌ Rate limit window hardcoded |

**Fix:** Create `src/lib/constants/api.ts`:
```typescript
export const UPLOAD_BATCH_SIZE = 5;
export const MAX_PHOTOS_PER_PAGE = 100;
export const SELECT_RATE_LIMIT = 120;
export const SELECT_RATE_LIMIT_WINDOW_MS = 60_000;
```

---

## 8. DEAD CODE & UNUSED IMPORTS

### Issue 8.1: Unused Imports

**`src/app/api/admin/galleries/[id]/upload/route.ts:7`**
```typescript
import { getCloudinaryAccount, deletePhotoFromCloudinary } from "@/lib/cloudinary";
```
- ✅ `getCloudinaryAccount` is used (line 103)
- ✅ `deletePhotoFromCloudinary` is used (line 278)
- All imports are used

**`src/app/api/public/gallery/[token]/route.ts:2`**
```typescript
import { redis } from "@/lib/redis";
```
- ✅ Used at line 28

All imports checked - **no dead code found**.

### Issue 8.2: Unused Variables

**`src/app/api/admin/galleries/[id]/selections/route.ts:160`**
```typescript
export async function DELETE(request: Request) {
  // request is used at line 168
```
- ✅ Used

**`src/app/api/public/gallery/[token]/route.ts:44`**
```typescript
export async function GET(
  _request: Request,  // prefixed with _ but IS used
  { params }: { params: Promise<{ token: string }> }
) {
```
- Line 50: `const url = new URL(_request.url);`
- Line 135: `_request.headers.get("cookie")`
- ✅ Used (remove underscore prefix)

---

## 9. RESPONSE HELPER USAGE

### Issue 9.1: Some Routes Use Helpers, Others Don't

**Using helpers (✅):**
- `src/app/api/admin/galleries/[id]/route.ts`: Uses `unauthorizedResponse()`, `notFoundResponse()`, `validationErrorResponse()`, `internalErrorResponse()`
- `src/app/api/admin/galleries/[id]/photos/route.ts`: Uses `unauthorizedResponse()`
- `src/app/api/admin/galleries/[id]/selections/route.ts`: Uses `unauthorizedResponse()`
- `src/app/api/admin/galleries/[id]/upload/route.ts`: Uses all 4 helpers
- `src/app/api/admin/bookings/[id]/route.ts`: Uses 3 helpers

**Not using helpers (❌):**
- `src/app/api/public/gallery/[token]/route.ts`: Returns inline `NextResponse.json({ code: "NOT_FOUND", ... }, { status: 404 })`
- `src/app/api/public/gallery/[token]/select/route.ts`: Returns inline responses
- `src/app/api/public/gallery/[token]/submit/route.ts`: Returns inline responses

**Fix:** Update public endpoints to use response helpers.

---

## 10. MISSING VALIDATION DETAILS

### Issue 10.1: `src/app/api/admin/bookings/[id]/route.ts` - PATCH Missing Request Body Try-Catch

**Lines 138-142:**
```typescript
const body = await request.json();  // ❌ Can throw if invalid JSON
const parsed = updateSchema.safeParse(body);
if (!parsed.success) {
  return validationErrorResponse(parsed.error.format());
}
```

**Issue:** If `request.json()` throws (malformed JSON), error is NOT caught.

**Fix:**
```typescript
try {
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.format());
  }
  // ...
} catch (error) {
  if (error instanceof SyntaxError) {
    return validationErrorResponse("Invalid JSON");
  }
  throw error;
}
```

---

## 11. TRANSACTION & CONCURRENCY ISSUES

### Issue 11.1: Race Condition - View Count Increment

**`src/app/api/public/gallery/[token]/route.ts:155-162`**
```typescript
const alreadyViewed = hasCookie || await isAlreadyViewed(fingerprintHash);

if (!alreadyViewed) {
  await prisma.gallery.update({
    where: { id: gallery.id },
    data: { viewCount: { increment: 1 } },
  });
}
```

**Issue:** Between check and update, another request could increment. However:
- ✅ Uses atomic `{ increment: 1 }` at DB level
- ✅ Fingerprint check + cookie provides good deduplication
- ⚠️ Could still race if fingerprint check fails (edge case)

**Current approach is acceptable** but document the trade-off.

---

## 12. PAGINATION SAFETY

### Issue 12.1: Cursor Validation Missing

**`src/app/api/public/gallery/[token]/route.ts:50-51, 111`**
```typescript
const cursor = url.searchParams.get("cursor") ?? undefined;
// ...
...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
```

**Issue:** No validation that `cursor` is a valid UUID.
- Malformed cursor could cause DB error or weird behavior

**Fix:**
```typescript
const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(PHOTOS_PER_PAGE),
});

const { cursor, limit } = paginationSchema.parse({
  cursor: url.searchParams.get("cursor"),
  limit: url.searchParams.get("limit"),
});
```

---

## Summary Table: Issues by Severity

| Severity | Count | Issue Type |
|----------|-------|-----------|
| 🔴 Critical | 3 | Missing params in PATCH/DELETE handlers, Token expiry not checked in 2 endpoints, Unvalidated JSON parsing |
| 🟠 High | 5 | Response shape inconsistencies, Error format inconsistencies, Hardcoded limits without constants |
| 🟡 Medium | 4 | Missing Zod validation on query params, Duplicate logic patterns, Missing cursor validation, Rate limit values hardcoded |

---

## Recommended Priority Fixes

### Phase 1 (Critical - Do First)
1. **Fix PATCH/DELETE params in `selections/route.ts`** - These endpoints are currently broken
2. **Add token expiry check to `select` and `submit` endpoints**
3. **Wrap `request.json()` in try-catch in bookings PATCH**

### Phase 2 (High Priority)
4. Create response helper `successResponse()` and update all endpoints
5. Standardize all error responses to `{ code, message }` format
6. Extract gallery authorization helper function

### Phase 3 (Medium Priority)
7. Add Zod validation for query parameters (pagination, rate limit config)
8. Extract token expiry check into helper
9. Move hardcoded values to constants
10. Remove underscore prefix from `_request` if used

