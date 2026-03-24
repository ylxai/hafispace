# Hafiportrait Platform

Platform manajemen galeri foto pernikahan dan event berbasis Next.js 15. Dirancang untuk fotografer profesional dalam mengelola booking, klien, galeri foto, dan proses seleksi foto oleh klien.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19, Tailwind CSS 4 |
| Database | PostgreSQL via Prisma ORM 5 (Neon) |
| Auth | NextAuth.js 4 (JWT, Credentials) |
| Storage | Cloudinary (preview/thumbnail) + Cloudflare R2 (original, planned) |
| Realtime | Ably |
| Cache | Upstash Redis |
| Forms | React Hook Form + Zod |
| Logging | pino + pino-pretty |
| Monitoring | Sentry (`@sentry/nextjs`) |

---

## Fitur Utama

- **Manajemen Booking** — Buat dan kelola sesi foto dengan detail paket, harga, tanggal, lokasi
- **Manajemen Klien** — Database klien terintegrasi dengan riwayat booking
- **Galeri Foto** — Upload foto ke Cloudinary, generate token akses unik untuk klien
- **Seleksi Foto** — Klien memilih foto via token, dengan batas maksimal dan real-time counter
- **Dashboard Metrics** — Statistik aktif booking, total galeri, dan klien (cached Redis)
- **Multi Cloudinary Account** — Dukung beberapa akun Cloudinary per vendor
- **VIESUS Enhancement** — Integrasi AI enhancement per galeri
- **Health Check** — `/api/health` endpoint untuk monitoring DB connectivity
- **Error Monitoring** — Sentry full setup (server, edge, client)

---

## Struktur Proyek

```
src/
├── app/
│   ├── admin/              # Halaman admin (dashboard, events, galleries, clients, settings)
│   ├── api/
│   │   ├── admin/          # API routes terproteksi (auth required)
│   │   ├── public/         # API routes publik (akses via token)
│   │   └── health/         # Health check endpoint
│   ├── gallery/[token]/    # Halaman galeri klien (akses via token)
│   ├── global-error.tsx    # Sentry root error boundary
│   └── login/              # Halaman login
├── components/
│   ├── admin/              # Komponen panel admin
│   ├── gallery/            # Komponen lightbox galeri
│   └── ui/                 # Komponen UI umum
├── hooks/                  # Custom React hooks (data fetching)
├── lib/
│   ├── api/                # Response helpers & Zod validation schemas
│   ├── auth/               # NextAuth config & password utilities
│   ├── cloudinary/         # Cloudinary SDK wrapper (multi-tenant)
│   ├── constants.ts        # Client-safe constants (hardcoded values)
│   ├── constants.server.ts # Server-only constants (env-based: rate limits, bcrypt, dll)
│   ├── db.ts               # Prisma client singleton
│   ├── email.ts            # Email utilities
│   ├── env.ts              # Environment variable validation (Zod)
│   ├── logger.ts           # Pino logger (server-side only)
│   ├── rate-limit.ts       # Rate limiting via Upstash Redis
│   └── redis.ts            # Redis client & selection count utilities
├── middleware.ts            # Auth guard + x-request-id injection
└── types/
    └── api.ts              # Shared API response types
```

Root-level Sentry files:
- `instrumentation.ts` — register hook + `onRequestError`
- `instrumentation-client.ts` — browser Sentry init
- `sentry.server.config.ts` — Node.js server config
- `sentry.edge.config.ts` — Edge runtime config

---

## Setup Development

### 1. Clone & Install

```bash
git clone <repo-url>
cd hafiportrait-platform
npm install
```

### 2. Environment Variables

Salin `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Isi minimal yang required:

```env
# Database (required)
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Auth (required)
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Lihat `.env.example` untuk daftar lengkap semua env vars beserta default-nya.

### 3. Database Migration

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Seed Admin

```bash
npx tsx scripts/seed-admin.ts
```

### 5. Jalankan Dev Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## Scripts

```bash
npm run dev        # Development server (port 3000)
npm run build      # Production build
npm run start      # Jalankan production build
npm run lint       # ESLint check (harus 0 error sebelum merge)
```

---

## Database Schema

Model utama:

- **Vendor** — Akun fotografer/studio
- **Client** — Data klien
- **Booking** — Sesi foto (paket, harga, tanggal, lokasi)
- **Gallery** — Galeri foto dengan token akses unik
- **GallerySetting** — Konfigurasi per galeri (download, print, pesan)
- **Photo** — Foto individual (`url` = Cloudinary preview, `originalUrl` = R2 planned)
- **PhotoSelection** — Seleksi foto oleh klien
- **VendorCloudinary** — Multi-akun Cloudinary per vendor
- **Notification** — Notifikasi in-app
- **ActivityLog** — Log aktivitas

---

## API Routes

### Admin (Auth Required)

| Method | Route | Deskripsi |
|---|---|---|
| GET/POST | `/api/admin/clients` | List & buat klien |
| PUT/DELETE | `/api/admin/clients` | Update & hapus klien |
| GET/POST | `/api/admin/events` | List & buat booking |
| GET/POST | `/api/admin/galleries` | List & buat galeri |
| POST | `/api/admin/galleries/[id]/upload` | Upload foto ke Cloudinary |
| GET/POST | `/api/admin/galleries/[id]/selections` | Kelola seleksi foto |
| GET | `/api/admin/metrics` | Statistik dashboard |
| GET/PATCH | `/api/admin/settings` | Pengaturan studio |
| GET/POST | `/api/admin/settings/cloudinary` | Kelola akun Cloudinary |

### Public (Token Based)

| Method | Route | Deskripsi |
|---|---|---|
| GET | `/api/public/gallery/[token]` | Ambil data galeri via token |
| GET | `/api/public/gallery/[token]/count` | Jumlah seleksi saat ini |
| POST | `/api/public/gallery/[token]/select` | Tambah/hapus seleksi foto |
| POST | `/api/public/gallery/[token]/notify` | Kirim notifikasi selesai seleksi |

### System

| Method | Route | Deskripsi |
|---|---|---|
| GET | `/api/health` | Health check — DB connectivity |

---

## Deployment

### Vercel (Recommended)

1. Push ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Set semua environment variables di dashboard Vercel
4. Deploy

> Sentry source maps di-upload otomatis saat `next build` via `withSentryConfig`.

### Self-hosted (Node.js)

```bash
npm run build
npm start
```

---

## Security

- Semua route `/admin/*` dan `/api/admin/*` diproteksi middleware NextAuth
- JWT strategy dengan session token
- `x-request-id` header di-inject setiap request untuk tracing
- Input validation menggunakan Zod di semua API routes
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- bcrypt cost factor: 12 (production) / 8 (development)
- Rate limiting via Upstash Redis di semua public endpoints
- Server-only env vars tidak bocor ke client bundle (`constants.server.ts`)

---

## Lisensi

Private — All rights reserved © Hafiportrait
