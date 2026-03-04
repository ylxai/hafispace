# 🏗️ ARCHITECTURE ISSUES — Hafiportrait Platform

> **Tanggal Audit**: 2026-03-04  
> **Status**: 6 isu ditemukan (2 High, 4 Medium)

---

## 🟠 HIGH

### ARCH-1: Tight Coupling dengan Cloudinary

**Files**: 
- `src/lib/cloudinary.ts` (733 LOC)
- `src/lib/cloudinary-upload.ts` (443 LOC)
- `src/components/admin/drag-drop-upload.tsx`
- Multiple API routes

**Masalah**:
- Cloudinary logic tersebar di banyak file
- Tidak ada abstraction layer untuk storage provider
- Direct dependency ke Cloudinary SDK di banyak tempat
- Sulit untuk switch ke provider lain (AWS S3, Google Cloud Storage, R2)

**Current Architecture**:
```
┌─────────────────┐
│  API Routes     │
│  Components     │
└────────┬────────┘
         │ Direct import
         ▼
┌─────────────────┐
│  cloudinary.ts  │ ← Tight coupling
│  (Cloudinary    │
│   SDK)          │
└─────────────────┘
```

**Impact**:
- Vendor lock-in dengan Cloudinary
- Sulit untuk migrate ke provider lain
- Tidak bisa support multiple storage providers
- Testing sulit (harus mock Cloudinary SDK)

**Rekomendasi**:

**Option 1: Storage Abstraction Layer**
```typescript
// File: src/lib/storage/interface.ts

export interface StorageProvider {
  upload(file: Buffer, options: UploadOptions): Promise<UploadResult>;
  delete(fileId: string): Promise<void>;
  list(folderId: string, cursor?: string): Promise<ListResult>;
  getUrl(fileId: string, transformations?: Transformations): string;
}

export interface UploadOptions {
  folder: string;
  filename: string;
  transformations?: Transformations;
}

export interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  size: number;
}

// File: src/lib/storage/cloudinary.provider.ts

export class CloudinaryProvider implements StorageProvider {
  constructor(private config: CloudinaryConfig) {}

  async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
    const cloudinary = this.getClient();
    const result = await cloudinary.uploader.upload(file, {
      folder: options.folder,
      public_id: options.filename,
    });
    
    return {
      id: result.public_id,
      url: result.secure_url,
      thumbnailUrl: this.getUrl(result.public_id, { width: 300 }),
      width: result.width,
      height: result.height,
      size: result.bytes,
    };
  }

  async delete(fileId: string): Promise<void> {
    const cloudinary = this.getClient();
    await cloudinary.uploader.destroy(fileId);
  }

  // ... implement other methods
}

// File: src/lib/storage/s3.provider.ts

export class S3Provider implements StorageProvider {
  constructor(private config: S3Config) {}

  async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
    const s3 = new S3Client(this.config);
    const key = `${options.folder}/${options.filename}`;
    
    await s3.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: file,
    }));
    
    return {
      id: key,
      url: `https://${this.config.bucket}.s3.amazonaws.com/${key}`,
      // ... other fields
    };
  }

  // ... implement other methods
}

// File: src/lib/storage/factory.ts

export function getStorageProvider(
  vendorId: string,
  accountId?: string
): Promise<StorageProvider> {
  const account = await getStorageAccount(vendorId, accountId);
  
  switch (account.provider) {
    case 'cloudinary':
      return new CloudinaryProvider(account.config);
    case 's3':
      return new S3Provider(account.config);
    case 'r2':
      return new R2Provider(account.config);
    default:
      throw new Error(`Unknown provider: ${account.provider}`);
  }
}

// Usage di API routes:
export async function POST(request: Request) {
  const storage = await getStorageProvider(vendorId, accountId);
  const result = await storage.upload(file, {
    folder: 'galleries',
    filename: 'photo.jpg',
  });
}
```

**Option 2: Adapter Pattern**
```typescript
// File: src/lib/storage/adapter.ts

export class StorageAdapter {
  private provider: StorageProvider;

  constructor(provider: StorageProvider) {
    this.provider = provider;
  }

  async uploadPhoto(
    file: Buffer,
    galleryId: string,
    filename: string
  ): Promise<Photo> {
    const result = await this.provider.upload(file, {
      folder: `galleries/${galleryId}`,
      filename,
    });

    // Save to database
    const photo = await prisma.photo.create({
      data: {
        galleryId,
        storageKey: result.id,
        filename,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        width: result.width,
        height: result.height,
        size: result.size,
      },
    });

    return photo;
  }

  async deletePhoto(photoId: string): Promise<void> {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      throw new Error('Photo not found');
    }

    // Delete from storage
    await this.provider.delete(photo.storageKey);

    // Delete from database
    await prisma.photo.delete({
      where: { id: photoId },
    });
  }
}
```

**Priority**: 🟠 HIGH (flexibility, maintainability)

**Estimated Refactor Time**: 1-2 minggu

---

### ARCH-2: Business Logic di API Routes

**Files**: Multiple API routes (especially `metrics/route.ts`, `events/route.ts`)

**Kode Bermasalah**:
```typescript
// File: src/app/api/admin/metrics/route.ts (line 83-120)

export async function GET() {
  const session = await auth();
  // ... 10 database queries

  // ❌ Business logic di API handler
  const totalOmset = allPayments.reduce((sum, p) => sum + Number(p.jumlah), 0);
  const pemasukanBulanIni = paymentsBulanIni.reduce((sum, p) => sum + Number(p.jumlah), 0);
  const dpBulanIni = paymentsBulanIni
    .filter((p) => p.tipe === "DP")
    .reduce((sum, p) => sum + Number(p.jumlah), 0);

  // ... 40 lines of calculation logic

  const trendMap = new Map();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    // ... complex logic
  }

  return NextResponse.json({ ... });
}
```

**Masalah**:
- Business logic tercampur dengan API handler
- Sulit untuk unit test (harus mock HTTP request)
- Tidak reusable di tempat lain (e.g., background jobs, CLI)
- Violates Single Responsibility Principle

**Current Architecture**:
```
┌─────────────────────────────┐
│  API Route Handler          │
│  ├─ Auth check              │
│  ├─ Database queries        │
│  ├─ Business logic ❌       │
│  ├─ Data transformation ❌  │
│  └─ Response formatting     │
└─────────────────────────────┘
```

**Impact**:
- Hard to test (need to mock HTTP layer)
- Code duplication (same logic di multiple routes)
- Difficult to maintain (logic scattered)

**Rekomendasi**:

**Option 1: Service Layer Pattern**
```typescript
// File: src/services/metrics.service.ts

export class MetricsService {
  constructor(private prisma: PrismaClient) {}

  async getOverviewMetrics(vendorId: string, dateRange: DateRange) {
    const [totalBookings, totalClients, allPayments] = await Promise.all([
      this.prisma.booking.count({ where: { vendorId } }),
      this.prisma.client.count({ where: { vendorId } }),
      this.prisma.payment.findMany({
        where: { vendorId },
        select: { jumlah: true, tipe: true, createdAt: true },
      }),
    ]);

    return {
      totalBookings,
      totalClients,
      totalOmset: this.calculateTotalOmset(allPayments),
      pemasukanBulanIni: this.calculatePemasukanBulanIni(allPayments, dateRange),
    };
  }

  private calculateTotalOmset(payments: Payment[]): number {
    return payments.reduce((sum, p) => sum + Number(p.jumlah), 0);
  }

  private calculatePemasukanBulanIni(
    payments: Payment[],
    dateRange: DateRange
  ): number {
    return payments
      .filter(p => p.createdAt >= dateRange.start && p.createdAt <= dateRange.end)
      .reduce((sum, p) => sum + Number(p.jumlah), 0);
  }

  async getTopPackages(vendorId: string, limit: number = 5) {
    const topPackages = await this.prisma.booking.groupBy({
      by: ["paketId"],
      where: { vendorId, paketId: { not: null } },
      _count: { paketId: true },
      orderBy: { _count: { paketId: "desc" } },
      take: limit,
    });

    // Resolve package names
    const packageIds = topPackages.map(p => p.paketId).filter(Boolean);
    const packages = await this.prisma.package.findMany({
      where: { id: { in: packageIds } },
      select: { id: true, namaPaket: true, kategori: true },
    });

    const packageMap = new Map(packages.map(p => [p.id, p]));

    return topPackages.map(p => ({
      paketId: p.paketId,
      count: p._count.paketId,
      namaPaket: packageMap.get(p.paketId)?.namaPaket ?? "Tanpa Paket",
      kategori: packageMap.get(p.paketId)?.kategori ?? "LAINNYA",
    }));
  }
}

// File: src/app/api/admin/metrics/route.ts

import { MetricsService } from '@/services/metrics.service';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const metricsService = new MetricsService(prisma);
  
  const dateRange = {
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  };

  const [overview, topPackages, recentBookings] = await Promise.all([
    metricsService.getOverviewMetrics(session.user.id, dateRange),
    metricsService.getTopPackages(session.user.id),
    metricsService.getRecentBookings(session.user.id, 5),
  ]);

  return NextResponse.json({
    overview,
    topPackages,
    recentBookings,
  });
}
```

**Option 2: Repository Pattern**
```typescript
// File: src/repositories/booking.repository.ts

export class BookingRepository {
  constructor(private prisma: PrismaClient) {}

  async findByVendor(vendorId: string, options?: FindOptions) {
    return this.prisma.booking.findMany({
      where: { vendorId, ...options?.where },
      include: options?.include,
      orderBy: options?.orderBy,
      take: options?.limit,
    });
  }

  async countByVendor(vendorId: string, dateRange?: DateRange) {
    return this.prisma.booking.count({
      where: {
        vendorId,
        ...(dateRange && {
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        }),
      },
    });
  }

  async getTopPackages(vendorId: string, limit: number = 5) {
    return this.prisma.booking.groupBy({
      by: ["paketId"],
      where: { vendorId, paketId: { not: null } },
      _count: { paketId: true },
      orderBy: { _count: { paketId: "desc" } },
      take: limit,
    });
  }
}

// Usage:
const bookingRepo = new BookingRepository(prisma);
const topPackages = await bookingRepo.getTopPackages(vendorId);
```

**Priority**: 🟠 HIGH (testability, maintainability)

**Estimated Refactor Time**: 1-2 minggu

---

## 🟡 MEDIUM

### ARCH-3: Duplicate Code untuk Thumbnail Generation

**Files**:
- `src/app/gallery/[token]/page.tsx` (line 45-60)
- `src/components/gallery/lightbox.tsx` (line 30-45)
- `src/components/admin/selections-modal.tsx` (line 50-65)

**Kode Bermasalah**:
```typescript
// ❌ Duplicated in 3 files

function extractPublicId(url: string): string {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
  return match ? match[1] : url;
}

function extractCloudName(url: string): string {
  const match = url.match(/https?:\/\/res\.cloudinary\.com\/([^/]+)/);
  return match ? match[1] : process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'doweertbx';
}

function generateThumbnailUrl(url: string): string {
  const publicId = extractPublicId(url);
  const cloudName = extractCloudName(url);
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_300,h_300,c_fill,q_auto,f_auto/${publicId}`;
}
```

**Masalah**:
- 3 fungsi yang sama di-duplicate di 3 file berbeda
- Jika ada bug, harus fix di 3 tempat
- Jika ada perubahan logic, harus update 3 tempat
- Maintenance nightmare

**Impact**:
- Code duplication (DRY violation)
- Inconsistency risk (lupa update salah satu file)
- Harder to maintain

**Rekomendasi**:

```typescript
// File: src/lib/cloudinary-utils.ts

export function extractPublicId(url: string): string {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
  return match ? match[1] : url;
}

export function extractCloudName(url: string): string {
  const match = url.match(/https?:\/\/res\.cloudinary\.com\/([^/]+)/);
  return match ? match[1] : process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
}

export function generateThumbnailUrl(
  url: string,
  options: ThumbnailOptions = {}
): string {
  const {
    width = 300,
    height = 300,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options;

  const publicId = extractPublicId(url);
  const cloudName = extractCloudName(url);

  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_${crop}`,
    `q_${quality}`,
    `f_${format}`,
  ].join(',');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'crop';
  quality?: 'auto' | 'best' | 'good' | 'eco' | 'low';
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'avif';
}

// Usage:
import { generateThumbnailUrl } from '@/lib/cloudinary-utils';

const thumbnailUrl = generateThumbnailUrl(photo.url, {
  width: 400,
  height: 400,
  quality: 'best',
});
```

**Priority**: 🟡 MEDIUM (code quality)

**Estimated Fix Time**: 2-3 jam

---

### ARCH-4: Console.log Masih Ada di Production Code

**Files**: 26 files, 89 occurrences

**Kode Bermasalah**:
```typescript
// src/lib/cloudinary.ts
console.error('Error checking VIESUS enhancement setting:', error);

// src/lib/cloudinary-upload.ts
console.log("Generated URLs:", { ... });

// src/app/api/admin/galleries/[id]/upload/route.ts
console.error("Error uploading photos:", error);
```

**Masalah**:
- Console.log bisa expose sensitive data di production
- Tidak ada structured logging
- Sulit untuk monitoring dan debugging di production
- Tidak ada log levels (info, warn, error)

**Impact**:
- Security risk (sensitive data di logs)
- Poor observability
- Difficult debugging in production

**Rekomendasi**:

```typescript
// Install: npm install pino

// File: src/lib/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: [
      'password',
      'apiKey',
      'apiSecret',
      'token',
      'cloudinaryApiSecret',
      'req.headers.authorization',
    ],
    remove: true,
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  ...(process.env.NODE_ENV === 'production'
    ? {
        // Production: JSON format
        transport: undefined,
      }
    : {
        // Development: Pretty print
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }),
});

// Usage:
import { logger } from '@/lib/logger';

// Replace console.log
logger.info({ userId, action: 'upload' }, 'User uploaded photo');

// Replace console.error
logger.error({ err: error, galleryId }, 'Failed to upload photos');

// With context
logger.child({ vendorId }).info('Processing metrics');
```

**Priority**: 🟡 MEDIUM (best practice)

**Estimated Fix Time**: 4-6 jam (replace all occurrences)

---

### ARCH-5: Magic Numbers Tersebar

**Files**: Multiple files

**Kode Bermasalah**:
```typescript
// src/app/api/admin/galleries/[id]/upload/route.ts
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_FILES_PER_UPLOAD = 100;

// src/app/api/public/gallery/[token]/select/route.ts
const DEFAULT_MAX_SELECTION = 40;

// src/lib/cloudinary.ts
const CLOUDINARY_FOLDERS = {
  GALLERIES: 'hafispace/galleries',
  PROFILES: 'hafispace/profiles',
};
```

**Masalah**:
- Constants tidak centralized
- Sulit untuk maintain jika perlu ubah nilai
- Tidak ada single source of truth
- Magic numbers di banyak tempat

**Impact**:
- Maintenance difficulty
- Inconsistency risk
- Hard to configure per environment

**Rekomendasi**:

```typescript
// File: src/lib/constants.ts

export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB
  MAX_FILES_PER_UPLOAD: 100,
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ],
} as const;

export const SELECTION_LIMITS = {
  DEFAULT_MAX_SELECTION: 40,
  MIN_SELECTION: 1,
  MAX_SELECTION: 500,
} as const;

export const CLOUDINARY = {
  FOLDERS: {
    GALLERIES: 'hafispace/galleries',
    PROFILES: 'hafispace/profiles',
    THUMBNAILS: 'hafispace/thumbnails',
  },
  TRANSFORMATIONS: {
    THUMBNAIL: 'w_300,h_300,c_fill,q_auto,f_auto',
    PREVIEW: 'w_800,h_800,c_fit,q_auto,f_auto',
    FULL: 'q_auto,f_auto',
  },
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const;

export const CACHE_TTL = {
  METRICS: 5 * 60, // 5 minutes
  GALLERY: 10 * 60, // 10 minutes
  PHOTOS: 30 * 60, // 30 minutes
} as const;

// Usage:
import { UPLOAD_LIMITS, SELECTION_LIMITS } from '@/lib/constants';

if (file.size > UPLOAD_LIMITS.MAX_FILE_SIZE) {
  throw new Error('File too large');
}

if (currentCount >= SELECTION_LIMITS.DEFAULT_MAX_SELECTION) {
  throw new Error('Quota exceeded');
}
```

**Priority**: 🟡 MEDIUM (code organization)

**Estimated Fix Time**: 2-3 jam

---

### ARCH-6: Tidak Ada Unit Tests

**Files**: No test files in `src/`

**Masalah**:
- Tidak ada test coverage
- Refactoring jadi risky
- Sulit untuk ensure code quality
- Regression bugs tidak terdeteksi

**Impact**:
- High risk untuk refactoring
- Bugs tidak terdeteksi early
- Difficult to maintain confidence

**Rekomendasi**:

```typescript
// Install: npm install -D vitest @testing-library/react @testing-library/jest-dom

// File: vitest.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

// File: tests/setup.ts

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// File: src/services/__tests__/metrics.service.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsService } from '../metrics.service';
import { PrismaClient } from '@prisma/client';

describe('MetricsService', () => {
  let service: MetricsService;
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
    service = new MetricsService(prisma);
  });

  describe('getOverviewMetrics', () => {
    it('should calculate total omset correctly', async () => {
      const vendorId = 'vendor-1';
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      // Mock Prisma queries
      vi.spyOn(prisma.booking, 'count').mockResolvedValue(10);
      vi.spyOn(prisma.client, 'count').mockResolvedValue(5);
      vi.spyOn(prisma.payment, 'findMany').mockResolvedValue([
        { jumlah: 1000000, tipe: 'DP', createdAt: new Date('2024-01-15') },
        { jumlah: 2000000, tipe: 'PELUNASAN', createdAt: new Date('2024-01-20') },
      ]);

      const result = await service.getOverviewMetrics(vendorId, dateRange);

      expect(result.totalBookings).toBe(10);
      expect(result.totalClients).toBe(5);
      expect(result.totalOmset).toBe(3000000);
    });
  });

  describe('getTopPackages', () => {
    it('should return top 5 packages by booking count', async () => {
      const vendorId = 'vendor-1';

      vi.spyOn(prisma.booking, 'groupBy').mockResolvedValue([
        { paketId: 'pkg-1', _count: { paketId: 10 } },
        { paketId: 'pkg-2', _count: { paketId: 5 } },
      ]);

      vi.spyOn(prisma.package, 'findMany').mockResolvedValue([
        { id: 'pkg-1', namaPaket: 'Wedding', kategori: 'WEDDING' },
        { id: 'pkg-2', namaPaket: 'Prewedding', kategori: 'PREWED' },
      ]);

      const result = await service.getTopPackages(vendorId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        paketId: 'pkg-1',
        count: 10,
        namaPaket: 'Wedding',
        kategori: 'WEDDING',
      });
    });
  });
});

// File: package.json

{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Priority**: 🟡 MEDIUM (long-term quality)

**Estimated Setup Time**: 2-3 hari (setup + write initial tests)

---

## 📊 SUMMARY

| Issue ID | Severity | Impact | Fix Time | Priority |
|----------|----------|--------|----------|----------|
| ARCH-1 | 🟠 High | Vendor lock-in, flexibility | 1-2 minggu | High |
| ARCH-2 | 🟠 High | Testability, maintainability | 1-2 minggu | High |
| ARCH-3 | 🟡 Medium | Code duplication | 2-3 jam | Medium |
| ARCH-4 | 🟡 Medium | Observability, security | 4-6 jam | Medium |
| ARCH-5 | 🟡 Medium | Maintainability | 2-3 jam | Low |
| ARCH-6 | 🟡 Medium | Quality assurance | 2-3 hari | Medium |

**Total Estimated Refactor Time**: 3-5 minggu (untuk semua improvements)

### Recommended Approach

**Phase 1 (Week 1-2)**: Quick Wins
- ARCH-3: Extract duplicate code
- ARCH-5: Centralize constants
- ARCH-4: Setup structured logging

**Phase 2 (Week 3-4)**: Service Layer
- ARCH-2: Extract business logic to services
- ARCH-6: Setup testing infrastructure

**Phase 3 (Week 5-6)**: Storage Abstraction
- ARCH-1: Implement storage abstraction layer

---

**Last Updated**: 2026-03-04  
**Next Review**: 2026-04-04
