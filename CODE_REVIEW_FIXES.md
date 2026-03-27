# Code Review Fixes — Progress Checklist

Tanggal: 2026-03-24
Update: 2026-03-27
Status: **IN PROGRESS** — Phase 7-9 MERGED ✅, Phase 10 (Medium #14, #17) MERGED ✅

---

## Summary

Hasil deep code review pada full codebase Hafiportrait Platform.
Total: **22 issues** — 6 Critical, 7 High, 6 Medium, 3 Low.

---

## CRITICAL

- [x] **#1** Selection DELETE menghapus foto asli dari Cloudinary ✅ MERGED
  - Fix: Hapus `deletePhotoFromCloudinary` dari DELETE handler selection

- [x] **#2** XSS di email template — user input tidak di-escape ✅ MERGED
  - Fix: `escapeHtml()` + `[\r\n]` stripping (email header injection prevention)

- [x] **#3** Public invoice endpoint leak data sensitif vendor ✅ MERGED
  - Fix: Hapus `phone`, `email`, `rekeningPembayaran` dari public response

- [x] **#4** Race condition pada kodeBooking generation ✅ MERGED
  - Fix: Atomic retry on Prisma P2002 — hapus pre-check `findFirst`

- [x] ~~**#5** `src/middleware.ts` dead code — x-request-id tidak pernah diset~~ **INVALID**
  - `x-request-id` sudah diset dengan benar di `middleware.ts` via `res.headers.set("x-request-id", requestId)`
  - Middleware berjalan normal — tidak ada masalah

- [ ] **#6** R2 credentials disimpan plaintext di database
  - File: `prisma/schema.prisma:26-27`
  - Fix: Encrypt `r2AccessKeyId` dan `r2SecretAccessKey` dengan AES-256-GCM
  - Impact: Jika DB bocor, R2 storage account compromised
  - Note: Field sudah ada di schema tapi R2 belum diimplementasi — wajib encrypt saat implementasi R2

---

## HIGH

- [ ] **#7** Login endpoint tidak ada rate limiting
  - File: NextAuth default handler
  - Fix: Tambah rate limiting pada login route
  - Impact: Brute force attack

- [x] **#8** Cloudinary global config race condition (multi-tenant) ✅ MERGED
  - File: `src/lib/cloudinary/core.ts:11-15`
  - Fix: Hapus module-level config, semua operasi pakai per-request credentials via `getCloudinaryConfig()`
  - Impact: Concurrent requests dari vendor berbeda tidak akan cross-contaminate config

- [x] **#9** N+1 query pada gallery PUT sync ✅ MERGED
  - File: `src/app/api/admin/galleries/[id]/route.ts:139-171`
  - Fix: Batch select existing keys + single `createMany` + `skipDuplicates: true`
  - Impact: 100 foto = 300 DB queries → 3 queries

- [x] **#10** `generateUploadSignature` pakai global env bukan vendor secret ✅ MERGED
  - File: `src/lib/cloudinary/core.ts:662-665`
  - Fix: Fetch vendor-specific credentials, sekarang async dengan optional `accountId` parameter
  - Impact: Signature generation pakai vendor-specific `apiSecret`, bukan global env

- [x] **#11** Booking DELETE tanpa transaction — TOCTOU race ✅ MERGED
  - File: `src/app/api/admin/events/route.ts:183-194`
  - Fix: Wrap check + delete dalam `$transaction`
  - Impact: Concurrent request bisa buat orphan galleries

- [x] **#12** Inconsistent API error response format ✅ MERGED
  - File: Multiple routes (booking, gallery notify, invoice)
  - Fix: Selalu gunakan helper dari `src/lib/api/response.ts`
  - Impact: Client tidak bisa handle error secara konsisten

- [x] **#13** `selection-counter.ts` fungsi increment/decrement misleading ✅ MERGED
  - File: `src/lib/selection-counter.ts` (DELETED — dead code)
  - Fix: Hapus file — fungsi tidak pernah diimport/dipakai
  - Impact: Developer confusion — bukan bug aktif, by design (DB-only, no Redis), tapi nama fungsi menyesatkan

---

## MEDIUM

- [x] **#14** `getResponsiveImageUrls` dan `listImagesInFolder` pakai global config ✅ MERGED
  - File: `src/lib/cloudinary-upload.ts:180-215`, `332-340` (DELETED)
  - Fix: Hapus fungsi deprecated yang pakai global config
  - PR: #54

- [ ] **#15** View count race condition — concurrent requests bisa increment 2x
  - File: `src/app/api/public/gallery/[token]/route.ts:156-163`
  - Fix: Gunakan Redis atomic SETNX + INCR
  - Note: Low impact, skip untuk sekarang (butuh Redis refactor)

- [x] **#16** Email: `new Resend()` dibuat setiap call ✅ MERGED
  - Fix: Lazy-init singleton (`resend ??= new Resend(...)`)

- [x] **#17** `kodeBooking` format tidak konsisten antara admin dan public ✅ MERGED
  - File: `admin/events/route.ts:106` vs `public/booking/route.ts:21-29`
  - Fix: Extract ke `src/lib/booking-utils.ts` dengan `generateUniqueKodeBooking` (retry on collision)
  - PR: #54

- [ ] **#18** Tidak ada request body size limit pada JSON routes
  - File: `next.config.ts`
  - Fix: Tambah `serverActions.bodySizeLimit`

- [ ] **#19** Prisma `Decimal` conversion tidak konsisten
  - File: Multiple routes
  - Fix: Pastikan semua route convert `Decimal` ke `number` sebelum JSON response

---

## LOW

- [ ] **#20** Deprecated functions masih di codebase
  - File: `src/lib/cloudinary-upload.ts:229-406`
  - Fix: Hapus `deleteImageFromCloudinary`, `deleteMultipleImages`, `getImageMetadata`, `listImagesInFolder`

- [ ] **#21** Single upload POST handler di gallery/[id]/route.ts redundant dengan upload/route.ts
  - File: `src/app/api/admin/galleries/[id]/route.ts:9-101`
  - Fix: Consolidate ke satu endpoint

- [ ] **#22** Health check `$queryRaw` sudah OK
  - File: `src/app/api/health/route.ts:7`
  - Fix: Tidak perlu — sudah justified

---

## Notes

- Fix #1-6 harus diselesaikan sebelum merge ke main
- Fix #7-13 target selesai minggu ini
- Fix #14-19 bisa di-backlog
- Fix #20-22 optional cleanup
