# 🔍 Technical Audit Checklist — Hafiportrait Platform

> Setiap item yang selesai diperbaiki, centang checkbox-nya.
> Jangan hapus item — biarkan sebagai log permanen.

---

## 🔴 CRITICAL

- [x] **C1** — `Providers` mounted guard mematikan SSR seluruh app  
  _File: `src/app/providers.tsx`_  
  Hapus `useState(mounted)` + `useEffect` guard. `SessionProvider` & `QueryClientProvider` tidak butuh ini.

- [x] **C2** — `LoginPage` mounted guard redundant  
  _File: `src/app/login/page.tsx`_  
  Halaman sudah `"use client"`, tidak ada risiko hydration mismatch. Hapus mounted guard.

- [x] **C3** — CORS hardcoded IP di `next.config.ts`  
  _File: `next.config.ts`_  
  `Access-Control-Allow-Origin` berisi IP literal `http://124.197.42.88` + multi-value string (tidak valid untuk CORS). Harus per-request di middleware atau gunakan env variable.

---

## 🟠 HIGH

- [x] **H1** — `PUT /api/admin/clients` tanpa Zod validation  
  _File: `src/app/api/admin/clients/route.ts` (line 131)_  
  Body di-destructure langsung tanpa `clientSchema.safeParse()`. Input tidak divalidasi.

- [x] **H2** — Prisma schema tidak sinkron: `enableViesusEnhancement` pakai raw SQL  
  _Files: `src/lib/cloudinary.ts`, `src/app/api/admin/settings/route.ts`_  
  Field sudah ada di Prisma schema dengan `@map("enable_viesus_enhancement")`. Semua `$queryRaw` / `$executeRaw` diganti dengan Prisma client biasa.

- [x] **H3** — View count increment tanpa session/cookie guard  
  _File: `src/app/api/public/gallery/[token]/route.ts` (line 65)_  
  Ditambahkan cookie check `viewed_<galleryId>` dengan TTL 24 jam.

- [x] **H4** — `extractCloudName` hardcoded fallback cloud name  
  _File: `src/app/gallery/[token]/page.tsx` (line 57, 60)_  
  Fallback `'doweertbx'` diganti dengan `process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.

- [ ] **H5** — Public gallery endpoint tidak ada rate limiting  
  _File: `src/app/api/public/gallery/[token]/select/route.ts`_  
  Endpoint publik tanpa auth dan tanpa rate limit → rawan abuse/flood selection.  
  ⚠️ _Ditunda — Redis/Upstash belum dikonfigurasi. Implementasi saat Redis aktif._

- [x] **H6** — Security headers tidak ada di `next.config.ts`  
  _File: `next.config.ts`_  
  Ditambahkan `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.

- [x] **H7** — `metrics/route.ts` tidak menggunakan `unauthorizedResponse()` helper  
  _File: `src/app/api/admin/metrics/route.ts` (line 8)_  
  Response error sudah konsisten menggunakan `unauthorizedResponse()`.

---

## 🟡 MEDIUM

- [x] **M1** — `@upstash/redis` dependency tidak digunakan, harus dihapus  
  _File: `package.json`, `src/lib/redis.ts`_  
  Package dihapus dari `dependencies`. `redis.ts` disederhanakan menjadi pure DB utility functions.

- [x] **M2** — `unoptimized` pada `next/image` di gallery page  
  _File: `src/app/gallery/[token]/page.tsx` (line 90)_  
  Prop `unoptimized` dihapus. Next.js image optimization pipeline aktif kembali.

- [x] **M3** — Environment variables tidak divalidasi saat startup  
  _Files: `src/lib/auth/options.ts`, `src/lib/cloudinary.ts`, `src/lib/ably.ts`_  
  Dibuat `src/lib/env.ts` yang memvalidasi semua env kritis. Di-import di `db.ts` agar dijalankan saat startup.

- [ ] **M4** — `AdminHomePage` adalah `"use client"` padahal hanya fetch data  
  _File: `src/app/admin/page.tsx`_  
  Bisa diubah ke Server Component + child client untuk interaktivitas, mengurangi client bundle.

- [ ] **M5** — `Upcoming Workflows` di dashboard menggunakan data hardcoded  
  _File: `src/app/admin/page.tsx` (line 68)_  
  List item adalah string statis, bukan data dari DB. Perlu disambungkan ke data nyata atau diberi keterangan placeholder.

- [ ] **M6** — `Quick Actions` buttons tidak melakukan apa-apa  
  _File: `src/app/admin/page.tsx` (line 82)_  
  Semua tombol Quick Actions tidak memiliki handler/navigasi. UI-only tanpa fungsi.

---

## 🟢 LOW

- [x] **L1** — bcrypt cost factor 10, rekomendasi production adalah 12  
  _File: `src/lib/auth/password.ts` (line 3)_  
  `bcrypt.genSalt(10)` → ditingkatkan ke `12`.

- [ ] **L2** — "Remember me" checkbox tidak berfungsi  
  _File: `src/app/login/page.tsx` (line 126-132)_  
  Checkbox ada di UI tapi tidak terhubung ke state/logic apapun.

- [ ] **L3** — "Forgot password?" button tidak berfungsi  
  _File: `src/app/login/page.tsx` (line 133)_  
  Button ada di UI tapi tidak ada handler/navigasi.

- [ ] **L4** — `googleapis` dependency ada tapi tidak terlihat digunakan  
  _File: `package.json`_  
  `googleapis: ^140.0.1` ada di dependencies. Perlu diaudit apakah benar-benar digunakan.

---

## ℹ️ INFO / Catatan

- **Redis/Upstash**: Akan dihapus dependency-nya (`@upstash/redis`). File `redis.ts` akan disederhanakan menjadi pure DB utility functions tanpa Redis logic.
- **Warn/Unused vars**: Jangan dihapus otomatis — konsultasikan dulu sebelum tindakan.
- **L2 & L3** (Remember me, Forgot password): Kemungkinan fitur belum diimplementasi. Opsi: implementasi atau hapus UI-nya — minta konfirmasi user dulu.
- **M5 & M6** (Hardcoded workflows & Quick Actions): Kemungkinan placeholder. Opsi: sambungkan ke data nyata atau beri label "Coming soon" — minta konfirmasi user dulu.

---

_Last updated: 2026-03-03_
