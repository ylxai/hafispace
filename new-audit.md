# Laporan Audit Komprehensif: Keamanan, Bugs, dan Optimasi (Deep Scan)
Tanggal: Senin, 9 Maret 2026
Analis: Gemini CLI

---

## 1. Temuan Keamanan & Potential Bugs

### 🚨 A. Potensi Cross-Site Scripting (XSS) pada Pesan Galeri
- **Lokasi**: `src/app/gallery/[token]/page.tsx`
- **Masalah**: Kolom `welcomeMessage` dan `thankYouMessage` dirender langsung ke dalam elemen HTML tanpa proses sanitasi.
- **Risiko**: Penyerang dengan akses admin dapat memasukkan tag `<script>` yang akan dieksekusi di browser klien (XSS Stored).
- **Rekomendasi**: Gunakan library sanitasi seperti `dompurify` atau pastikan input disanitasi ketat di sisi server sebelum disimpan ke database.

### 🔐 B. Lemahnya Verifikasi Identitas pada Seleksi Foto
- **Lokasi**: `src/app/api/public/gallery/[token]/select/route.ts`
- **Masalah**: Seleksi foto hanya mengandalkan `clientToken` di URL tanpa adanya binding sesi (seperti JWT ringan atau cookie identitas klien).
- **Risiko**: Siapa pun yang memiliki link galeri dapat memanipulasi seleksi foto klien lain jika link tersebut bocor.
- **Rekomendasi**: Implementasikan mekanisme "Enter Email" atau "Client Session" sebelum akses penuh ke galeri diberikan.

### 🧹 C. Masalah Orphan Files (Cloudinary vs Database)
- **Lokasi**: `src/app/api/admin/galleries/[id]/upload/route.ts`
- **Masalah**: Jika foto berhasil diupload ke Cloudinary tetapi penulisan ke database gagal (timeout/crash), file tersebut akan tertinggal sebagai sampah di Cloudinary.
- **Rekomendasi**: Implementasikan mekanisme `rollback` (menghapus file dari Cloudinary jika DB fail) atau buat job sinkronisasi otomatis.

---

## 2. Performance Bottlenecks (Hambatan Performa)

### 🚀 A. Sequential Database Inserts (Bulk Upload)
- **Lokasi**: `src/app/api/admin/galleries/[id]/upload/route.ts`
- **Masalah**: Penggunaan `prisma.photo.create` di dalam loop untuk hasil upload Cloudinary.
- **Dampak**: 100 foto = 100 round-trip ke database. Ini adalah bottleneck besar untuk skalabilitas.
- **Rekomendasi**: Gunakan **`prisma.photo.createMany({ data: [...], skipDuplicates: true })`** untuk menyimpan semua data dalam satu query tunggal.

### ⛓️ B. Split Transactions pada Submit Seleksi
- **Lokasi**: `src/app/api/public/gallery/[token]/submit/route.ts`
- **Masalah**: Transaksi penguncian seleksi dan pembuatan notifikasi/log dipisah menjadi dua blok transaksi berbeda.
- **Risiko**: Jika database sibuk, ada kemungkinan seleksi terkunci tetapi notifikasi gagal dibuat (partial success).
- **Rekomendasi**: Gabungkan seluruh operasi (lock + notify + log) ke dalam satu blok `prisma.$transaction` tunggal.

---

## 3. Optimasi Skema & Kode (Logic Flaws)

### 🔄 A. Redundansi Kredensial Cloudinary
- **Lokasi**: `prisma/schema.prisma`
- **Masalah**: Data API Key/Secret Cloudinary disimpan di dua tempat: tabel `Vendor` dan tabel `VendorCloudinary`.
- **Dampak**: Ketidakkonsistenan data (Inconsistent State) jika salah satu diperbarui tetapi yang lain tidak.
- **Rekomendasi**: Hapus kolom Cloudinary dari tabel `Vendor` dan gunakan tabel `VendorCloudinary` sebagai satu-satunya sumber data (*Single Source of Truth*).

### 🔢 B. Inkonsistensi maxSelection
- **Masalah**: Kolom `maxSelection` ada di tabel `Package` dan juga tabel `Booking`.
- **Saran**: Pastikan saat pembuatan *Booking*, nilai dari *Package* disalin secara permanen ke *Booking* untuk menjaga riwayat data meskipun paket diubah di masa depan (sudah dilakukan, pastikan konsistensi logic di API).

---

## Kesimpulan & Prioritas
Sistem saat ini sudah berjalan baik secara fungsional, namun memerlukan **optimasi pada level database (bulk operation)** dan **pengetatan keamanan pada input publik** untuk mencapai level siap produksi (*production-ready*).

**Prioritas Perbaikan:**
1.  **XSS Sanitization** (Security)
2.  **`createMany` pada Upload** (Performance)
3.  **Unified Transactions** (Integrity)
