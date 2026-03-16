# Admin Compact & Mobile-First — Implementation Checklist

> Branch: `feat/admin-compact-mobile`
> Dibuat: 9 Maret 2026
> Status: 🚧 In Progress

---

## Fase 1 — Foundation (Low effort, High impact)

### 1A. Shared Types & Utils
- [ ] Buat `src/types/admin.ts` — shared types `AdminClient`, `AdminGallery`, `AdminBooking`, `AdminPackage`
- [ ] Hapus duplikat `formatRupiah` di `events/page.tsx` → import dari `src/lib/format.ts`
- [ ] Hapus duplikat type definitions di masing-masing page, ganti dengan import dari `src/types/admin.ts`
- [ ] Hapus file `src/components/admin/navigation.tsx` — dead code (sudah digantikan sidebar)

### 1B. Mobile Card Stack untuk Events
- [x] Mobile card view sudah ada di events/page.tsx (`sm:hidden`) — verified ✅
- [x] Desktop table `hidden sm:block` sudah ada — verified ✅
- [x] Touch-friendly layout sudah diimplementasikan

### 1C. URL-Persistent Filter State
- [x] Events page — filter dipindah ke URL params (`?search=`, `?status=`, `?from=`, `?to=`)
  - `setFilter()` helper menggantikan semua `setState` filter
  - Filter berubah → `router.push()` dengan params baru, reset ke page 1
  - Mount: baca dari `useSearchParams()`
  - Filter aktif → `showFilter` otomatis terbuka
- [x] Galleries page — tidak ada filter state yang perlu dipersist (hanya bulk action)

---

## Fase 2 — Component Refactor (Medium effort)

### 2A. Events Page Refactor (927 → ~100 baris)
- [ ] Buat `events/_components/events-table.tsx` — desktop table view
- [ ] Buat `events/_components/events-filter-bar.tsx` — search + status + date filter
- [ ] Buat `events/_components/events-bulk-actions.tsx` — bulk action bar
- [ ] Buat `events/_components/events-summary-bar.tsx` — stat ringkasan (active, draft, dll)
- [ ] Refactor `events/page.tsx` — orkestrator, max ~120 baris

### 2B. Shared Admin Components
- [ ] Buat `components/admin/shared/page-header.tsx` — consistent page header (title + subtitle + CTA button)
- [ ] Buat `components/admin/shared/filter-bar.tsx` — generic search + dropdown filter
- [ ] Buat `components/admin/shared/bulk-action-bar.tsx` — generic bulk action (count + actions)
- [ ] Buat `components/admin/shared/empty-state.tsx` — consistent empty state dengan ilustrasi
- [ ] Apply shared components ke semua halaman admin (events, galleries, clients, packages)

---

## Fase 3 — Dashboard Mobile Optimization (Medium effort)

### 3A. Progressive Loading
- [ ] Bungkus `RevenueChart` dan `TopPackagesChart` dengan `<Suspense>` + skeleton
- [ ] Bungkus `SessionCalendar` dengan `<Suspense>` + skeleton
- [ ] Pastikan `MetricsCards` dan `RecentBookings` load pertama (above the fold)

### 3B. Dashboard Mobile Layout
- [ ] Mobile (< 768px):
  - [ ] Metrics: 2x2 grid compact (icon kecil, angka besar)
  - [ ] Quick Actions: 2 tombol ("Tambah Event", "Lihat Gallery")
  - [ ] Recent Bookings: 3 item terbaru (list, bukan table)
  - [ ] Charts: hidden di mobile atau collapsed accordion
- [ ] Desktop: layout saat ini dipertahankan (4 metrics + charts + calendar)
- [ ] Tambah Quick Actions component di bawah MetricsCards

---

## Fase 4 — Compact UI System (Low effort)

### 4A. Consistent Spacing & Typography
- [ ] Audit semua padding — standardisasi: `p-2`, `p-3`, `p-4`, `p-6`
- [ ] Table row height: `h-10` (40px) untuk compact, `h-12` (48px) untuk standard
- [ ] Label font size: `text-xs` untuk secondary labels, `text-sm` untuk content

### 4B. Settings Accordion
- [ ] Refactor `settings/page.tsx` — semua panel default collapsed
- [ ] Klik panel header → expand konten panel tersebut
- [ ] Hanya satu panel bisa expand sekaligus (atau multiple, sesuai UX preference)
- [ ] Simpan state expanded panel di `localStorage` agar persists

### 4C. Galleries Compact Cards
- [ ] Update `galleries/page.tsx` — card dengan thumbnail placeholder
- [ ] Grid: 1 kolom mobile, 2 kolom tablet, 3 kolom desktop
- [ ] Card info: Nama project, client, tanggal, foto count badge, status badge
- [ ] Hover/tap actions: Edit, Lihat Gallery, Delete

### 4D. Clients Compact List
- [ ] Avatar initials (32px circle) di setiap row
- [ ] Inline search dengan real-time filter
- [ ] Pagination terpasang (sudah ada di API)

---

## Global Patterns

- [ ] Semua page: loading state pakai `<Skeleton />` yang sudah ada
- [ ] Semua page: error state pakai `<ErrorState />` yang sudah ada
- [ ] Semua page: empty state konsisten
- [ ] Touch target minimum 44px untuk semua interactive elements
- [ ] Text truncation dengan `truncate` class + `title` attribute untuk tooltip

---

## Quality Gate (Wajib Sebelum Merge)

- [ ] `npm run lint` — 0 error, 0 warning
- [ ] `npm run build` — sukses tanpa TypeScript error
- [ ] Manual test di mobile viewport (360px, 390px, 414px)
- [ ] Manual test di desktop (1280px, 1440px)
- [ ] Semua modal masih berfungsi
- [ ] Pagination berfungsi
- [ ] Bulk actions berfungsi

---

## Progress Log

| Tanggal | Fase | Keterangan |
|---------|------|------------|
| 9 Mar 2026 | Setup | Branch `feat/admin-compact-mobile` dibuat |

---

## Rollback

Jika perlu rollback ke versi sebelum compact:
```bash
git checkout main
```

Branch `feat/admin-compact-mobile` tidak akan di-merge sampai semua checklist selesai dan QA pass.
