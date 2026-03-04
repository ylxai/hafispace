# 🐛 HIGH & MEDIUM BUGS — Hafiportrait Platform

> **Tanggal Audit**: 2026-03-04  
> **Status**: 3 High, 3 Medium bugs ditemukan

---

## 🟠 HIGH

### BUG-3: Photo Deletion Tidak Hapus dari Cloudinary

**File**: `src/app/api/admin/galleries/[id]/selections/route.ts` (line 171-210)

**Kode Bermasalah**:
```typescript
export async function DELETE(request: Request, { params }) {
  const { id: galleryId } = await params;
  const { searchParams } = new URL(request.url);
  const selectionId = searchParams.get("id");

  const selection = await prisma.photoSelection.findUnique({
    where: { id: selectionId },
  });

  if (!selection) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Selection not found" },
      { status: 404 }
    );
  }

  // ❌ Delete dari database saja
  await prisma.photoSelection.delete({ where: { id: selectionId } });

  // ❌ Foto tetap ada di Cloudinary!
  // Tidak ada cleanup

  return NextResponse.json({ success: true });
}
```

**Masalah**:
- Delete selection dari database, tapi foto tetap ada di Cloudinary
- Tidak ada cascade delete ke storage provider
- Orphaned files terus bertambah
- Storage cost terus meningkat tanpa cleanup

**Impact**:
- **Storage Cost**: 1000 orphaned photos × 5MB = 5GB wasted storage
- **Cloudinary Pricing**: 
  - Free tier: 25GB → habis dalam 5 bulan
  - Paid tier: $0.02/GB/month → $0.10/month untuk 5GB orphaned
- **Tidak scalable**: Setelah 1 tahun bisa ada 10,000+ orphaned files

**Rekomendasi**:

**Option 1: Cascade Delete (Immediate)**
```typescript
export async function DELETE(request: Request, { params }) {
  const { id: galleryId } = await params;
  const { searchParams } = new URL(request.url);
  const selectionId = searchParams.get("id");

  const selection = await prisma.photoSelection.findUnique({
    where: { id: selectionId },
    include: {
      gallery: {
        select: { vendorId: true },
      },
    },
  });

  if (!selection) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Selection not found" },
      { status: 404 }
    );
  }

  // ✅ Delete dari Cloudinary dulu
  try {
    const account = await getCloudinaryAccount(selection.gallery.vendorId);
    const cloudinaryClient = getCloudinaryInstance(account);
    
    await cloudinaryClient.uploader.destroy(selection.fileId);
  } catch (error) {
    console.error('Failed to delete from Cloudinary:', error);
    // Continue dengan database deletion
  }

  // ✅ Baru delete dari database
  await prisma.photoSelection.delete({ where: { id: selectionId } });

  return NextResponse.json({ success: true });
}
```

**Option 2: Background Job untuk Cleanup (Recommended)**
```typescript
// Install: npm install bullmq

import { Queue } from 'bullmq';

const cleanupQueue = new Queue('cloudinary-cleanup', {
  connection: { host: 'localhost', port: 6379 },
});

// API handler: Queue deletion
export async function DELETE(request: Request, { params }) {
  // ... validation

  // Delete dari database
  await prisma.photoSelection.delete({ where: { id: selectionId } });

  // Queue cleanup job
  await cleanupQueue.add('delete-photo', {
    fileId: selection.fileId,
    vendorId: selection.gallery.vendorId,
  });

  return NextResponse.json({ success: true });
}

// Worker: Process cleanup
import { Worker } from 'bullmq';

const worker = new Worker('cloudinary-cleanup', async (job) => {
  const { fileId, vendorId } = job.data;
  
  const account = await getCloudinaryAccount(vendorId);
  const cloudinaryClient = getCloudinaryInstance(account);
  
  await cloudinaryClient.uploader.destroy(fileId);
}, {
  connection: { host: 'localhost', port: 6379 },
});
```

**Option 3: Scheduled Cleanup Job**
```typescript
// Cron job: Cleanup orphaned files setiap hari
// File: src/jobs/cleanup-orphaned-photos.ts

export async function cleanupOrphanedPhotos() {
  // Get all photos di Cloudinary
  const cloudinaryPhotos = await listAllPhotosFromCloudinary();
  
  // Get all photos di database
  const dbPhotos = await prisma.photo.findMany({
    select: { storageKey: true },
  });
  
  const dbPhotoIds = new Set(dbPhotos.map(p => p.storageKey));
  
  // Find orphaned photos
  const orphaned = cloudinaryPhotos.filter(
    photo => !dbPhotoIds.has(photo.public_id)
  );
  
  console.log(`Found ${orphaned.length} orphaned photos`);
  
  // Delete orphaned photos
  for (const photo of orphaned) {
    await cloudinary.uploader.destroy(photo.public_id);
  }
}

// Schedule dengan cron
import cron from 'node-cron';

cron.schedule('0 2 * * *', cleanupOrphanedPhotos); // Run at 2 AM daily
```

**Priority**: 🟠 HIGH (cost impact)

**Estimated Fix Time**: 4-6 jam

---

### BUG-4: Booking Deletion Tidak Check Gallery

**File**: `src/app/api/admin/events/route.ts` (line 205-237)

**Kode Bermasalah**:
```typescript
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("id");

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      vendorId: session.user.id,
    },
  });

  if (!booking) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Booking not found" },
      { status: 404 }
    );
  }

  // ❌ Tidak check apakah ada gallery
  await prisma.booking.delete({ where: { id: bookingId } });

  return NextResponse.json({
    success: true,
    message: "Booking deleted successfully",
  });
}
```

**Masalah**:
- Tidak check apakah booking punya gallery
- Jika booking dihapus, gallery jadi orphaned (bookingId = null)
- Data inconsistency: gallery tanpa booking
- Prisma schema punya `onDelete: Cascade` di beberapa relasi, tapi tidak di Gallery

**Prisma Schema**:
```prisma
model Gallery {
  id        String   @id @default(uuid())
  bookingId String?  @map("booking_id") @db.Uuid
  booking   Booking? @relation(fields: [bookingId], references: [id])
  // ❌ Tidak ada onDelete: Cascade
}
```

**Impact**:
- Gallery orphaned (tidak bisa trace ke booking)
- Reporting broken (tidak bisa aggregate by booking)
- Data cleanup sulit (tidak tahu gallery mana yang orphaned)

**Rekomendasi**:

**Option 1: Check Gallery Count Before Delete**
```typescript
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("id");

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      vendorId: session.user.id,
    },
    include: {
      _count: {
        select: { galleries: true },
      },
    },
  });

  if (!booking) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Booking not found" },
      { status: 404 }
    );
  }

  // ✅ Check if has galleries
  if (booking._count.galleries > 0) {
    return NextResponse.json(
      {
        code: "HAS_GALLERIES",
        message: `Cannot delete booking with ${booking._count.galleries} gallery(ies). Delete galleries first.`,
      },
      { status: 400 }
    );
  }

  await prisma.booking.delete({ where: { id: bookingId } });

  return NextResponse.json({
    success: true,
    message: "Booking deleted successfully",
  });
}
```

**Option 2: Cascade Delete Gallery (Recommended)**
```prisma
// File: prisma/schema.prisma

model Gallery {
  id        String   @id @default(uuid())
  bookingId String?  @map("booking_id") @db.Uuid
  booking   Booking? @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  // ✅ Add onDelete: Cascade
}
```

```bash
# Generate migration
npx prisma migrate dev --name add_cascade_delete_gallery
```

**Option 3: Soft Delete**
```prisma
model Booking {
  id        String    @id @default(uuid())
  deletedAt DateTime? @map("deleted_at")
  // ... other fields
}

model Gallery {
  id        String    @id @default(uuid())
  deletedAt DateTime? @map("deleted_at")
  // ... other fields
}
```

```typescript
// Soft delete booking
await prisma.booking.update({
  where: { id: bookingId },
  data: { deletedAt: new Date() },
});

// Query: Exclude deleted
const bookings = await prisma.booking.findMany({
  where: { 
    vendorId: session.user.id,
    deletedAt: null, // Only active bookings
  },
});
```

**Priority**: 🟠 HIGH (data integrity)

**Estimated Fix Time**: 2-3 jam

---

### BUG-5: Payment Calculation Tidak Handle Decimal Precision

**File**: `src/app/api/admin/metrics/route.ts` (line 83-87)

**Kode Bermasalah**:
```typescript
const allPayments = await prisma.payment.findMany({
  where: { vendorId },
  select: { jumlah: true },
});

// ❌ Convert Prisma Decimal to JavaScript Number
const totalOmset = allPayments.reduce(
  (sum, p) => sum + Number(p.jumlah),
  0
);

const pemasukanBulanIni = paymentsBulanIni.reduce(
  (sum, p) => sum + Number(p.jumlah),
  0
);
```

**Masalah**:
- Prisma `Decimal` type di-convert ke JavaScript `Number`
- JavaScript Number tidak akurat untuk decimal (floating point error)
- Contoh error:
  ```javascript
  0.1 + 0.2 = 0.30000000000000004 // ❌
  1000000.50 + 2000000.75 = 3000001.2499999 // ❌
  ```

**Prisma Schema**:
```prisma
model Payment {
  jumlah Decimal @db.Decimal(15, 0) // Decimal type
}

model Booking {
  hargaPaket Decimal? @db.Decimal(15, 0)
  dpAmount   Decimal? @db.Decimal(15, 0)
}
```

**Impact**:
- **Financial Calculation Error**: Total omset bisa salah beberapa rupiah
- **Rounding Error Accumulation**: Semakin banyak payment, semakin besar error
- **Compliance Issue**: Accounting harus akurat sampai sen terakhir

**Example**:
```javascript
// Real scenario:
const payments = [
  { jumlah: 1500000.50 },
  { jumlah: 2750000.75 },
  { jumlah: 3250000.25 },
];

// Current code (wrong):
const total = payments.reduce((sum, p) => sum + Number(p.jumlah), 0);
console.log(total); // 7500001.499999999 ❌

// Expected:
console.log(total); // 7500001.50 ✅
```

**Rekomendasi**:

**Option 1: Use decimal.js (Recommended)**
```typescript
// Install: npm install decimal.js

import Decimal from 'decimal.js';

const allPayments = await prisma.payment.findMany({
  where: { vendorId },
  select: { jumlah: true },
});

// ✅ Use Decimal for calculation
const totalOmset = allPayments
  .reduce(
    (sum, p) => sum.plus(p.jumlah),
    new Decimal(0)
  )
  .toNumber(); // Convert to number only for display

// Or keep as Decimal for further calculations
const totalOmsetDecimal = allPayments.reduce(
  (sum, p) => sum.plus(p.jumlah),
  new Decimal(0)
);

return NextResponse.json({
  overview: {
    totalOmset: totalOmsetDecimal.toFixed(2), // "7500001.50"
  },
});
```

**Option 2: Use Prisma Decimal Type**
```typescript
import { Prisma } from '@prisma/client';

const allPayments = await prisma.payment.findMany({
  where: { vendorId },
  select: { jumlah: true },
});

// ✅ Keep as Prisma Decimal
const totalOmset = allPayments.reduce(
  (sum, p) => sum.add(p.jumlah),
  new Prisma.Decimal(0)
);

return NextResponse.json({
  overview: {
    totalOmset: totalOmset.toString(), // "7500001.50"
  },
});
```

**Option 3: Use BigInt for Integer Cents**
```typescript
// Store amount in cents (integer)
// 1500000.50 → 150000050 cents

const allPayments = await prisma.payment.findMany({
  where: { vendorId },
  select: { jumlah: true },
});

// ✅ Calculate in cents (integer)
const totalCents = allPayments.reduce(
  (sum, p) => sum + BigInt(Math.round(Number(p.jumlah) * 100)),
  BigInt(0)
);

// Convert back to rupiah
const totalOmset = Number(totalCents) / 100;

return NextResponse.json({
  overview: {
    totalOmset: totalOmset.toFixed(2),
  },
});
```

**Priority**: 🟠 HIGH (financial accuracy)

**Estimated Fix Time**: 4-6 jam

---

## 🟡 MEDIUM

### BUG-6: Timezone Handling Tidak Konsisten

**File**: `src/app/api/admin/metrics/route.ts` (line 11-13)

**Kode Bermasalah**:
```typescript
export async function GET() {
  const session = await auth();
  const vendorId = session.user.id;
  
  // ❌ Menggunakan server timezone
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const bookingsBulanIni = await prisma.booking.count({
    where: {
      vendorId,
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    },
  });
}
```

**Masalah**:
- Menggunakan server timezone, bukan user timezone
- Jika server di UTC dan user di WIB (UTC+7):
  - User buka dashboard jam 00:30 WIB (17:30 UTC kemarin)
  - `startOfMonth` = 1 Januari 00:00 UTC
  - Tapi user expect 1 Januari 00:00 WIB
  - Data "bulan ini" salah 7 jam

**Impact**:
- Metrics tidak akurat untuk user di timezone berbeda
- Booking "hari ini" bisa include booking kemarin
- Reporting salah untuk multi-timezone users

**Rekomendasi**:

**Option 1: Accept Timezone dari Client**
```typescript
export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const timezone = searchParams.get('timezone') ?? 'Asia/Jakarta';

  // ✅ Use user timezone
  const now = new Date();
  const startOfMonth = startOfMonthInTimezone(now, timezone);
  const endOfMonth = endOfMonthInTimezone(now, timezone);

  // ... rest of code
}

// Helper functions
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

function startOfMonthInTimezone(date: Date, timezone: string): Date {
  const zonedDate = utcToZonedTime(date, timezone);
  const startOfMonth = new Date(zonedDate.getFullYear(), zonedDate.getMonth(), 1);
  return zonedTimeToUtc(startOfMonth, timezone);
}
```

**Option 2: Store Timezone di Vendor Profile**
```prisma
model Vendor {
  id       String @id @default(uuid())
  timezone String @default("Asia/Jakarta")
  // ... other fields
}
```

```typescript
export async function GET() {
  const session = await auth();
  
  const vendor = await prisma.vendor.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  });

  const timezone = vendor?.timezone ?? 'Asia/Jakarta';
  
  // Use timezone for calculations
  const now = new Date();
  const startOfMonth = startOfMonthInTimezone(now, timezone);
}
```

**Priority**: 🟡 MEDIUM (depends on user base)

**Estimated Fix Time**: 3-4 jam

---

### BUG-7: File Upload Validation Tidak Check Actual File Type

**File**: `src/app/api/admin/galleries/[id]/upload/route.ts` (line 95-100)

**Kode Bermasalah**:
```typescript
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  // ...
];

for (const file of files) {
  // ❌ Hanya check MIME type dari client
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type: ${file.type}` },
      { status: 400 }
    );
  }

  // ❌ Tidak verify actual file content
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  validatedFiles.push({ file: buffer, filename: file.name, mimeType: file.type });
}
```

**Masalah**:
- Hanya check MIME type dari client (bisa di-spoof)
- Tidak ada magic number validation untuk verify actual file type
- Attacker bisa upload malicious file dengan MIME type image/jpeg

**Attack Scenario**:
```javascript
// Attacker upload .exe dengan MIME type image/jpeg
const maliciousFile = new File(
  [executableBytes],
  'malware.jpg',
  { type: 'image/jpeg' } // ❌ Spoofed MIME type
);

const formData = new FormData();
formData.append('files', maliciousFile);

await fetch('/api/admin/galleries/ID/upload', {
  method: 'POST',
  body: formData,
});
// Server accept karena MIME type valid
```

**Impact**:
- Malicious file upload (malware, scripts)
- XSS attack jika file di-serve tanpa proper headers
- Storage pollution dengan non-image files

**Rekomendasi**:

**Option 1: Use file-type Library**
```typescript
// Install: npm install file-type

import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

for (const file of files) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // ✅ Verify actual file type from magic number
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    return NextResponse.json(
      { 
        error: `Invalid file type. Expected image, got ${fileType?.mime ?? 'unknown'}`,
        filename: file.name,
      },
      { status: 400 }
    );
  }

  validatedFiles.push({
    file: buffer,
    filename: file.name,
    mimeType: fileType.mime, // ✅ Use verified MIME type
  });
}
```

**Option 2: Use Sharp for Image Validation**
```typescript
// Install: npm install sharp

import sharp from 'sharp';

for (const file of files) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    // ✅ Try to parse as image
    const metadata = await sharp(buffer).metadata();
    
    // Verify dimensions
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }

    // Verify format
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) {
      throw new Error(`Unsupported format: ${metadata.format}`);
    }

    validatedFiles.push({
      file: buffer,
      filename: file.name,
      mimeType: `image/${metadata.format}`,
      width: metadata.width,
      height: metadata.height,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: `Invalid image file: ${file.name}`,
        details: error.message,
      },
      { status: 400 }
    );
  }
}
```

**Priority**: 🟡 MEDIUM (security best practice)

**Estimated Fix Time**: 2-3 jam

---

### BUG-8: Error Handling Tidak Konsisten (Silent Failures)

**File**: Multiple files (empty catch blocks)

**Kode Bermasalah**:
```typescript
// File: src/app/api/public/gallery/[token]/select/route.ts (line 130-140)
try {
  const ably = getAblyRest();
  await ably.channels
    .get(ABLY_CHANNEL_SELECTION(gallery.id))
    .publish("count-updated", { count: finalCount, fileId, action });
} catch {
  // ❌ Empty catch block - silent failure
  // Non-critical — don't fail the request if Ably publish fails
}

// File: src/components/admin/drag-drop-upload.tsx (line 52)
try {
  const response = await fetch('/api/admin/settings/cloudinary/accounts');
  const data = await response.json();
  setAccounts(data.accounts);
} catch (error) {
  // ❌ No logging
  console.error("Failed to fetch accounts:", error);
}
```

**Masalah**:
- Empty catch blocks tanpa logging
- Silent failures sulit untuk debugging
- Tidak ada visibility untuk production errors
- User tidak tahu ada error (bad UX)

**Impact**:
- Real-time counter tidak update (user bingung)
- Cloudinary accounts tidak load (upload gagal)
- Debugging sulit (tidak ada error logs)

**Rekomendasi**:

**Option 1: Structured Logging**
```typescript
// Install: npm install pino

import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Usage:
try {
  const ably = getAblyRest();
  await ably.channels
    .get(ABLY_CHANNEL_SELECTION(gallery.id))
    .publish("count-updated", { count: finalCount, fileId, action });
} catch (error) {
  // ✅ Log error dengan context
  logger.warn({
    err: error,
    galleryId: gallery.id,
    fileId,
    action,
  }, 'Failed to publish Ably update');
  
  // Continue - non-critical error
}
```

**Option 2: Error Monitoring Service**
```typescript
// Install: npm install @sentry/nextjs

import * as Sentry from '@sentry/nextjs';

try {
  // ... code
} catch (error) {
  // ✅ Send to Sentry
  Sentry.captureException(error, {
    tags: {
      component: 'gallery-selection',
      action: 'ably-publish',
    },
    extra: {
      galleryId: gallery.id,
      fileId,
    },
  });
  
  // Continue
}
```

**Option 3: User-Facing Error Messages**
```typescript
// Client-side error handling
try {
  const response = await fetch('/api/admin/settings/cloudinary/accounts');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  setAccounts(data.accounts);
} catch (error) {
  console.error("Failed to fetch accounts:", error);
  
  // ✅ Show user-friendly error
  toast.error('Failed to load Cloudinary accounts. Please refresh the page.');
  
  // ✅ Set error state
  setError('Failed to load accounts');
}
```

**Priority**: 🟡 LOW (best practice)

**Estimated Fix Time**: 4-6 jam (untuk semua occurrences)

---

## 📊 SUMMARY

| Bug ID | Severity | Impact | Fix Time | Priority |
|--------|----------|--------|----------|----------|
| BUG-3 | 🟠 High | Storage cost, orphaned files | 4-6 jam | High |
| BUG-4 | 🟠 High | Data integrity, orphaned galleries | 2-3 jam | High |
| BUG-5 | 🟠 High | Financial accuracy | 4-6 jam | High |
| BUG-6 | 🟡 Medium | Metrics accuracy | 3-4 jam | Medium |
| BUG-7 | 🟡 Medium | Security, malicious uploads | 2-3 jam | Medium |
| BUG-8 | 🟡 Medium | Debugging, monitoring | 4-6 jam | Low |

**Total Estimated Fix Time**: 19-28 jam (~3-4 hari kerja)

---

**Last Updated**: 2026-03-04  
**Next Review**: 2026-03-11
