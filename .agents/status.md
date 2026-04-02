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
