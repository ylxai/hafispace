# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

### API Error Response Pattern
- Always use response helpers from `@/lib/api/response.ts` for consistent error handling
- Import helpers at the top: `import { unauthorizedResponse, notFoundResponse, validationErrorResponse, internalErrorResponse } from '@/lib/api/response'`
- Use `unauthorizedResponse()` for 401 (auth required)
- Use `notFoundResponse(message)` for 404 (resource not found)
- Use `validationErrorResponse(details)` for 400 (validation errors)
- Use `internalErrorResponse(message)` for 500 (server errors)
- Never use manual `NextResponse.json({ error: ... }, { status: ... })` — always use helpers
- All error responses have consistent format: `{ code: string, message: string, details?: unknown }`

### Form Validation Pattern
- Use Zod schemas from `@/lib/api/validation` for both client and server validation
- Implement controlled inputs with `useState` for form data
- Add `validateField()` function that validates individual fields using Zod schema
- Add `handleFieldChange()` that updates state and clears errors when user corrects input
- Use `onBlur` for validation trigger (validates when user leaves field)
- Use `onChange` with conditional validation (only if error exists) for real-time feedback
- Disable submit button based on: `isSubmitting || hasErrors || missingRequiredFields`
- ZodError uses `issues` array, not `errors` array

### Loading & Error State Pattern
- Always use `<ErrorState />` from `@/components/ui` for error states with retry functionality
- Always use `<Skeleton />` from `@/components/ui` for loading states
- ErrorState props: `message` (optional, default: "Failed to load data"), `onRetry` (optional callback)
- Skeleton variants: `card` (gallery/client cards), `table-row` (event tables), `text` (text lines)
- Skeleton `count` prop controls how many skeleton items to render
- Pattern: `{isLoading ? <Skeleton variant="card" count={6} /> : actualContent}`
- Pattern: `{error && <ErrorState message="..." onRetry={() => refetch()} />}`

### Pagination Pattern
- API endpoints accept `?page=N&limit=20` query params (default: page=1, limit=20)
- Use Prisma `skip` and `take`: `skip = (page - 1) * limit`, `take = limit`
- Always fetch data and count in parallel: `Promise.all([findMany(...), count(...)])`
- Response format: `{ items: [...], pagination: { page, limit, total, totalPages } }`
- Frontend uses URL query params for pagination state (bookmarkable)
- Use `useSearchParams()` + `useRouter()` to read/update page param
- Query key must include pagination params: `queryKey: ["resource", page, limit]`
- Wrap page in Suspense if using `useSearchParams()`: `<Suspense><Content /></Suspense>`
- Use `<Pagination />` component from `@/components/ui` for consistent UI
- Validate limit input: `Math.max(1, Math.min(100, parseInt(limit ?? "20", 10)))`
- Hide pagination if `totalPages <= 1`

### N+1 Query Prevention Pattern
- Always use single query with `include` or `select` to fetch related data
- Use `_count` for aggregations instead of separate count queries: `_count: { select: { relation: true } }`
- Never call `prisma.*` inside loops or array iterations
- For pagination, fetch data and count in parallel: `Promise.all([findMany(...), count(...)])`
- For complex lookups, fetch all data once and use `Map` for O(1) access
- Example: `const photoMap = new Map(photos.map(p => [p.id, p])); items.map(item => photoMap.get(item.photoId))`
- Pattern: `include: { relation: { select: { field: true } } }` for nested data
- Pattern: `select: { field: true, relation: { select: { nestedField: true } } }` for explicit field selection

---

## 2026-03-09 - US-005
- Implemented real-time form validation feedback in create-booking-modal
- Added client-side validation using Zod schema consistent with API validation
- Added validation for past dates on `tanggalSesi` field
- Added validation for positive numbers on `hargaPaket` field
- Error messages appear below fields and clear when corrected
- Submit button disabled when form is invalid or has validation errors
- Files changed: `src/app/admin/events/_components/create-booking-modal.tsx`
- **Learnings:**
  - ZodError has `issues` property, not `errors` (TypeScript caught this)
  - Controlled inputs required for real-time validation feedback
  - Validation should happen on `onBlur` for initial check, then `onChange` if error exists
  - Submit button disable logic needs to check: errors object, required fields, and submitting state
  - Custom validation (like past date check) should happen before Zod schema validation
  - Pattern: validate individual fields using `schema.shape[fieldName].parse(value)`
---

## 2026-03-09 - US-006
- Implemented real-time form validation feedback in payment-modal
- Added client-side validation using Zod schema (copied from API route for consistency)
- Field `jumlah` validates: must be positive number, shows error if empty or <= 0
- Field `tipe` validates: must be one of DP/PELUNASAN/LAINNYA (always valid due to select)
- Field `buktiBayar` validates: must be Cloudinary URL, shows error if missing
- Error messages appear below fields with red border and background
- Submit button disabled when: `isSaving || isUploading || hasErrors || !jumlah || !buktiBayar`
- Validation triggers on `onBlur` for initial check, then `onChange` if error exists
- Files changed: `src/app/admin/events/_components/payment-modal.tsx`
- **Learnings:**
  - Reused payment schema from API route (`src/app/api/admin/bookings/[id]/payments/route.ts`) for consistency
  - TypeScript strict mode requires explicit check: `const firstIssue = err.issues[0]; if (firstIssue) { ... }`
  - Used nullish coalescing assignment (`??=`) to avoid ESLint warning
  - Upload state (`isUploading`) must also disable submit button to prevent premature submission
  - Error state for file upload field shows red border on the dropzone container
  - When removing uploaded file, must also clear the `buktiBayar` error from state
---

## 2026-03-09 - US-007
- Implemented consistent error response format across all admin API routes
- Replaced all manual `NextResponse.json({ error: ... })` with response helpers
- All 404 responses now use `notFoundResponse()`
- All 401 responses already use `unauthorizedResponse()` (no changes needed)
- All 400 validation responses now use `validationErrorResponse()`
- All 500 internal errors now use `internalErrorResponse()`
- Files changed:
  - `src/app/api/admin/packages/route.ts`
  - `src/app/api/admin/settings/cloudinary/route.ts`
  - `src/app/api/admin/settings/cloudinary/accounts/route.ts`
  - `src/app/api/admin/bookings/[id]/route.ts`
  - `src/app/api/admin/bookings/[id]/payments/route.ts`
  - `src/app/api/admin/bookings/[id]/payments/upload/route.ts`
  - `src/app/api/admin/bookings/reminder/route.ts`
  - `src/app/api/admin/galleries/[id]/route.ts`
  - `src/app/api/admin/galleries/[id]/upload/route.ts`
  - `src/app/api/admin/custom-fields/route.ts`
- **Learnings:**
  - All admin API routes now have consistent error response format with `code`, `message`, and optional `details` fields
  - Response helpers from `src/lib/api/response.ts` provide type-safe, consistent error responses
  - Pattern: Import all needed helpers at the top: `import { unauthorizedResponse, notFoundResponse, validationErrorResponse, internalErrorResponse } from '@/lib/api/response'`
  - Pattern: Replace manual error responses with helper calls: `return notFoundResponse("Resource not found")` instead of `return NextResponse.json({ error: "..." }, { status: 404 })`
  - Most routes already used `unauthorizedResponse()` and `validationErrorResponse()` correctly
  - Main fixes were for 404 and 500 errors that were using manual responses
  - Bulk operation routes (events/bulk, clients/bulk, galleries/bulk, selections/bulk) already use consistent error format with structured error codes
  - Total of 10 files updated across the admin API routes
---


## 2026-03-09 - US-008
- Created reusable `<ErrorState />` and `<Skeleton />` components for consistent loading and error states
- `ErrorState` component already existed with proper props: `message` (optional), `onRetry` (optional)
- Created `Skeleton` component with three variants: `card`, `table-row`, `text`
- Both components use Tailwind CSS with `animate-pulse` for loading animation
- Exported both components from `src/components/ui/index.ts`
- Files changed:
  - `src/components/ui/skeleton.tsx` (created)
  - `src/components/ui/index.ts` (updated exports)
- **Learnings:**
  - Pattern: Skeleton variants should match actual content structure (card layout, table rows, text lines)
  - Pattern: Use `bg-slate-200/60` or `bg-slate-200/80` for skeleton backgrounds with opacity variations
  - Pattern: Card skeleton uses `rounded-3xl border border-slate-200 bg-white/50 backdrop-blur-sm` to match actual card styling
  - Pattern: Table row skeleton uses `<tr>` with `<td>` elements to maintain table structure
  - Pattern: Use `Array.from({ length: count })` to generate multiple skeleton items
  - Pattern: Each skeleton variant has a `count` prop to control how many items to render
  - ErrorState component already existed and met all acceptance criteria (icon, message, retry button)
  - Skeleton component provides consistent loading states across admin pages (events, galleries, clients)
---

## 2026-03-09 - US-009
- Implemented pagination for admin events and galleries pages
- Added reusable `<Pagination />` component with Previous/Next and page numbers
- API endpoints now support `?page=N&limit=20` query params
- Both endpoints return pagination metadata: `{ page, limit, total, totalPages }`
- Frontend uses URL query params (`?page=N`) for bookmarkable pagination state
- Updated hooks to accept page and limit parameters with proper query key invalidation
- Wrapped pages in Suspense boundaries (required for useSearchParams in Next.js 15)
- Files changed:
  - `src/components/ui/pagination.tsx` (created)
  - `src/components/ui/index.ts` (export Pagination)
  - `src/app/api/admin/events/route.ts` (pagination support)
  - `src/app/api/admin/galleries/route.ts` (pagination support)
  - `src/hooks/use-admin-events.ts` (pagination params)
  - `src/hooks/use-admin-galleries.ts` (pagination params)
  - `src/app/admin/events/page.tsx` (pagination UI + Suspense)
  - `src/app/admin/galleries/page.tsx` (pagination UI + Suspense)
- **Learnings:**
  - Pattern: API pagination uses `skip` and `take` with Prisma: `skip = (page - 1) * limit`
  - Pattern: Always return both data and count in parallel: `Promise.all([findMany(...), count(...)])`
  - Pattern: Response format includes `pagination: { page, limit, total, totalPages }`
  - Pattern: Frontend uses `useSearchParams()` + `useRouter()` for URL-based pagination state
  - Pattern: Query key must include page and limit: `queryKey: ["admin-bookings", page, limit]`
  - Gotcha: `useSearchParams()` requires Suspense boundary in Next.js 15 (prerender error otherwise)
  - Gotcha: Must wrap page component: `<Suspense fallback={...}><Content /></Suspense>`
  - Pattern: Pagination component shows "Menampilkan X-Y dari Z" for better UX
  - Pattern: Hide pagination if totalPages <= 1 (no need to show single page)
  - Pattern: Ellipsis (...) for large page counts, show current page ± 1 and first/last pages
  - Pattern: Limit input validation: `Math.max(1, Math.min(100, limit))` to prevent abuse
---

## 2026-03-09 - US-010
- Verified all listing endpoints are already optimized for N+1 query prevention
- No changes needed — all endpoints already follow best practices
- Files verified (no changes):
  - `src/app/api/admin/events/route.ts` (uses `select` with `paket` relation + `_count`)
  - `src/app/api/admin/galleries/route.ts` (uses `include` with `booking` + `_count`)
  - `src/app/api/admin/clients/route.ts` (uses `select` with `_count`)
  - `src/app/api/admin/packages/route.ts` (uses `select` with `_count`)
  - `src/app/api/admin/galleries/[id]/selections/route.ts` (uses `include` + Map for O(1) lookup)
- **Learnings:**
  - Pattern: All listing endpoints already use single queries with proper `include`/`select`
  - Pattern: Aggregations use `_count` instead of separate queries (prevents N+1)
  - Pattern: No loops calling `prisma.*` inside array iterations
  - Pattern: Parallel queries use `Promise.all([findMany(...), count(...)])` for pagination
  - Pattern: Complex lookups use `Map` for O(1) access (e.g., photoMap in selections endpoint)
  - Gotcha: The selections endpoint cleverly avoids N+1 by fetching all photos once, then using Map for lookups
  - All acceptance criteria were already met from previous implementations
---
