# Code Review Fixes — Progress Checklist

Tanggal: 2026-03-24
Branch: `fix/code-review-issues`
Status: **IN PROGRESS**

---

## Summary

Hasil deep code review pada full codebase Hafiportrait Platform.
Total: **22 issues** — 6 Critical, 7 High, 6 Medium, 3 Low.

---

## CRITICAL

- [ ] **#1** Selection DELETE menghapus foto asli dari Cloudinary
  - File: `src/app/api/admin/galleries/[id]/selections/route.ts:172`
  - Fix: Hapus `deletePhotoFromCloudinary` dari DELETE handler selection
  - Impact: Data loss permanen — foto asli hilang saat client hapus selection

- [ ] **#2** XSS di email template — user input tidak di-escape
  - File: `src/lib/email.ts:48-58`
  - Fix: Tambah `escapeHtml()` untuk semua user input di HTML template
  - Impact: Attacker bisa inject HTML/JS via `namaClient`, `namaPaket`, `rekeningPembayaran`

- [ ] **#3** Public invoice endpoint leak data sensitif vendor
  - File: `src/app/api/public/invoice/[kodeBooking]/route.ts:46-54`
  - Fix: Hapus `phone`, `email`, `rekeningPembayaran` dari public response
  - Impact: Siapa saja yang tahu kode booking bisa akses rekening bank vendor

- [ ] **#4** Race condition pada kodeBooking generation
  - File: `src/app/api/public/booking/route.ts:159-161`
  - Fix: Retry loop dengan unique check atau gunakan UUID
  - Impact: Concurrent request bisa dapat kode booking duplikat

- [ ] **#5** `src/middleware.ts` dead code — x-request-id tidak pernah diset
  - File: `src/middleware.ts` (tidak pernah di-execute Next.js)
  - Fix: Pindahkan logic x-request-id ke root `middleware.ts`
  - Impact: Request ID tracking tidak berfungsi

- [ ] **#6** R2 credentials disimpan plaintext di database
  - File: `prisma/schema.prisma:26-27`
  - Fix: Encrypt `r2AccessKeyId` dan `r2SecretAccessKey` dengan AES-256-GCM
  - Impact: Jika DB bocor, R2 storage account compromised

---

## HIGH

- [ ] **#7** Login endpoint tidak ada rate limiting
  - File: NextAuth default handler
  - Fix: Tambah rate limiting pada login route
  - Impact: Brute force attack

- [ ] **#8** Cloudinary global config race condition (multi-tenant)
  - File: `src/lib/cloudinary/core.ts:11-15`
  - Fix: Hapus module-level config, pastikan semua operasi pakai per-request credentials
  - Impact: Concurrent requests dari vendor berbeda bisa cross-contaminate config

- [ ] **#9** N+1 query pada gallery PUT sync
  - File: `src/app/api/admin/galleries/[id]/route.ts:139-171`
  - Fix: Batch select existing keys + single `createMany`
  - Impact: 100 foto = 300 DB queries → timeout

- [ ] **#10** `generateUploadSignature` pakai global env bukan vendor secret
  - File: `src/lib/cloudinary/core.ts:662-665`
  - Fix: Fetch vendor-specific credentials untuk signing
  - Impact: Signature salah di multi-tenant → upload gagal

- [ ] **#11** Booking DELETE tanpa transaction — TOCTOU race
  - File: `src/app/api/admin/events/route.ts:183-194`
  - Fix: Wrap check + delete dalam `$transaction`
  - Impact: Concurrent request bisa buat orphan galleries

- [ ] **#12** Inconsistent API error response format
  - File: Multiple routes
  - Fix: Selalu gunakan helper dari `src/lib/api/response.ts`
  - Impact: Client tidak bisa handle error secara konsisten

- [ ] **#13** `selection-counter.ts` fungsi increment/decrement misleading
  - File: `src/lib/selection-counter.ts:23-30`
  - Fix: Rename atau implementasi actual increment/decrement
  - Impact: Developer confusion, potential bug

---

## MEDIUM

- [ ] **#14** `getResponsiveImageUrls` dan `listImagesInFolder` pakai global config
  - File: `src/lib/cloudinary-upload.ts:180-215`, `332-340`
  - Fix: Pakai per-request config dengan vendorId

- [ ] **#15** View count race condition — concurrent requests bisa increment 2x
  - File: `src/app/api/public/gallery/[token]/route.ts:156-163`
  - Fix: Gunakan Redis atomic SETNX + INCR

- [ ] **#16** Email: `new Resend()` dibuat setiap call
  - File: `src/lib/email.ts:6-8`
  - Fix: Singleton pattern

- [ ] **#17** `kodeBooking` format tidak konsisten antara admin dan public
  - File: `admin/events/route.ts:106` vs `public/booking/route.ts:21-29`
  - Fix: Satu fungsi generator untuk semua

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
