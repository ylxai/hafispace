# Laporan Audit Keamanan, Bugs, dan Optimasi
Tanggal: Senin, 9 Maret 2026

## 1. Temuan Keamanan & Potential Bugs

### A. Insecure Direct Object Reference (IDOR) pada Operasi Delete
- **Lokasi**: `src/app/api/admin/galleries/route.ts` (Metode `DELETE`)
- **Deskripsi**: Perintah `prisma.gallery.delete` hanya menggunakan filter `id` tanpa memastikan `vendorId` sesuai dengan user yang sedang login, meskipun ada pengecekan `findFirst` sebelumnya. Ini berisiko jika terjadi perubahan logika di masa depan atau *race condition*.
- **Rekomendasi**: Selalu sertakan `vendorId` dalam filter `where` untuk semua operasi *destructive*.
  ```typescript
  await prisma.gallery.delete({
    where: { id: galleryId, vendorId: session.user.id }
  });
  ```

### B. Potensi Memory Leak pada Deduplikasi View Count
- **Lokasi**: `src/app/api/public/gallery/[token]/route.ts`
- **Deskripsi**: Penggunaan `viewFingerprintCache` (In-memory `Map`) untuk menyimpan hash IP+UA dapat menyebabkan penggunaan RAM membengkak jika aplikasi menerima trafik tinggi, meskipun sudah ada fungsi cleanup berkala.
- **Rekomendasi**: Gunakan **Redis** dengan sistem TTL native atau batasi ukuran maksimal `Map` (misal: max 10.000 entry).

### C. Validasi Seleksi Foto Sisi Server
- **Deskripsi**: Validasi jumlah maksimal foto yang dipilih (`maxSelection`) tampak dilakukan secara ketat di UI, namun perlu dipastikan rute API untuk menyimpan pilihan juga memvalidasi limit ini guna mencegah bypass melalui manipulasi request manual.

---

## 2. Peluang Optimasi

### A. Optimasi Performa Database (Counting)
- **Deskripsi**: Melakukan `prisma.photo.count` secara real-time pada galeri besar bisa menjadi bottleneck performa.
- **Saran**: Tambahkan kolom `photoCount` pada tabel `Gallery` yang diperbarui (inkremental) setiap kali ada penambahan atau penghapusan foto.

### B. URL WhatsApp Terlalu Panjang
- **Lokasi**: `src/app/gallery/[token]/page.tsx` pada fungsi `handleSubmitToWhatsApp`.
- **Deskripsi**: Mengirimkan daftar nama file foto secara eksplisit di parameter URL `wa.me` dapat melampaui batas panjang URL browser jika jumlah foto yang dipilih sangat banyak.
- **Saran**: Kirimkan ringkasan jumlah foto dan link langsung ke halaman dashboard admin untuk melihat seleksi tersebut.

### C. Eksposur Metadata Internal
- **Deskripsi**: `storageKey` (Cloudinary Public ID) dikirim ke klien di API publik.
- **Saran**: Jika tidak diperlukan untuk logika sisi klien, sebaiknya metadata teknis seperti ini di-filter untuk mengurangi eksposur struktur penyimpanan internal.

---

## 3. Analisis Kualitas Kode (Code Quality)

- **Struktur Proyek (Sangat Baik)**: Pemisahan logika antara API rute, layanan (`lib/services`), dan komponen UI sangat rapi dan mengikuti pola *Clean Architecture*.
- **Validasi Data (Sangat Baik)**: Penggunaan Zod untuk skema validasi input di sisi API menunjukkan standar keamanan yang kuat.
- **Modernitas Stack**: Implementasi Next.js 15 (Promise-based params), Prisma, dan React Query digunakan dengan sangat tepat dan idiomatik.
- **Error Handling**: Penggunaan helper response yang konsisten membuat kode mudah dibaca dan di-maintain.

---

## Kesimpulan
Kode memiliki kualitas yang sangat tinggi dan profesional. Fokus perbaikan disarankan pada pengetatan filter operasi *destructive* (IDOR prevention) dan antisipasi skalabilitas trafik pada sistem *caching* memori.
