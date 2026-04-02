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
**Goal:** Implement shared TypeScript types to eliminate 5+ duplicate type definitions

#### Sprint A: Shared Types (Day 1-3)

**Day 1 - Gallery Types** (`src/types/gallery.ts`)
- [ ] `ApiPhoto` - Ganti 5 definisi Photo berbeda (lightbox, progressive-card, page, modal)
  - Fields: `id, filename, url, thumbnailUrl, width, height, createdAt?, urutan?`
  - NO storageKey (security - never expose to client)
- [ ] `AdminGalleryRow` - Gallery summary untuk admin list
  - Fields: `id, namaProject, status, clientToken, photoCount, selectionCount, clientName, storageProvider, createdAt`
- [ ] `ClientGallery` - Full gallery untuk client view
  - Fields: `id, photos, selections (string[]), settings, isLocked, maxSelection`
- [ ] `GallerySettings` - Konfigurasi galeri
  - Fields: `maxSelection, enableDownload, enablePrint, watermarkEnabled, watermarkText, welcomeMessage, ...`
- [ ] `PhotoSelectionItem` - Selection item (fileId = Photo.id!)
  - Fields: `id, fileId, filename, isLocked, selectedAt, selectionType`

**Day 2 - Booking Types** (`src/types/booking.ts`)
- [ ] `BookingStatus` - `"PENDING" | "CONFIRMED" | "DONE" | "CANCELLED"`
- [ ] `Package` - `id, namaPackage, hargaPackage: number, deskripsi, isActive`
- [ ] `Client` - `id, namaClient, hpClient, emailClient, alamatClient`
- [ ] `Booking` - Full booking dengan package + client embedded
- [ ] `Payment` - `id, jumlahBayar: number, metodeBayar, tanggalBayar, catatan`
- [ ] `BookingSummary` - `booking, payments[], totalBayar, sisaTagihan`

**Day 3 - API Types + Migration** (`src/types/api.ts` update + consumers)
- [ ] `ApiSuccess<T>` wrapper `{ data: T; success: true }`
- [ ] `ApiPaginated<T>` wrapper `{ data: T[]; pagination: {...}; success: true }`
- [ ] Domain response types: `GalleryListResponse`, `ClientGalleryResponse`, `BookingDetailResponse`
- [ ] Migrate `use-admin-galleries.ts` → import `AdminGalleryRow`
- [ ] Migrate `use-admin-events.ts` → import `Booking, Payment`
- [ ] Migrate `gallery/[token]/page.tsx` → import `ApiPhoto, ClientGallery`
- [ ] Migrate `lightbox.tsx` → import `ApiPhoto`
- [ ] Migrate `progressive-photo-card.tsx` → import `ApiPhoto`
- [ ] Remove all local Photo/Gallery/Booking type definitions

#### Sprint B: Auth & process.env Cleanup (Day 4)
- [ ] Add `/api/ably-token` to middleware matcher
- [ ] Fix `process.env.NEXTAUTH_URL` in `src/app/invoice/[kodeBooking]/page.tsx`
- [ ] Fix `process.env.NEXT_PUBLIC_APP_URL` in `edit-gallery-modal.tsx`
- [ ] Fix `process.env.NEXT_PUBLIC_APP_URL` in `gallery/[token]/page.tsx`
- [ ] Document defense-in-depth auth pattern (redundant auth() = intentional)

#### Sprint C: Response Types (Day 5-7)
- [ ] Add `successResponse<T>()` helper to `src/lib/api/response.ts`
- [ ] Add `paginatedResponse<T>()` helper
- [ ] Audit all 35+ API routes (classify response format)
- [ ] Standardize list endpoints → `{ data: [], pagination: {} }`
- [ ] Standardize detail endpoints → `{ data: {} }`
- [ ] Standardize delete endpoints → `{ data: { deleted: true, id } }`
- [ ] Update frontend hooks to use shared response types

#### Sprint D: Optimistic UI (Day 8-10)
- [ ] Photo selection toggle (gallery client) - useGallerySelection hook
- [ ] Gallery publish/unpublish toggle (admin)
- [ ] Package enable/disable toggle (admin)
- [ ] Booking status update (admin)

**Status:** 🟡 Not started  
**Blockers:** None  
**Last commit:** -  
**Estimated:** 10 days total

---

### 🟢 Kiro CLI → `feat/single-gallery-page`

**Worktree:** `.adal/worktrees/gallery-page`  
**Goal:** Build compact single-page gallery view - no tab switching, mobile-first

**Context:**
- Next.js 15 App Router, TypeScript strict, Tailwind CSS v4
- Gallery client page: `src/app/gallery/[token]/page.tsx`
- Sprint 1 components (USE THESE!):
  - `ProgressivePhotoCard` → `src/components/gallery/progressive-photo-card.tsx`
  - `SelectionBottomBar` → `src/components/gallery/selection-bottom-bar.tsx`
- Photo selection: localStorage (local-first), Redis sync via Ably
- Auth: token-based (no login required)

⚠️ **IMPORTANT:** Use local Photo type initially. After `feat/shared-types` merged, rebase and import from `@/types/gallery`.

#### Sprint A: Layout & Core (Day 1-4)

**Day 1 - Layout Design**
- [ ] Design single-page layout (eliminate tab switching)
  ```
  Mobile: Full-width grid + SelectionBottomBar + bottom sheet
  Desktop: Grid (left) + Selection sidebar (right, 280px fixed)
  ```
- [ ] Create new page component or refactor existing
- [ ] Mobile-first responsive breakpoints

**Day 2 - Mobile Implementation**
- [ ] 2-column photo grid dengan `ProgressivePhotoCard`
- [ ] `SelectionBottomBar` integration
- [ ] Bottom sheet for selection review (mobile)
- [ ] Safe area handling (iPhone notch)

**Day 3 - Desktop Implementation**
- [ ] 3-4 column photo grid
- [ ] Fixed sidebar (280px) untuk selection panel
  - Count: "15 / 50 dipilih"
  - Progress bar
  - Selected photos list (thumbnail 40x40)
  - Remove individual + Clear all
  - Submit button

**Day 4 - Filter & Sort**
- [ ] Sort: Terbaru, Terlama
- [ ] Filter: Semua, Terpilih
- [ ] Keyboard navigation (arrow keys, space, enter)

#### Sprint B: Advanced Features (Day 5-7)

**Day 5 - Swipe Gesture (Mobile)**
- [ ] Swipe right = select photo
- [ ] Swipe left = deselect photo
- [ ] Visual feedback during swipe
- [ ] Haptic feedback (vibration API)

**Day 6 - Masonry Layout**
- [ ] Toggle: Grid ↔ Masonry view
- [ ] `react-masonry-css` atau custom CSS
- [ ] Persist preference in localStorage

**Day 7 - Comparison Mode**
- [ ] Select 2 photos → side-by-side comparison
- [ ] Helpful for similar poses

**Status:** 🟡 Not started  
**Blockers:** None  
**Last commit:** -  
**Estimated:** 7 days

---

### ⚠️ Conflict Resolution Table

| File | Rovo Dev needs | Kiro CLI needs | Rule |
|------|---------------|----------------|------|
| `src/app/gallery/[token]/page.tsx` | Import shared types | New layout | Rovo Dev → merge → Kiro rebase |
| `src/components/gallery/progressive-photo-card.tsx` | Import ApiPhoto | Enhance card | Rovo Dev → merge → Kiro rebase |
| `package.json` | - | react-swipeable? | Koordinasi dulu! |
| `src/types/**` | OWNS | READ ONLY | Rovo Dev owner |

### 📅 Merge Order (CRITICAL)
```
1. feat/shared-types (Rovo Dev) → main FIRST
2. feat/single-gallery-page (Kiro CLI) → rebase dari main → merge
```

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

## 🗺️ Refactor Branch Plan

```
main
├── feat/shared-types    ← P0 Foundation (mulai PERTAMA)
├── feat/response-types  ← P1 (setelah shared-types merged)
├── feat/service-layer   ← P1 (setelah response-types merged)
├── fix/auth-cleanup     ← P2 Independent (bisa parallel)
└── feat/optimistic-ui   ← P2 (setelah response-types merged)
```

Note: API Versioning ❌ SKIP (internal platform, tidak dibutuhkan)

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

Selamat datang di Hafiportrait Platform. Berikut semua yang perlu kamu 
tahu sebelum mulai kerja di feat/single-gallery-page.

═══════════════════════════════════════════════════════
 STEP 1: SETUP
═══════════════════════════════════════════════════════

Worktree kamu sudah siap:
  Path: .adal/worktrees/gallery-page
  Branch: feat/single-gallery-page

Cara masuk ke worktree:
  cd .adal/worktrees/gallery-page

Install dependencies (jika belum):
  npm install

═══════════════════════════════════════════════════════
 STEP 2: PAHAMI CODEBASE
═══════════════════════════════════════════════════════

File utama yang akan kamu kerjakan:
  src/app/gallery/[token]/page.tsx     ← Gallery client page (UTAMA)
  src/components/gallery/              ← Gallery components folder

Components Sprint 1 yang WAJIB digunakan (sudah ada di codebase):
  ProgressivePhotoCard:
    Path: src/components/gallery/progressive-photo-card.tsx
    Usage: <ProgressivePhotoCard photo={photo} onClick={...} isSelected={...}
             canSelect={...} onToggleSelect={...} priority={index < 4} />
  
  SelectionBottomBar:
    Path: src/components/gallery/selection-bottom-bar.tsx
    Usage: <SelectionBottomBar selectedCount={n} maxSelection={max}
             isMaxed={...} isLocked={...} onClearAll={...} onSubmit={...} />

Utility yang tersedia:
  cn() function: import { cn } from "@/lib/utils" (clsx + tailwind-merge)
  createFileId(): import { createFileId } from "@/lib/upload-types"

═══════════════════════════════════════════════════════
 STEP 3: ARCHITECTURE YANG HARUS DIPAHAMI
═══════════════════════════════════════════════════════

Cara gallery bekerja:
  1. Client buka URL: /gallery/[token]
  2. Fetch gallery data via TanStack Query
  3. Photo selection disimpan di localStorage DULU (local-first)
  4. Setelah submit → kirim ke server → locked
  
Photo selection pattern:
  - selectedIds = Set<string> (Set of Photo.id)
  - toggle(photo.id) untuk pilih/batal pilih
  - PhotoSelection.fileId = Photo.id (BUKAN storageKey!)
  
State management:
  - useLocalSelection hook untuk selection state
  - isLocked: boolean (setelah submit, read-only)
  - isMaxed: selectedCount >= maxSelection

Photo type sementara (pakai ini dulu, nanti update setelah shared-types):
  type Photo = {
    id: string;
    filename: string;
    url: string;
    thumbnailUrl: string | null;
    width: number | null;
    height: number | null;
    createdAt?: string;
    urutan?: number | null;
  }

JANGAN expose storageKey ke UI (internal Cloudinary identifier, security!)

═══════════════════════════════════════════════════════
 STEP 4: STYLING RULES
═══════════════════════════════════════════════════════

Tailwind CSS v4 (CSS-based config, NO tailwind.config.js):
  - Pakai utility classes langsung
  - Custom properties di src/app/globals.css
  - Theme variables: var(--antique-gold), var(--warm-gray), dll

Design patterns:
  - Mobile-first (sm: md: lg: breakpoints)
  - glass class tersedia untuk glassmorphism effect
  - rounded-xl untuk cards
  - shadow-glass-md untuk card shadows

═══════════════════════════════════════════════════════
 STEP 5: QUALITY GATES (WAJIB SEBELUM PUSH)
═══════════════════════════════════════════════════════

Jalankan sebelum buat PR:
  npm run lint           # 0 errors, 0 warnings
  npx tsc --noEmit       # 0 type errors
  bash scripts/review.sh # Full review check

Pre-push hook AKTIF - auto-run sebelum git push.
Jangan paksa skip hooks!

═══════════════════════════════════════════════════════
 STEP 6: WORKFLOW
═══════════════════════════════════════════════════════

1. Selalu cek .agents/status.md sebelum mulai
2. Update status task di file ini setelah selesai
3. Koordinasi via Messages section di file ini
4. Jangan edit file di luar scope kamu (lihat File Ownership)
5. Sebelum push: git rebase origin/main

Untuk buat PR:
  git push origin feat/single-gallery-page
  Buat PR ke main di GitHub

TUNGGU feat/shared-types merged sebelum:
  - Import dari @/types/gallery
  - Import dari @/types/booking
  Untuk sekarang, definisikan local type di file kamu.

═══════════════════════════════════════════════════════
 STEP 7: TASK LIST KAMU
═══════════════════════════════════════════════════════

Lihat section "🟢 Kiro CLI → feat/single-gallery-page" di atas.

Sprint A (Day 1-4):
  - Single-page layout (no tab switching)
  - Mobile: grid + SelectionBottomBar + bottom sheet
  - Desktop: grid + selection sidebar (280px)
  - Filter & sort

Sprint B (Day 5-7):
  - Swipe gesture (mobile)
  - Masonry layout toggle
  - Comparison mode (2 photos side by side)

Good luck! Update .agents/status.md kalau ada blocker atau questions.
🚀
- Rovo Dev
```
