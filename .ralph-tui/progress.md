# Hafiportrait Platform — Ralph TUI Context

## Project
Next.js 15 + React 19 + TypeScript 5 (strict) + Prisma 5 + PostgreSQL + Tailwind CSS 4
Platform manajemen galeri foto pernikahan untuk fotografer.

## Git Workflow (WAJIB)
- `main` = production-ready, selalu stabil
- Setiap task = branch baru dari `main` dengan naming: `feat/`, `fix/`, `chore/`, `refactor/`
- Sebelum commit WAJIB: `npm run lint` (0 error) + `npm run build` (sukses)
- Commit format: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- Setelah task selesai: buat PR ke `main`

## Quality Gate (WAJIB sebelum setiap commit)
```bash
npm run lint    # 0 error, 0 warning
npm run build   # Build sukses tanpa TypeScript error
```

## Coding Rules
- Strict TypeScript — tidak ada `any` type
- Zod validation di semua API route yang menerima input
- Response helpers dari `src/lib/api/response.ts`
- Prisma client langsung — tidak ada `$queryRaw` / `$executeRaw`
- `use client` hanya jika komponen butuh interaktivitas/hooks browser
- File: `kebab-case.tsx` | Component: `PascalCase` | Variable: `camelCase`

## Key Files
- `src/lib/db.ts` — Prisma singleton
- `src/lib/api/response.ts` — Response helpers (gunakan selalu)
- `src/lib/cloudinary/utils.ts` — Cloudinary URL utilities (jangan duplikat!)
- `src/lib/cors.ts` — CORS allowed origins
- `middleware.ts` — Auth + CORS middleware
- `prisma/schema.prisma` — Database schema

## Tech Stack
- Auth: NextAuth.js 4 (JWT, Credentials)
- Storage: Cloudinary (multi-account)
- Realtime: Ably
- Validation: Zod
- Icons: Lucide React
