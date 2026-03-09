# PRD: Peningkatan Sistem & Bug Fixes — Hafiportrait Platform

## Overview
PRD ini mencakup perbaikan bugs frontend+backend dan peningkatan sistem secara menyeluruh
untuk meningkatkan stabilitas, reliability, dan UX platform Hafiportrait. Fokus utama
adalah error handling yang lebih baik, loading states yang konsisten, form validation
yang jelas, dan eliminasi `any` type yang tersisa.

## Goals
- Tidak ada unhandled error yang menyebabkan blank screen atau crash di production
- Semua halaman admin punya loading state + error state yang proper
- Form validation memberikan feedback yang jelas dan user-friendly
- Eliminasi `any` type tersisa untuk mempertahankan strict TypeScript
- API reliability: error response yang konsisten di semua endpoint

## Quality Gates

Perintah berikut WAJIB sukses untuk setiap user story:
- `npm run lint` — 0 error, 0 warning
- `npm run build` — build sukses tanpa TypeScript error

Untuk user story yang mengubah Prisma schema, tambahan:
- `npx prisma validate` — schema valid
- `npx prisma generate` — client ter-generate

---

## User Stories

### US-001: Fix `any` type di revenue-chart.tsx
**Description:** Sebagai developer, saya ingin `revenue-chart.tsx` bebas dari `any` type
agar TypeScript strict terpenuhi dan tidak ada potential runtime error.

**Acceptance Criteria:**
- [ ] `CustomTooltip` tidak menggunakan `any[]` untuk `payload`
- [ ] Semua props di `CustomTooltip` punya type yang eksplisit dari Recharts
- [ ] `entry` di `payload.map()` punya type yang tepat
- [ ] File lulus `npm run build` tanpa TypeScript error

---

### US-002: Skeleton loading state di halaman admin events
**Description:** Sebagai admin, saya ingin melihat skeleton placeholder saat data events
sedang di-fetch agar halaman tidak terasa "kosong" atau "freeze".

**Acceptance Criteria:**
- [ ] Halaman `/admin/events` menampilkan skeleton cards saat `isLoading = true`
- [ ] Skeleton punya dimensi yang mirip dengan card event sebenarnya
- [ ] Skeleton menggunakan animasi pulse (Tailwind `animate-pulse`)
- [ ] Setelah data loaded, skeleton diganti dengan konten nyata
- [ ] Tidak ada layout shift yang signifikan saat transisi loading → loaded

---

### US-003: Skeleton loading state di halaman admin galleries
**Description:** Sebagai admin, saya ingin melihat skeleton placeholder saat data galleries
sedang di-fetch.

**Acceptance Criteria:**
- [ ] Halaman `/admin/galleries` menampilkan skeleton saat `isLoading = true`
- [ ] Skeleton merepresentasikan gallery card (thumbnail placeholder + text lines)
- [ ] Animasi pulse konsisten dengan US-002
- [ ] Tidak ada layout shift saat transisi

---

### US-004: Error state yang informatif di halaman admin
**Description:** Sebagai admin, saya ingin melihat pesan error yang jelas beserta tombol
retry jika fetch data gagal, bukan halaman kosong.

**Acceptance Criteria:**
- [ ] Halaman `/admin/events` menampilkan error state jika fetch gagal
- [ ] Halaman `/admin/galleries` menampilkan error state jika fetch gagal
- [ ] Halaman `/admin/clients` menampilkan error state jika fetch gagal
- [ ] Error state berisi: ikon error, pesan singkat, tombol "Coba Lagi"
- [ ] Tombol "Coba Lagi" trigger refetch query
- [ ] Error state menggunakan komponen yang reusable (`<ErrorState />`)

---

### US-005: Form validation feedback di create-booking-modal
**Description:** Sebagai admin, saya ingin form booking memberikan feedback validasi
per-field secara real-time agar tidak harus submit dulu untuk tahu field mana yang salah.

**Acceptance Criteria:**
- [ ] Setiap field required menampilkan pesan error di bawah field jika kosong saat submit
- [ ] Field `tanggalSesi` validasi: tidak boleh tanggal yang sudah lewat
- [ ] Field `hargaPaket` validasi: harus angka positif
- [ ] Pesan error hilang ketika field sudah diisi dengan benar
- [ ] Tombol submit di-disable saat form belum valid
- [ ] Validasi menggunakan Zod schema yang konsisten dengan API validation

---

### US-006: Form validation feedback di payment-modal
**Description:** Sebagai admin, saya ingin form input pembayaran memberikan feedback
validasi yang jelas sebelum submit.

**Acceptance Criteria:**
- [ ] Field `jumlah` validasi: harus angka positif, tidak boleh kosong
- [ ] Field `tipe` validasi: harus pilih salah satu (DP/PELUNASAN/LAINNYA)
- [ ] Pesan error muncul di bawah field yang tidak valid
- [ ] Tombol simpan di-disable selama ada field tidak valid atau sedang loading
- [ ] Tidak bisa submit jika tidak ada bukti bayar untuk tipe DP

---

### US-007: Konsistensi error response format di API admin
**Description:** Sebagai developer, saya ingin semua API admin route menggunakan
response helper dari `src/lib/api/response.ts` secara konsisten agar error
handling di frontend lebih predictable.

**Acceptance Criteria:**
- [ ] Semua catch blocks di `/api/admin/` menggunakan `internalErrorResponse()` atau helper yang sesuai
- [ ] Tidak ada catch block yang return raw `error.message` ke client
- [ ] Semua 404 response menggunakan `notFoundResponse()`
- [ ] Semua 401 response menggunakan `unauthorizedResponse()`
- [ ] Tidak ada `NextResponse.json({ error: ... })` manual yang tidak pakai helper

---

### US-008: Reusable `<ErrorState />` dan `<Skeleton />` components
**Description:** Sebagai developer, saya ingin ada komponen UI reusable untuk error state
dan loading skeleton agar implementasi US-002 hingga US-004 konsisten.

**Acceptance Criteria:**
- [ ] Buat `src/components/ui/error-state.tsx` dengan props: `message`, `onRetry`
- [ ] Buat `src/components/ui/skeleton.tsx` dengan variant: `card`, `table-row`, `text`
- [ ] Kedua komponen menggunakan Tailwind CSS (konsisten dengan design system)
- [ ] Export dari `src/components/ui/index.ts`
- [ ] Tidak ada `any` type di kedua komponen

---

### US-009: Pagination di halaman admin events & galleries
**Description:** Sebagai admin, saya ingin data events dan galleries di-paginate
agar halaman tidak lambat saat data sudah banyak.

**Acceptance Criteria:**
- [ ] Halaman `/admin/events` menampilkan max 20 items per halaman
- [ ] Halaman `/admin/galleries` menampilkan max 20 items per halaman
- [ ] Ada kontrol navigasi halaman (Previous / Next / nomor halaman)
- [ ] URL mengandung query param `?page=N` agar bisa di-bookmark/share
- [ ] Total count ditampilkan (misal: "Menampilkan 1-20 dari 87 events")
- [ ] API endpoint mendukung `?page=N&limit=20` query params

---

### US-010: Database query optimasi — hindari N+1 di listings
**Description:** Sebagai developer, saya ingin query di listing endpoints tidak
melakukan N+1 query agar response API tetap cepat seiring bertambahnya data.

**Acceptance Criteria:**
- [ ] `GET /api/admin/events` menggunakan single query dengan `include` yang tepat
- [ ] `GET /api/admin/galleries` menggunakan single query dengan `include` yang tepat
- [ ] `GET /api/admin/clients` menggunakan single query dengan `include` yang tepat
- [ ] Tidak ada loop yang memanggil `prisma.*` di dalam array iteration
- [ ] Query menggunakan `select` untuk membatasi field yang di-fetch

---

## Functional Requirements

- FR-1: Semua halaman admin yang fetch data WAJIB punya 3 state: loading, error, success
- FR-2: Error state WAJIB punya tombol retry yang trigger refetch
- FR-3: Form validation WAJIB konsisten antara frontend (Zod) dan backend (API route)
- FR-4: Tidak ada `any` type di seluruh codebase setelah semua US selesai
- FR-5: Semua API admin menggunakan response helpers dari `src/lib/api/response.ts`
- FR-6: Komponen `ErrorState` dan `Skeleton` harus reusable dan tidak ada duplikasi

## Non-Goals
- Unit testing / E2E testing (dikerjakan di PRD terpisah)
- Redesign UI besar-besaran
- Fitur baru yang belum ada sama sekali
- Push notification atau real-time alert baru

## Technical Considerations
- Gunakan TanStack Query (`useQuery`) untuk semua data fetching
- Skeleton: Tailwind `animate-pulse` + `bg-slate-200` rounded divs
- Pagination: URL query param `?page=N` (bisa di-bookmark)
- Response helpers sudah ada di `src/lib/api/response.ts`
- Recharts types tersedia di package `recharts` — gunakan `TooltipProps`

## Success Metrics
- 0 blank screen / unhandled error di semua halaman admin
- Semua halaman menampilkan loading state saat fetch
- `npm run build` lulus tanpa warning TypeScript
- `npm run lint` lulus dengan 0 error

## Open Questions
- US-009: Pagination pakai URL query param atau state lokal? (Rekomendasi: URL)
- US-010: Perlu tambah database index jika query masih lambat setelah optimasi?
