# Hafiportrait Platform — AI Agent Context

## Project Overview

Hafiportrait Platform adalah platform manajemen galeri foto pernikahan dan event berbasis Next.js 15. Dibangun dengan TypeScript, Prisma ORM, PostgreSQL, dan Tailwind CSS. Platform ini menyediakan sistem manajemen lengkap bagi fotografer untuk mengelola booking, klien, galeri foto, dan proses seleksi foto oleh klien.

### Core Features
- **Auth System**: NextAuth.js JWT-based login, admin role
- **Booking Management**: Kelola sesi foto dengan paket, harga, tanggal, lokasi
- **Client Management**: Database klien terintegrasi dengan riwayat booking
- **Gallery Management**: Upload ke Cloudinary, token akses unik per galeri
- **Photo Selection**: Klien memilih foto via token, real-time counter via Ably
- **Dashboard Metrics**: Statistik aktif booking, galeri, klien
- **Multi Cloudinary Account**: Dukung beberapa akun Cloudinary per vendor
- **VIESUS Enhancement**: AI photo enhancement per galeri

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5 (strict)
- **Styling**: Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Prisma ORM 5
- **Auth**: NextAuth.js 4 (JWT, Credentials)
- **Storage**: Cloudinary
- **Realtime**: Ably
- **Validation**: Zod
- **UI Icons**: Lucide React

## Project Structure

```
src/
├── app/
│   ├── admin/              # Admin dashboard pages
│   ├── api/
│   │   ├── admin/          # Protected API routes (auth required)
│   │   └── public/         # Public API routes (token-based)
│   ├── gallery/[token]/    # Client gallery page
│   └── login/              # Login page
├── components/
│   ├── admin/              # Admin panel components
│   ├── gallery/            # Gallery lightbox component
│   └── ui/                 # Shared UI components
├── hooks/                  # Custom React hooks (data fetching)
├── lib/
│   ├── api/                # Response helpers & Zod schemas
│   ├── auth/               # NextAuth config & password utils
│   ├── cloudinary.ts       # Cloudinary SDK wrapper
│   ├── db.ts               # Prisma singleton
│   ├── env.ts              # Startup env validation
│   └── redis.ts            # Selection count DB utilities
└── types/                  # TypeScript type definitions
```

## Data Models

- **Vendor**: Fotografer/studio, owner semua resource
- **Client**: Data klien, relasi ke booking
- **Booking**: Sesi foto (paket, harga, tanggal, lokasi)
- **Gallery**: Galeri foto dengan token akses unik
- **GallerySetting**: Konfigurasi per galeri
- **Photo**: Foto individual, disimpan di Cloudinary
- **PhotoSelection**: Seleksi foto oleh klien
- **VendorCloudinary**: Multi-akun Cloudinary per vendor

## Auth & Authorization

- NextAuth.js JWT session management
- Middleware melindungi `/admin/*` dan `/api/admin/*`
- Klien akses galeri via token unik (bukan login)

## Coding Conventions

### Naming
- File: `kebab-case.tsx`
- Component: `PascalCase`
- Variable/function: `camelCase`

### Code Quality Rules
- **Strict TypeScript** — tidak ada `any` type
- **Zod validation** di semua API route yang menerima input
- **Response helpers** dari `src/lib/api/response.ts` untuk konsistensi
- **Prisma client** langsung — tidak ada `$queryRaw` / `$executeRaw` kecuali benar-benar diperlukan
- **Unused vars/imports** — jangan hapus otomatis, konsultasikan dulu jika kemungkinan implementasi belum selesai
- **`use client`** — hanya jika komponen butuh interaktivitas/hooks browser

### Environment Variables
Semua env variable divalidasi di `src/lib/env.ts` yang diimpor via `src/lib/db.ts` saat startup.

Required:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`

Optional (konfigurasi via Settings UI juga bisa):
- `NEXTAUTH_URL`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_APP_URL`
- `ABLY_API_KEY`

---

## 🔀 Git Workflow (WAJIB DIIKUTI)

### Aturan Utama
1. **`main` branch** = production-ready code, selalu stabil
2. **Setiap task/fitur baru** = buat branch baru dari `main`
3. **Sebelum merge** = wajib ESLint strict + build sukses
4. **Setelah selesai** = konfirmasi ke user: merge langsung atau PR dulu

### Naming Convention Branch

```
feat/nama-fitur          # Fitur baru
fix/nama-bug             # Bug fix
chore/nama-task          # Maintenance, cleanup, config
refactor/nama-refactor   # Refactoring tanpa fitur baru
docs/nama-docs           # Perubahan dokumentasi saja
```

### Alur Kerja Standard

```bash
# 1. Mulai task baru — selalu dari main
git checkout main
git checkout -b feat/nama-fitur

# 2. Kerjakan perubahan...

# 3. Sebelum commit — wajib cek
npm run lint       # Harus 0 error
npm run build      # Harus sukses

# 4. Commit dengan conventional commits
git add -A
git commit -m "feat: deskripsi singkat perubahan"

# 5. Konfirmasi ke user — merge atau PR?
```

### Conventional Commit Format

```
feat: tambah fitur X
fix: perbaiki bug Y di komponen Z
chore: hapus dependency tidak terpakai
refactor: extract logic ke custom hook
docs: update README setup guide
style: perbaiki formatting
test: tambah test untuk endpoint X
```

### Quality Gate (Wajib Sebelum Merge)

```bash
npm run lint    # 0 error, 0 warning ESLint
npm run build   # Build sukses tanpa error TypeScript
```

### Merge vs PR

- **Merge langsung** — jika perubahan kecil, sudah diverifikasi, user konfirmasi
- **PR** — jika perubahan besar, melibatkan schema DB, atau user ingin review dulu

---

## 📋 Audit & Known Issues

Lihat `AUDIT_CHECKLIST.md` untuk daftar lengkap masalah yang ditemukan dan status perbaikannya.
