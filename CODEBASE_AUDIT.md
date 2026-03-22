# Codebase Audit Report

**Tanggal**: 2026-03-22  
**Project**: Hafiportrait Platform  
**Tech Stack**: Next.js 15, TypeScript, Prisma, PostgreSQL, Cloudinary, Ably

> **Catatan**: Sistem ini adalah single-admin (bukan multi-tenant). "Vendor" di schema adalah "admin/studio" tunggal. Multi Cloudinary Account digunakan untuk multiple storage accounts, bukan untuk multiple users.

---

## 1. BUGS & ISSUES KRITIS

| # | Lokasi | Masalah | Severity |
|---|--------|---------|----------|
| 1 | `src/app/api/admin/galleries/[id]/route.ts` (POST) | Upload foto selalu set `urutan: 0` — foto baru tidak diurutkan dengan benar | Medium |
| 2 | `src/app/api/admin/galleries/[id]/route.ts` (PUT) | Sync foto dari Cloudinary tidak update `urutan` — foto bisa berantakan | Medium |
| 3 | `src/app/gallery/[token]/page.tsx` | Filter `selectedPhotos` hanya cocokkan `photo.id`, tidak support `storageKey` untuk backward compatibility dengan data lama | Medium |
| 4 | `src/lib/cloudinary/core.ts` | `generateUploadSignature()` menggunakan `CLOUDINARY_API_SECRET` dari env, bukan dari account spesifik — salah untuk multi-tenant | Medium |
| 5 | `src/app/api/admin/events/route.ts` | Saat update booking dengan `paketId: null`, tidak reset `maxSelection` ke default | Low |

### Detail Bug #1 - Photo Ordering

```typescript
// Di src/app/api/admin/galleries/[id]/route.ts - POST
const photo = await prisma.photo.create({
  data: {
    // ...
    urutan: 0, // ❌ Selalu 0, tidak menghitung foto existing
  },
});
```

**Solusi**: Hitung jumlah foto existing sebelum insert, gunakan sebagai urutan baru.

### Detail Bug #3 - Backward Compatibility

```typescript
// Di src/app/gallery/[token]/page.tsx
const selectedPhotos = useMemo(() => {
  return data.gallery.photos.filter((photo: { id: string }) =>
    data.gallery.selections.includes(photo.id) // ❌ Hanya cocokkan id
  );
}, [...]);
```

**Solusi**: Juga cocokkan dengan `storageKey` untuk data lama.

---

## 2. INCONSISTENCY & DESIGN ISSUES

| # | Lokasi | Masalah |
|---|--------|---------|
| 1 | Schema `CustomField` | Field `label` dan `isRequired` duplikat dengan `namaField` dan `wajib` — perlu konsolidasi |
| 2 | Schema `Vendor` | Field `cloudinaryCloudName`, `cloudinaryApiKey`, `cloudinaryApiSecret` di Vendor masih ada tapi sudah ada tabel `VendorCloudinary` — perlu cleanup |
| 3 | `src/lib/api/validation.ts` | `paymentSchema` menggunakan enum `CASH, TRANSFER, QRIS, OTHER` tapi di schema Prisma tidak ada enum PaymentType — mismatch |
| 4 | `src/app/api/admin/clients/route.ts` | DELETE menggunakan query param `?id=`, PUT/POST menggunakan body — tidak konsisten |
| 5 | `src/app/api/admin/events/route.ts` | DELETE menggunakan query param `?id=`, PUT/POST menggunakan body — tidak konsisten |
| 6 | `src/lib/cloudinary/core.ts` | Folder upload hardcoded `hafispace/galleries/${vendorId}` tapi di `galleries/[id]/upload` pakai `${CLOUDINARY_FOLDERS.GALLERIES}/${session.user.id}/${galleryId}` — dua konstanta berbeda |

### Detail Issue #1 - CustomField Duplication

```prisma
// Di prisma/schema.prisma
model CustomField {
  // ...
  namaField  String    @map("nama_field")
  wajib      Boolean   @default(false)   // ← Duplicated dengan isRequired
  // ...
  label      String    @default("")      // ← Duplicated dengan namaField
  isRequired Boolean   @default(false)   // ← Duplicated dengan wajib
  // ...
}
```

### Detail Issue #3 - Payment Schema Mismatch

```typescript
// Di src/lib/api/validation.ts
export const paymentSchema = z.object({
  paymentMethod: z.enum(["CASH", "TRANSFER", "QRIS", "OTHER"]), // ❌ Tidak ada di Prisma
});

// Di prisma/schema.prisma
enum PaymentType {
  DP
  PELUNASAN
  LAINNYA
}
```

---

## 3. POTENTIAL SECURITY ISSUES

| # | Lokasi | Masalah |
|---|--------|---------|
| 1 | `src/app/api/public/gallery/[token]/route.ts` | View count fingerprint menggunakan IP + UA yang di-hash — IP bisa dianggap PII di beberapa yurisdiksi |
| 2 | `src/app/gallery/[token]/page.tsx` | `handleDownloadOriginal` download semua foto sekaligus tanpa rate limiting — bisa abuse |
| 3 | `src/lib/cloudinary/core.ts` | `generateUploadSignature` tidak validasi `vendorId` milik siapa — bisa digunakan untuk upload ke vendor lain |

### Detail Security #3

```typescript
// Di src/lib/cloudinary/core.ts
export function generateUploadSignature(vendorId: string, paramsToSign: Record<string, string | number | boolean>): string {
  const secret = process.env.CLOUDINARY_API_SECRET ?? ""; // ❌ Pakai env global, bukan per-vendor
  // ...
}
```

---

## 4. MISSING FEATURES / INCOMPLETE IMPLEMENTATION

| # | Lokasi | Masalah |
|---|--------|---------|
| 1 | `src/app/admin/galleries/_components/` | Tidak ada UI untuk reorder/urutkan foto dalam galeri |
| 2 | `src/app/api/admin/galleries/[id]/photos/route.ts` | Tidak ada endpoint GET untuk list foto dengan pagination & filter |
| 3 | `src/app/admin/settings/_components/` | Tidak ada UI untuk manage `VendorCloudinary` accounts |
| 4 | `src/lib/redis.ts` | Redis di-import tapi tidak ada fallback yang robust jika Redis unavailable |
| 5 | `src/app/api/admin/bookings/[id]/payments/route.ts` | Payment upload endpoint ada tapi tidak ada validasi file type |

---

## 5. CODE QUALITY ISSUES

| # | Lokasi | Masalah |
|---|--------|---------|
| 1 | `src/app/api/admin/galleries/[id]/route.ts` | Tidak ada error handling untuk Cloudinary upload failure yang partial |
| 2 | `src/lib/cloudinary/core.ts` | Fungsi `uploadPhotosToCloudinary` sequential upload — lambat untuk banyak foto |
| 3 | `src/app/gallery/[token]/page.tsx` | Ably subscription tidak handle error dengan baik — silent fail tanpa user feedback |
| 4 | Multiple files | Console.log masih digunakan untuk error logging — perlu struktur logging yang lebih baik |

### Detail Code Quality #2

```typescript
// Di src/lib/cloudinary/core.ts
export async function uploadPhotosToCloudinary(...) {
  for (const { file, filename } of files) { // ❌ Sequential - lambat
    try {
      const result = await uploadPhotoToCloudinary(vendorId, file, filename, options);
      results.push(result);
    } catch (error) {
      // ...
    }
  }
}
```

**Solusi**: Gunakan `Promise.all()` atau batch processing.

---

## 6. DOCUMENTATION / CONFIG MISMATCH

| # | Masalah |
|---|---------|
| 1 | `README.md` menyebutkan `ABLY_API_KEY` sebagai optional, tapi di `env.ts` tidak ada validasi jika tidak ada — Ably features akan fail silent |
| 2 | `README.md` menyebutkan fitur "Multi Cloudinary Account" tapi tidak ada dokumentasi cara setup |
| 3 | `AGENTS.md` dan `README.md` memiliki informasi yang redundan tapi sedikit berbeda |

---

## 7. POSITIVE FINDINGS

- ✅ Arsitektur Next.js 15 App Router sudah baik
- ✅ Prisma schema well-designed dengan proper indexes
- ✅ Multi-tenant Cloudinary support sudah diimplementasikan dengan per-request config
- ✅ Zod validation sudah diterapkan di API routes
- ✅ Security: Middleware protection, auth checks, ownership verification sudah ada
- ✅ View count protection dengan cookie + fingerprint sudah baik

---

## 8. REKOMENDASI PRIORITAS

| Priority | Action |
|----------|--------|
| High | Fix `generateUploadSignature` untuk support multi-tenant |
| High | Fix photo ordering saat upload & sync |
| Medium | Konsolidasi CustomField schema (hapus duplikasi) |
| Medium | Konsolidasi Vendor schema (hapus field Cloudinary yang sudah dipindahkan) |
| Medium | Fix backward compatibility untuk photo selections |
| Low | Tambahkan UI untuk reorder foto |
| Low | Tambahkan rate limiting untuk download |

---

## 9. FILE YANG PERLU DICEK LANJUTAN

- `src/app/admin/galleries/_components/upload-photos-modal.tsx`
- `src/app/admin/galleries/_components/manage-photos-modal.tsx`
- `src/app/api/admin/galleries/[id]/photos/route.ts`
- `src/app/api/admin/galleries/[id]/photos/bulk/route.ts`
- `src/components/admin/cloudinary-accounts.tsx`
- `src/app/admin/settings/page.tsx`

---

*Generated: 2026-03-22*
