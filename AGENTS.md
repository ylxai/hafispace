# Hafiportrait Platform — AI Agent Context

## Project Overview

Hafiportrait Platform adalah platform manajemen galeri foto pernikahan dan event berbasis Next.js 15. Dibangun dengan TypeScript strict, Prisma ORM, PostgreSQL (Neon), Cloudinary multi-tenant, Ably realtime, dan Upstash Redis.

### Core Features
- **Auth System**: NextAuth.js JWT-based login, admin role
- **Booking Management**: Kelola sesi foto dengan paket, harga, tanggal, lokasi
- **Client Management**: Database klien terintegrasi dengan riwayat booking
- **Gallery Management**: Upload ke Cloudinary (preview/thumbnail), token akses unik per galeri
- **Photo Selection**: Klien memilih foto via token, real-time counter via Ably
- **Dashboard Metrics**: Statistik aktif booking, galeri, klien (cached via Redis)
- **Multi Cloudinary Account**: Dukung beberapa akun Cloudinary per vendor
- **VIESUS Enhancement**: AI photo enhancement per galeri
- **Health Check**: `/api/health` — cek DB connectivity
- **Error Monitoring**: Sentry (server, edge, client) + pino logger (server-side)

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5 (strict)
- **Styling**: Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Prisma ORM 5 (Neon)
- **Auth**: NextAuth.js 4 (JWT, Credentials)
- **Storage**: Cloudinary (preview/thumbnail), Cloudflare R2 planned (original files)
- **Realtime**: Ably
- **Cache**: Upstash Redis
- **Validation**: Zod
- **Logging**: pino (server-side only), pino-pretty (dev)
- **Monitoring**: Sentry (`@sentry/nextjs`) — org: `pridayfn`, project: `javascript-nextjs`
- **UI Icons**: Lucide React

## Project Structure

```
src/
├── app/
│   ├── admin/              # Admin dashboard pages
│   ├── api/
│   │   ├── admin/          # Protected API routes (auth required)
│   │   ├── public/         # Public API routes (token-based)
│   │   └── health/         # Health check endpoint
│   ├── gallery/[token]/    # Client gallery page
│   ├── global-error.tsx    # Sentry root error boundary
│   └── login/              # Login page
├── components/
│   ├── admin/              # Admin panel components
│   ├── gallery/            # Gallery lightbox component
│   └── ui/                 # Shared UI components
├── hooks/                  # Custom React hooks (data fetching)
├── lib/
│   ├── api/                # Response helpers & Zod schemas
│   ├── auth/               # NextAuth config & password utils
│   ├── cloudinary/         # Cloudinary SDK wrapper (multi-tenant)
│   ├── constants.ts        # Client-safe constants (no env import)
│   ├── constants.server.ts # Server-only constants (rate limits, bcrypt, etc.)
│   ├── db.ts               # Prisma singleton
│   ├── email.ts            # Email utilities
│   ├── env.ts              # Startup env validation (zod)
│   ├── logger.ts           # Pino logger (server-side only)
│   ├── rate-limit.ts       # Rate limiting (Upstash Redis)
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

## Data Models

- **Vendor**: Fotografer/studio, owner semua resource
- **Client**: Data klien, relasi ke booking
- **Booking**: Sesi foto (paket, harga, tanggal, lokasi)
- **Gallery**: Galeri foto dengan token akses unik
- **GallerySetting**: Konfigurasi per galeri
- **Photo**: Foto individual, disimpan di Cloudinary (`url` = preview, `originalUrl` = R2 planned)
- **PhotoSelection**: Seleksi foto oleh klien
- **VendorCloudinary**: Multi-akun Cloudinary per vendor
- **Notification**: Notifikasi in-app
- **ActivityLog**: Log aktivitas

## Auth & Authorization

- NextAuth.js JWT session management
- `middleware.ts` melindungi `/admin/*` dan `/api/admin/*`
- `middleware.ts` inject `x-request-id` via `crypto.randomUUID()` (Edge-compatible)
- Klien akses galeri via token unik (bukan login)

## Coding Conventions

### Setup Commands
```bash
npm run dev              # Start development server (http://localhost:3000)
npm run build            # Production build
npm run lint             # ESLint strict mode (0 errors required)
npm run typecheck        # TypeScript type checking
npm test                 # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npx prisma studio        # Open Prisma Studio (DB GUI)
npx prisma db push       # Push schema changes to database
npx prisma generate      # Generate Prisma client
```

### Naming
- File: `kebab-case.tsx`
- Component: `PascalCase`
- Variable/function: `camelCase`

### Code Quality Rules
- **Strict TypeScript** — tidak ada `any` type
- **Zod validation** di semua API route yang menerima input
- **Response helpers** dari `src/lib/api/response.ts` untuk konsistensi
- **Prisma client** langsung — tidak ada `$queryRaw` / `$executeRaw` kecuali benar-benar diperlukan
- **Unused vars/imports** — jangan hapus otomatis, konsultasikan dulu
- **`use client`** — hanya jika komponen butuh interaktivitas/hooks browser
- **`console.*`** — DILARANG di server-side. Gunakan `logger` dari `@/lib/logger`
- **Client-side files** — boleh tetap `console.*` (pino hanya untuk server)

### Logger Pattern (server-side)
```typescript
import logger from "@/lib/logger";
logger.error({ err: error }, "Pesan error");
logger.warn({ context }, "Pesan warning");
logger.info({ data }, "Pesan info");
```

### Testing Patterns

**Unit Test Co-location:**
- `src/lib/auth.ts` → `src/lib/auth.test.ts`
- `src/components/Button.tsx` → `src/components/Button.test.tsx`
- `src/app/api/admin/bookings/route.ts` → `src/app/api/admin/bookings/route.test.ts`

**Mock Strategies:**
- Prisma client: `jest.mock('@/lib/db')` dengan mock return values
- NextAuth: Mock session dengan `getToken` atau `auth` return
- Cloudinary: Mock upload/delete dengan `jest.mock('@/lib/cloudinary')`
- Redis: Mock dengan `jest.mock('@/lib/redis')`

**Test Structure:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('BookingService', () => {
  beforeEach(() => {
    // Reset mocks
  });

  it('should create booking with valid data', async () => {
    // Arrange
    const input = { namaClient: 'John', hpClient: '0812...' };
    
    // Act
    const result = await createBooking(input);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it('should throw validation error for invalid data', async () => {
    // ...
  });
});
```

**Coverage Target:**
- **80%+** untuk critical paths (auth, API routes, core business logic)
- Meaningful tests > coverage percentage
- Prioritas: API routes > utility functions > UI components

**Test Commands:**
```bash
npm test              # Run all tests
npm run test:watch     # Watch mode for active development
npm run test:coverage  # Coverage report
```

### Upload System Patterns (WAJIB DIIKUTI)

**Type Contract:** Selalu gunakan `FileUploadId` dari `@/lib/upload-types.ts`

```typescript
import { createFileId, type FileUploadId } from '@/lib/upload-types';

// ✅ BENAR - gunakan createFileId()
const fileIds = files.map(() => createFileId());

// ❌ SALAH - jangan pakai file.name sebagai ID
const id = file.name; // Breaks dengan duplicate filenames!

// ❌ SALAH - jangan pakai crypto.randomUUID() langsung
const id = crypto.randomUUID(); // Harus typed sebagai FileUploadId
```

**Upload Flow (3 Steps):**
```typescript
// Step 1: Generate IDs SEBELUM initializeFiles (hindari React closure bug)
const fileIds = files.map(() => createFileId());
initializeFiles(files, fileIds);

// Step 2: Pass selectedAccountId ke createUploadFunction (multi-tenant!)
const uploadFn = createUploadFunction(galleryId, selectedAccountId);

// Step 3: Upload via hook (auto-retry included)
const results = await uploadFiles(files, uploadFn, fileIds);
```

**File Lookup:** Selalu gunakan object identity, BUKAN filename:
```typescript
// ✅ BENAR - object identity
const fileState = fileStates.find((fs) => fs.file === file);

// ❌ SALAH - filename comparison
const fileState = fileStates.find((fs) => fs.file.name === file.name);
```

**Retry Pattern:**
```typescript
// Pass sama fileId untuk tracking continuity
await retrySingle(file, uploadFn, fileState.id);

// Sequential retry (BUKAN parallel forEach!)
for (const file of failedFiles) {
  await handleRetryFile(file); // ✅ Sequential
}
// failedFiles.forEach(f => handleRetryFile(f)); // ❌ Parallel
```

**isUploading State:** Selalu sync state dari hook + local:
```typescript
const isAnyUploading = isUploading || isRetrying; // Combined state
// Gunakan isAnyUploading di UI, bukan hanya isUploading
```

---

### Constants
- `src/lib/constants.ts` — nilai hardcoded, aman diimport di client/server
- `src/lib/constants.server.ts` — nilai dari env vars, **server-only** (rate limits, bcrypt cost, gallery max, metrics TTL)
- `src/lib/cors.ts` — EXCEPTION: tetap `process.env` langsung karena diimport di `next.config.ts` build-time

### Environment Variables
Semua env variable divalidasi di `src/lib/env.ts` (Zod schema).

Required:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`

Optional:
- `NEXTAUTH_URL`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_APP_URL`
- `ABLY_API_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`
- `RATE_LIMIT_SELECT_PER_MINUTE`, `RATE_LIMIT_NOTIFY_PER_HOUR`, `RATE_LIMIT_BOOKING_PER_HOUR`, `RATE_LIMIT_SUBMIT_PER_MINUTE`
- `BCRYPT_COST_FACTOR` (default: 12 prod / 8 dev)
- `GALLERY_MAX_PHOTOS` (default: 1000)
- `METRICS_CACHE_TTL_SECONDS` (default: 300)

---

## 🔀 Git Workflow (WAJIB DIIKUTI)

### Aturan Utama
1. **`main` branch** = production-ready code, selalu stabil
2. **Setiap task/fitur baru** = buat branch baru dari `main`
3. **Sebelum merge** = wajib ESLint strict + build sukses
4. **Setelah selesai** = konfirmasi ke user: merge langsung atau PR dulu
5. **Edit file** = gunakan `str_replace` atau `create` — JANGAN `sed` atau `cat >`
6. **Setiap batch selesai** = lint → build → commit → push

### Worktrees Aktif
```
/home/eouser/scrapper/my-platform                          [main]            ← Rovo Dev (stable base)
.adal/worktrees/shared-types                               [feat/shared-types] ← Rovo Dev
.adal/worktrees/gallery-page                               [feat/single-gallery-page] ← Kiro CLI
.adal/worktrees/feat-storage-scalling                      [feat-storage-scalling]    ← On hold
```

### Multi-Agent Coordination
Platform ini menggunakan **2 AI agents secara parallel:**
- **Rovo Dev** (Atlassian) - Shared types, API layer, architecture
- **Kiro CLI** (Amazon) - Gallery client experience, UI features

**File koordinasi:** `.agents/status.md` - BACA DULU sebelum mulai kerja!

### File Ownership
```
Rovo Dev owns:
  src/types/**              ← Shared types
  src/lib/api/**            ← API utilities
  src/hooks/**              ← Shared hooks
  docs/**                   ← Documentation
  .agents/**                ← Agent coordination

Kiro CLI owns:
  src/app/gallery/**        ← Gallery client pages
  src/components/gallery/** ← Gallery components

SHARED (koordinasi dulu via .agents/status.md):
  AGENTS.md, package.json, prisma/schema.prisma, src/middleware.ts
```

Kerja di worktree yang sesuai agar `main` tidak terganggu.

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
npm run lint           # 0 error, 0 warning ESLint
npm run typecheck      # TypeScript type checking (~10s)
npm run build          # Production build (optional, slower)
bash scripts/review.sh # Full local code review (recommended)
```

### Local Code Review (Wajib Sebelum PR)

Jalankan review script sebelum buat PR untuk catch issues lebih awal:

```bash
bash scripts/review.sh
```

**Script checks:**
1. ESLint (0 errors, 0 warnings)
2. TypeScript (0 type errors)
3. Unit tests (all passed)
4. No `console.*` di server-side code
5. No `any` types
6. Upload IDs pakai `createFileId()` bukan `randomUUID()` langsung
7. No `file.name` sebagai upload identifier
8. No nested `<button>` dalam `<button>`
9. Auth pattern consistency (no `getServerSession` in admin routes)

**Workflow baru (no Gemini dependency):**
```
Code changes
    ↓
git add -A
    ↓
git commit → Husky pre-commit (ESLint auto-fix staged files)
    ↓
bash scripts/review.sh → Full local review
    ↓ (jika passed)
git push → Husky pre-push (lint + typecheck + tests)
    ↓
Buat PR → Agent manual review → Merge
```

**Manfaat:**
- ✅ Tidak perlu tunggu Gemini (5-15 menit)
- ✅ Instant feedback lokal
- ✅ Bisa merge kapan saja setelah review passed
- ✅ Gemini tetap optional (tidak blocking)

### Husky Pre-commit Hooks (Auto-active)

Husky + lint-staged sudah dikonfigurasi. **Setiap `git commit` akan otomatis:**
1. Run `lint-staged` — ESLint `--fix` pada staged files saja
2. Auto-fix: unused imports, import sorting
3. Block commit jika ada ESLint errors

```bash
# Jika pre-commit hook gagal:
npm run lint       # Cek error manual
npm run lint -- --fix  # Auto-fix semua
git add -A         # Stage fixes
git commit -m "..." # Retry commit
```

**ESLint Plugins yang aktif:**
- `@typescript-eslint` — TypeScript strict rules (no any, consistent types)
- `eslint-plugin-unused-imports` — Auto-remove unused imports
- `eslint-plugin-simple-import-sort` — Sort imports alphabetically
- `@next/eslint-plugin-next` — Next.js best practices

**Note:** `eslint-plugin-tailwindcss` TIDAK dipasang (tidak compatible Tailwind v4).
Alternatif: `prettier-plugin-tailwindcss` (planned, belum disetup).

### Rebase Pattern
```bash
# Selalu rebase sebelum push untuk avoid merge conflicts
git fetch origin main
git rebase origin/main

# Jika ada conflict
git status
# Resolve conflicts manually, lalu:
git add .
git rebase --continue

# Jika rebase terlalu kompleks, tanya user
git rebase --abort
```

### Merge Pattern
```bash
git checkout main && git pull origin main
git merge --no-ff <branch> -m "feat: deskripsi (#PR)"
git push origin main
git branch -d <branch>
git push origin --delete <branch>
```

### Merge vs PR
- **Merge langsung** — jika perubahan kecil, sudah diverifikasi, user konfirmasi
- **PR** — jika perubahan besar, melibatkan schema DB, atau user ingin review dulu

---

## 🗺️ Roadmap / Planned Features

### feat-storage-scalling (in progress)
Hybrid storage architecture:
- **Cloudinary** — preview/thumbnail (compressed, CDN, transformasi)
- **Cloudflare R2** — original uncompressed (untuk download klien)
- Multi-akun R2 per vendor (mirip `VendorCloudinary`)
- Upload flow: dual upload paralel (Cloudinary + R2)
- Download: presigned URL via Next.js API route (expire 1 jam)
- Settings admin: manage R2 accounts

### feat/single-gallery-page (in progress)
Compact single-page gallery view untuk klien.

---

## 📋 Audit & Known Issues

Lihat `CODEBASE_AUDIT_CHECKLIST.md` untuk status semua phase audit (Phase 1–6 semua MERGED ✅).

---

## 📚 Documentation

- **Docs site**: https://pridayfn.mintlify.app
- **LLM index** (ringkas): https://pridayfn.mintlify.app/llms.txt
- **LLM full** (semua konten): https://pridayfn.mintlify.app/llms-full.txt
- **MCP endpoint**: https://pridayfn.mintlify.app/mcp
- **OpenAPI spec**: https://pridayfn.mintlify.app/api-reference/openapi.json

Saat butuh referensi API atau arsitektur, fetch `llms.txt` dulu untuk tahu halaman mana yang relevan, lalu fetch halaman spesifik (`.md` URL) — jangan langsung fetch `llms-full.txt` kecuali butuh semua konten sekaligus.

---

## 🤖 Agent Behavior Rules

### Decision Priority

Ketika agent butuh informasi, ikuti prioritas berikut:

```
1. LOCAL CODE    → grep / read / glob di codebase
2. MCP DOCS      → search_hafiportrait_platform (MCP)
3. MCP LIBRARY   → context7 (MCP) untuk library eksternal
4. SKILLS        → load skill yang cocok untuk task spesifik
5. WEB SEARCH    → last resort untuk info yang tidak ada di atas
```

### Kapan Pakai MCP (`search_hafiportrait_platform`)

Gunakan MCP search untuk:

| Trigger | Contoh Pertanyaan |
|---------|-------------------|
| User tanya API | "endpoint booking pakai method apa?" |
| User tanya arsitektur | "auth flow bagaimana?" |
| User tanya konvensi | "response format harus seperti apa?" |
| User tanya database | "relasi booking dengan gallery?" |
| Agent butuh referensi | Mau buat API route baru, perlu tahu pattern yang ada |
| Agent bingung dengan code | Tidak yakin file mana yang harus diedit |

**Jangan** pakai MCP untuk:
- Info yang sudah ada di file yang sedang dibuka
- Info yang bisa didapat dari `git status` atau `git log`
- Task yang tidak butuh dokumentasi (rename, delete, move)

### Kapan Pakai Skills

Load skill hanya jika task **cocok** dengan salah satu skill description:

| Task | Skill | Trigger Phrase |
|------|-------|----------------|
| Review code | `code-review` | "review", "cek PR", "code review" |
| Buat UI/frontend | `frontend-design` | "buat halaman", "buat komponen", "desain" |
| Deploy | `deploy-to-vercel` | "deploy", "push ke production" |
| Security audit | `Performing Security Audits` | "audit security", "vulnerability" |
| Optimasi query | `Analyzing Query Performance` | "query lambat", "EXPLAIN plan" |
| Buat dokumentasi | `write-guide`, `write-api-reference` | "buat docs", "tulis guide" |
| Setup database | `prisma-database-setup` | "setup postgres", "connect database" |

**Jangan** load skill jika:
- Task sederhana (edit file, fix typo, rename)
- User tidak minta review atau audit
- Skill tidak relevan dengan task

### Kapan Pakai Web Search

Web search adalah **last resort**:
- Library eksternal yang tidak ada di MCP (baru, niche)
- Info teknologi yang sangat spesifik
- Error message yang tidak ada di dokumentasi manapun

### Context Recovery

Jika agent kehilangan context atau tidak yakin apa yang harus dilakukan:

<Steps>
  <Step title="Baca ulang AGENTS.md">
    File ini berisi semua konvensi dan aturan project.
  </Step>
  <Step title="Cek git state">
    ```bash
    git branch          # Di branch mana?
    git status          # Ada perubahan apa?
    git log --oneline -5  # Commit terakhir apa?
    ```
  </Step>
  <Step title="Baca ulang file yang sedang diedit">
    Reorientasi dengan membaca file yang sedang dimodifikasi.
  </Step>
  <Step title="Search MCP jika butuh referensi">
    Jika tidak yakin dengan konvensi atau pattern, search dokumentasi.
  </Step>
  <Step title="Tanya user">
    Jika masih tidak jelas setelah langkah di atas, tanya user langsung.
  </Step>
</Steps>

**Kapan harus trigger context recovery:**
- Agent bingung > 30 detik tanpa action
- Agent mulai membuat asumsi yang tidak didasarkan pada code
- Agent mulai mengulang pertanyaan yang sudah dijawab
- Tool call gagal berulang kali
- Session sudah sangat panjang (>50 messages)

### Task Decomposition

Pecah pekerjaan menjadi task kecil yang bisa diverifikasi secara independen:

1. **Split work** into smaller, individually verifiable tasks
2. **Verify each task** before moving to next (run tests, typecheck, build)
3. **Choose right verification method** per change type:
   - API routes → test dengan mock data atau manual curl
   - UI components → visual check + lint
   - Database changes → verify dengan Prisma Studio atau SQL query
   - Bug fixes → buat reproduksi dulu sebelum fix
4. **Ask user** jika tidak yakin cara verifikasi

**Verification methods:**
- `npm run lint` → code quality
- `npm run build` → TypeScript compilation
- `npm run typecheck` → faster type check (~10s vs ~60s build)
- `npm test` → unit tests
- Manual curl/API test → API behavior

### Context-Efficient Workflows

**Reading large files (>200 lines):**
- Grep first untuk relevant lines, baru read targeted ranges
- Contoh: `grep "functionName" src/lib/auth.ts` → dapat line number → read dengan offset

**Generated files (`dist/`, `.next/`, `node_modules/`):**
- Search only, don't read
- Gunakan grep/glob bukan read

**Build/test output:**
- Capture to file, analyze tanpa re-run
- Contoh: `npm run build 2>&1 | tee /tmp/build.log`

**Batch edits:**
- Group related edits across files, then run one build
- Jangan edit-satu, build-satu

### Secrets & Environment Safety

- **Never print** tokens, API keys, cookies in responses or commits
- **Never commit** local secret files (`.env.local`, `*.pem`, credentials)
- **Use placeholders** in docs: `YOUR_API_KEY`, `https://your-domain.com`
- **Mirror CI env names** exactly, but do not inline literal values
- **Ask user** jika required secret missing — do not invent placeholders
- **Redact** sensitive values saat share command output

### Rules Penting

1. **JANGAN langsung fix** — review dulu, konfirmasi dengan user
2. **JANGAN commit tanpa konfirmasi** — kecuali user minta
3. **JANGAN push ke main** tanpa PR atau konfirmasi user
4. **SELALU jalankan** `npm run lint` dan `npm run build` sebelum commit
5. **SELALU buat branch baru** dari main untuk setiap task
6. **SELALU konfirmasi** sebelum hapus file atau membuat perubahan besar
7. **SELALU cek** `git branch` di awal session untuk tahu konteks
