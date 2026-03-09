# Laporan Audit Komprehensif: Keamanan, Bugs, dan Optimasi
Tanggal: Senin, 9 Maret 2026
Analis: Gemini CLI (Manual Scan)

---

## 1. Temuan Keamanan & Potential Bugs

### 🚨 A. Insecure Direct Object Reference (IDOR) pada Operasi Delete
- **Lokasi**: `src/app/api/admin/galleries/route.ts` (Metode `DELETE`)
- **Masalah**: Meskipun ada pengecekan awal menggunakan `findFirst`, perintah penghapusan akhir `prisma.gallery.delete` hanya menggunakan filter `id`.
- **Dampak**: Membuka celah (meskipun kecil) untuk penghapusan data antar vendor jika logika di atasnya diubah atau terjadi *race condition*.
- **Rekomendasi**: Selalu gunakan filter gabungan `{ id, vendorId }` pada setiap operasi penulisan/penghapusan.

### ⚠️ B. Potensi Memory Leak pada View Counter
- **Lokasi**: `src/app/api/public/gallery/[token]/route.ts`
- **Masalah**: Penggunaan `viewFingerprintCache` (JavaScript `Map`) di dalam memori server untuk deduplikasi tayangan.
- **Dampak**: Jika trafik membludak (misal link galeri viral), penggunaan RAM server akan terus meningkat secara linear hingga proses `cleanup` berjalan. Pembersihan berbasis interval mungkin tidak cukup cepat untuk mencegah *crash* di lingkungan dengan memori terbatas.
- **Rekomendasi**: Implementasikan **Redis** atau gunakan sistem database (UPSERT dengan timestamp) untuk menangani deduplikasi ini secara lebih *scalable*.

### 🔍 C. Validasi Sisi Server (Server-side Validation)
- **Masalah**: Validasi jumlah maksimal seleksi foto (`maxSelection`) sudah sangat baik di sisi UI (`/select`), namun belum terlihat adanya validasi serupa di rute API yang menyimpan pilihan tersebut.
- **Dampak**: User teknis bisa mengirimkan request manual ke API untuk memilih foto melebihi kuota paket.
- **Rekomendasi**: Tambahkan pengecekan kuota di dalam API rute seleksi foto sebelum melakukan `upsert` ke database.

---

## 2. Peluang Optimasi (Optimization)

### 📈 A. Database Denormalization (Photo Count)
- **Masalah**: Saat ini jumlah foto dihitung secara real-time menggunakan `prisma.photo.count` di API publik.
- **Saran**: Untuk galeri dengan ribuan foto, ini akan membebani database. Sebaiknya tambahkan kolom `photoCount` pada tabel `Gallery` dan lakukan pembaruan (+1/-1) saat proses upload/delete foto.

### 📱 B. WhatsApp URL Limit (UX Optimization)
- **Lokasi**: `src/app/gallery/[token]/page.tsx` pada `handleSubmitToWhatsApp`.
- **Masalah**: Mengirimkan daftar panjang nama file (`photo.filename`) melalui parameter URL `wa.me` berisiko terpotong atau gagal kirim jika jumlah foto sangat banyak (limit URL browser ~2000 karakter).
- **Saran**: Kirimkan pesan ringkasan: "Halo, saya telah memilih 50 foto. Lihat seleksi saya di: [Link_Halaman_Admin]".

### ⚙️ C. Metadata Sanitization
- **Masalah**: `storageKey` (Cloudinary public ID) diekspos ke publik di API rute galeri.
- **Saran**: Jika tidak diperlukan untuk fungsionalitas sisi klien, sebaiknya dihapus dari payload JSON untuk meminimalkan informasi internal yang bocor.

---

## 3. Analisis Kualitas Kode (Code Quality)

### ✅ Kelebihan:
1. **Clean Architecture**: Pemisahan yang sangat baik antara *API Routes*, *Business Logic* di `lib/services`, dan *UI Components*.
2. **Type Safety**: Penggunaan TypeScript yang konsisten dan pendefinisian skema Zod untuk validasi API adalah praktik terbaik.
3. **Modern Tech Stack**: Menggunakan fitur terbaru Next.js 15 (Promise-based params) dan integrasi React Query yang efisien.
4. **Middleware**: Implementasi proteksi rute admin yang solid dan mudah dipahami.

### 🛠️ Area Peningkatan:
1. **Consistency**: Pastikan semua rute API admin mengikuti pola verifikasi kepemilikan data yang sama (selalu menyertakan `vendorId` di setiap query `where`).
2. **Logging**: Pertimbangkan penggunaan library logging terpusat (seperti `pino` atau `winston`) alih-alih `console.log` untuk memudahkan debugging di fase produksi.

---

## Kesimpulan Akhir
Kode ini dikembangkan dengan standar profesional yang tinggi. Fokus utama untuk pengembangan selanjutnya adalah meningkatkan **ketahanan terhadap trafik tinggi (scalability)** dan memperketat **keamanan multi-tenancy** pada operasi penghapusan data.
