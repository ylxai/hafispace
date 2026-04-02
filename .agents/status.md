# 🤖 Multi-Agent Status & Progress Tracker

> **Last Updated:** 2026-04-02  
> **Agents:** Rovo Dev (Atlassian) + Kiro CLI (Amazon)  
> **Coordination:** Read this file FIRST before starting any work.

---

## 📊 Active Worktrees

| Worktree Path | Branch | Agent | Status | Priority |
|---------------|--------|-------|--------|----------|
| `/scrapper/my-platform` (main) | `main` | Rovo Dev | ✅ Stable | - |
| `.adal/worktrees/shared-types` | `feat/shared-types` | **Rovo Dev** | 🟡 Ready to start | P1 |
| `.adal/worktrees/gallery-page` | `feat/single-gallery-page` | **Kiro CLI** | 🟡 Ready to start | P1 |
| `.adal/worktrees/feat-storage-scalling` | `feat-storage-scalling` | TBD | ⏸️ On hold | P3 |

---

## 📋 Task Board

### 🔵 Rovo Dev → `feat/shared-types`

**Worktree:** `.adal/worktrees/shared-types`  
**Goal:** Implement shared TypeScript types to eliminate duplicate type definitions

**Tasks:**
- [ ] Create `src/types/gallery.ts`
  - `ApiPhoto` - Photo type for API responses (no storageKey)
  - `AdminGalleryRow` - Gallery summary for admin list
  - `ClientGallery` - Full gallery for client view
  - `PhotoSelectionItem` - Selection with fileId = Photo.id
  - `GallerySettings` - Gallery configuration
- [ ] Create `src/types/booking.ts`
  - `Booking` - Full booking type
  - `Payment` - Payment record
  - `Package` - Photography package
  - `Client` - Client data
  - `BookingSummary` - Booking + payments + calculations
  - `BookingStatus` - Status enum
- [ ] Update `src/types/api.ts`
  - `ApiSuccess<T>` - Standard success response wrapper
  - `ApiPaginated<T>` - Paginated response
  - Domain response types (BookingListResponse, etc)
- [ ] Migrate hooks to use shared types
- [ ] Migrate components to use shared types
- [ ] Remove local type definitions

**Status:** 🟡 Not started  
**Blockers:** None  
**Last commit:** -

---

### 🟢 Kiro CLI → `feat/single-gallery-page`

**Worktree:** `.adal/worktrees/gallery-page`  
**Goal:** Build compact single-page gallery view for clients

**Context about the platform:**
- Next.js 15 App Router, TypeScript strict, Tailwind CSS v4
- Gallery client page: `src/app/gallery/[token]/page.tsx`
- Sprint 1 components available:
  - `ProgressivePhotoCard` - Progressive loading photo card
  - `SelectionBottomBar` - Sticky selection bar
- Photo selection stored in localStorage (local-first)
- Realtime counter via Ably

**Tasks:**
- [ ] Design compact single-page layout (no tab switching)
- [ ] Integrate `ProgressivePhotoCard` for photo grid
- [ ] Integrate `SelectionBottomBar` for selection UX
- [ ] Mobile-first responsive design
- [ ] Smooth scroll with photo groups
- [ ] Selection summary sidebar (desktop) / bottom sheet (mobile)

**Status:** 🟡 Not started  
**Blockers:** None  
**Last commit:** -

---

## 🚦 Coordination Rules

### ⚠️ CRITICAL: Read Before Working

1. **Check this file FIRST** - See what other agent is doing
2. **Update status** when you start/finish tasks
3. **Never edit shared files** without coordination (see ownership below)
4. **Rebase before PR** - Always `git rebase origin/main` before creating PR
5. **Sequential merges** - Only one agent merges at a time

### 📁 File Ownership

```
Rovo Dev owns:
  src/types/**              ← Shared types (PRIMARY)
  src/lib/api/**            ← API utilities
  src/hooks/**              ← Shared hooks
  docs/**                   ← Documentation

Kiro CLI owns:
  src/app/gallery/**        ← Gallery client pages
  src/components/gallery/** ← Gallery components

SHARED (coordinate before editing):
  AGENTS.md                 ← Coordination document
  .agents/status.md         ← This file
  package.json              ← Dependencies
  prisma/schema.prisma      ← Database schema
  src/middleware.ts          ← Auth middleware
```

### 🔄 Sync Protocol

```
Before starting work:
  1. git pull origin main
  2. git rebase origin/main (if branch exists)
  3. Read .agents/status.md

After finishing task:
  1. Update .agents/status.md (task status)
  2. npm run lint (0 errors required)
  3. bash scripts/review.sh (review before PR)
  4. git push origin <branch>
  5. Create PR
  6. Notify other agent (update status.md)

After merge to main:
  1. Update .agents/status.md
  2. Other agent MUST rebase: git rebase origin/main
```

---

## 🏗️ Architecture Decisions

### PhotoSelection.fileId = Photo.id ✅
- `fileId` in `PhotoSelection` stores `Photo.id` (NOT storageKey)
- This is intentional - abstracts from storage implementation
- `storageKey` is NEVER exposed to client API (security)

### Sprint 1 Components (already merged to main)
- `ProgressivePhotoCard` - Use this for all photo grids
- `SelectionBottomBar` - Use this for selection UX
- `useResumableUpload` - For admin uploads
- `FileUploadId` (branded type) - For file tracking

### Photo Types
- `ApiPhoto` = Public-safe photo (no storageKey, no vendorId)
- `AdminPhoto` = Full photo (includes admin-only fields)
- Never expose `storageKey` to client

---

## 📝 Change Log

| Date | Agent | Action |
|------|-------|--------|
| 2026-04-02 | Rovo Dev | Setup worktrees, created this file |

---

## 🚀 Dependency Graph

```
main (stable)
    │
    ├── feat/shared-types (Rovo Dev)
    │   └── Merge first → other branches rebase
    │
    └── feat/single-gallery-page (Kiro CLI)
        └── Can import from @/types/gallery after shared-types merged
```

**Recommended merge order:**
1. `feat/shared-types` → main (Rovo Dev, 2-3 days)
2. `feat/single-gallery-page` → main (Kiro CLI, rebase after step 1)

---

## 🔧 Complete Refactor Backlog

> Status: PLANNED | IN_PROGRESS | DONE | SKIPPED

### Phase 1: Foundation (Priority P0-P1)

#### 1.1 Shared Types ← Rovo Dev (feat/shared-types)
| Task | Status | Notes |
|------|--------|-------|
| `src/types/gallery.ts` - ApiPhoto, ClientGallery, AdminGalleryRow, GallerySettings, PhotoSelectionItem | 🔲 PLANNED | Eliminate 5 duplicate Photo types |
| `src/types/booking.ts` - Booking, Payment, Package, Client, BookingSummary, BookingStatus | 🔲 PLANNED | Eliminate scattered booking types |
| `src/types/api.ts` update - ApiSuccess<T>, ApiPaginated<T>, domain response types | 🔲 PLANNED | Standardize response shapes |
| Migrate 5 hooks to shared types | 🔲 PLANNED | Remove local type definitions |
| Migrate 8+ components to shared types | 🔲 PLANNED | Remove local type definitions |

#### 1.2 Auth Pattern Cleanup
| Task | Status | Notes |
|------|--------|-------|
| Remove redundant `auth()` calls from 7 admin routes (middleware already protects) | 🔲 PLANNED | Defense-in-depth OK, but document it |
| Add `/api/ably-token` to middleware matcher | 🔲 PLANNED | Currently unprotected |

#### 1.3 Direct process.env Access
| Task | Status | Notes |
|------|--------|-------|
| `src/lib/cors.ts` | ✅ SKIPPED | Valid exception (build-time import by next.config.ts) |
| `src/app/api/public/booking/route.ts` | ✅ DONE | Fixed in PR #57 |
| `src/app/invoice/[kodeBooking]/page.tsx` | 🔲 PLANNED | Still uses process.env.NEXTAUTH_URL |
| `src/app/admin/galleries/_components/edit-gallery-modal.tsx` | 🔲 PLANNED | process.env.NEXT_PUBLIC_APP_URL |
| `src/app/gallery/[token]/page.tsx` | 🔲 PLANNED | process.env.NEXT_PUBLIC_APP_URL |

---

### Phase 2: Service Layer (Priority P2)

#### 2.1 GalleryService
| Task | Status | Notes |
|------|--------|-------|
| `src/lib/services/gallery.service.ts` | 🔲 PLANNED | Extract from 8+ routes |
| `verifyGalleryOwnership()` - replace 8x repeated code | 🔲 PLANNED | Currently inline in each route |
| `calculateNextPhotoOrder()` | 🔲 PLANNED | Used in 2 places |
| `syncPhotosFromCloudinary()` | 🔲 PLANNED | Complex logic in route |
| `deleteGallery()` with Cloudinary rollback | 🔲 PLANNED | Error-prone inline code |
| Refactor 5 gallery routes to use service | 🔲 PLANNED | Reduce each from ~150 to ~60 lines |

#### 2.2 BookingService
| Task | Status | Notes |
|------|--------|-------|
| `src/lib/services/booking.service.ts` | 🔲 PLANNED | Extract from routes |
| `getBookingDetail()` with payment summary | 🔲 PLANNED | Complex calculation inline |
| `calculateBookingSummary()` | 🔲 PLANNED | totalBayar, sisaTagihan calculation |
| `generateInvoiceUrl()` | 🔲 PLANNED | Used in 2 places |
| Refactor 3 booking routes | 🔲 PLANNED | |

#### 2.3 EventService
| Task | Status | Notes |
|------|--------|-------|
| `src/lib/services/event.service.ts` | 🔲 PLANNED | events/route.ts = 278 lines! |
| `getEvents()` with filters | 🔲 PLANNED | |
| `createEvent()` | 🔲 PLANNED | |
| `updateEvent()` with nested upsert | 🔲 PLANNED | Complex nested operations |
| `deleteEvent()` + `bulkDeleteEvents()` | 🔲 PLANNED | |
| Refactor events/route.ts (278 → ~60 lines) | 🔲 PLANNED | |

---

### Phase 3: Response Types Standardization (Priority P2)

| Task | Status | Notes |
|------|--------|-------|
| Add `successResponse<T>()` helper to response.ts | 🔲 PLANNED | |
| Add `paginatedResponse<T>()` helper | 🔲 PLANNED | |
| Audit all 35+ API routes response format | 🔲 PLANNED | 4 different formats found |
| Standardize list endpoints → `{ data: [], pagination: {} }` | 🔲 PLANNED | |
| Standardize detail endpoints → `{ data: {} }` | 🔲 PLANNED | |
| Standardize delete endpoints → `{ data: { deleted: true } }` | 🔲 PLANNED | |
| Update frontend hooks to use shared response types | 🔲 PLANNED | Remove inline type assertions |

---

### Phase 4: UX & Performance (Priority P2-P3)

#### 4.1 Optimistic UI
| Task | Status | Notes |
|------|--------|-------|
| Photo selection toggle (gallery client) | 🔲 PLANNED | High frequency, user expects instant |
| Gallery publish/unpublish toggle | 🔲 PLANNED | Admin dashboard |
| Package enable/disable toggle | 🔲 PLANNED | Admin dashboard |
| Booking status update | 🔲 PLANNED | Admin dashboard |

#### 4.2 Database Indexes
| Task | Status | Notes |
|------|--------|-------|
| Analyze production query logs | 🔲 PLANNED | Need production data first |
| `Booking @@index([vendorId, status])` | 🔲 PLANNED | Frequent filter |
| `Booking @@index([vendorId, tanggalSesi])` | 🔲 PLANNED | Calendar queries |
| `Gallery @@index([vendorId, status])` | 🔲 PLANNED | Frequent filter |
| `Photo @@index([galleryId, createdAt])` | 🔲 PLANNED | Pagination |
| `PhotoSelection @@index([galleryId, isLocked])` | 🔲 PLANNED | Count queries |

#### 4.3 Race Condition
| Task | Status | Notes |
|------|--------|-------|
| Photo upload quota check (atomic transaction) | ✅ DONE | Fixed in PR #58 |

---

### Phase 5: Gallery Client Experience (Priority P1) ← Kiro CLI

| Task | Status | Notes |
|------|--------|-------|
| Compact single-page gallery view | 🔲 PLANNED | No tab switching |
| Masonry layout option | 🔲 PLANNED | Pinterest-style |
| Swipe-to-select (mobile) | 🔲 PLANNED | Touch gesture |
| AI smart photo selection | 🔲 PLANNED | Suggest best photos |
| Filter & sort options | 🔲 PLANNED | Date, quality, etc |
| Comparison mode | 🔲 PLANNED | Compare 2 photos side by side |

---

### Phase 6: Storage Scaling (Priority P3) ← On Hold

| Task | Status | Notes |
|------|--------|-------|
| Cloudflare R2 integration | ⏸️ ON HOLD | feat-storage-scalling branch |
| Dual upload (Cloudinary + R2) | ⏸️ ON HOLD | |
| Download via presigned URL | ⏸️ ON HOLD | |
| Multi-account R2 per vendor | ⏸️ ON HOLD | |

---

### Technical Debt (Low Priority)

| Task | Status | Notes |
|------|--------|-------|
| `isEncryptionConfigured()` now reads process.env directly | ✅ DONE | Fixed in PR #62 |
| `encryption.test.ts` skipped test | ✅ DONE | Fixed in PR #62 |
| Prettier + prettier-plugin-tailwindcss | 🔲 PLANNED | After all PRs stable |
| `eslint-plugin-tailwindcss` | ✅ SKIPPED | Not compatible with Tailwind v4 |
| API versioning (/api/v1/) | ✅ SKIPPED | Internal platform only, not needed |
| JSDoc for public utility functions | ✅ DONE | Done in PR #58, #61 |

---

### Already Done ✅

| Task | Done In | Notes |
|------|---------|-------|
| Remove duplicate src/middleware.ts | PR #56 | Critical fix |
| Standardize auth() pattern | PR #56, #57 | All routes consistent |
| Fix process.env in booking route | PR #57 | Use env object |
| Add Zod schemas for bulk operations | PR #57 | Validation |
| Add request ID propagation to logger | PR #58 | Observability |
| Fix invalid date handling (formatDate) | PR #58 | UX fix |
| Standardize error format (6 routes) | PR #58 | Consistency |
| Add JSDoc to resource-auth functions | PR #58 | Documentation |
| FileUploadId branded type | PR #61 | Type safety |
| Upload pattern documented in AGENTS.md | PR #62 | Knowledge sharing |
| Pre-push hook (lint+typecheck+tests) | PR #62 | Quality gate |
| Local review script (scripts/review.sh) | PR #62 | Developer workflow |
| vitest.config.ts with @/ alias | PR #62 | Test infrastructure |
| src/lib/utils.ts (cn function) | PR #62 | Missing utility |
| Progressive loading (gallery) | PR #59, #60 | Sprint 1 |
| SelectionBottomBar | PR #59, #60 | Sprint 1 |
| Upload compression + retry | PR #59, #60 | Sprint 1 |
| ESLint plugins (unused-imports, import-sort) | PR #62 | Code quality |
| Husky pre-commit hooks | PR #60, #62 | Quality gate |

---

## 💬 Messages Between Agents

> Use this section to leave notes for each other

**From Rovo Dev to Kiro CLI:**
```
Hi Kiro! 

Context untuk feat/single-gallery-page:

1. Worktree sudah siap di: .adal/worktrees/gallery-page
2. Branch: feat/single-gallery-page (dari main 05e63f2)
3. Existing gallery page: src/app/gallery/[token]/page.tsx

Sprint 1 components yang sudah tersedia (gunakan ini!):
- ProgressivePhotoCard: src/components/gallery/progressive-photo-card.tsx
- SelectionBottomBar: src/components/gallery/selection-bottom-bar.tsx

Important patterns:
- Photo selection: use photo.id (not storageKey)
- File tracking: import createFileId from @/lib/upload-types
- Styling: Tailwind CSS v4 (no config file, CSS-based)
- Auth: Gallery access via token only (no login)

Pre-push hook aktif - akan auto-run lint + typecheck + tests sebelum push.
Run: bash scripts/review.sh sebelum buat PR.

Jika butuh shared types (ApiPhoto, etc), tunggu feat/shared-types 
di-merge dulu ke main, baru rebase.

Good luck! 🚀
- Rovo Dev
```
