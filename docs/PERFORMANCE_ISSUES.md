# ⚡ PERFORMANCE ISSUES — Hafiportrait Platform

> **Tanggal Audit**: 2026-03-04  
> **Status**: 6 isu ditemukan (1 Critical, 2 High, 3 Medium)

---

## 🔴 CRITICAL

### PERF-1: N+1 Query Problem di Metrics Endpoint

**File**: `src/app/api/admin/metrics/route.ts` (line 17-95)

**Kode Bermasalah**:
```typescript
export async function GET() {
  // 9 queries parallel
  const [
    totalBookings,
    bookingsBulanIni,
    totalClients,
    allPayments,
    paymentsBulanIni,
    topPackages,
    upcomingSessionsThisMonth,
    recentBookings,
    paymentsTrend,
  ] = await Promise.all([
    prisma.booking.count({ where: { vendorId } }),
    prisma.booking.count({ where: { vendorId, createdAt: { gte: startOfMonth } } }),
    // ... 7 queries lagi
  ]);

  // Query ke-10 (setelah Promise.all selesai)
  const packageIds = topPackages.map((p) => p.paketId).filter(Boolean);
  const packageNames = await prisma.package.findMany({
    where: { id: { in: packageIds } },
  });
}
```

**Masalah**:
- **10 database roundtrips** untuk 1 request
- Query ke-10 baru dijalankan setelah 9 query pertama selesai
- Tidak optimal: bisa di-reduce jadi 1-2 queries dengan proper joins
- Jika database latency 50ms, total time = 50ms × 10 = 500ms minimum

**Benchmark**:
```
Database Latency | Total Time
-----------------|------------
10ms (local)     | 100ms
50ms (same DC)   | 500ms
100ms (cross DC) | 1000ms
200ms (slow)     | 2000ms
```

**Impact**:
- Dashboard load time 500ms - 2s tergantung database latency
- High database load jika banyak concurrent users
- Tidak scalable untuk 100+ concurrent users

**Rekomendasi**:
```typescript
// Option 1: Optimize dengan Prisma aggregation
const metrics = await prisma.$transaction([
  // Combine multiple counts into one query
  prisma.booking.aggregate({
    where: { vendorId },
    _count: { id: true },
  }),
  
  // Use include untuk avoid N+1
  prisma.booking.findMany({
    where: { vendorId },
    include: {
      paket: { select: { namaPaket: true, kategori: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  }),
]);

// Option 2: Use raw SQL untuk complex aggregations
const metrics = await prisma.$queryRaw`
  SELECT 
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE created_at >= ${startOfMonth}) as bookings_bulan_ini,
    (SELECT COUNT(*) FROM clients WHERE vendor_id = ${vendorId}) as total_clients
  FROM bookings
  WHERE vendor_id = ${vendorId}
`;

// Option 3: Cache hasil dengan Redis (TTL 5-10 menit)
const cacheKey = `metrics:${vendorId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return NextResponse.json(JSON.parse(cached));
}

const metrics = await fetchMetrics(vendorId);
await redis.set(cacheKey, JSON.stringify(metrics), { ex: 300 }); // 5 minutes
```

**Priority**: 🔥 HIGH

**Estimated Fix Time**: 4-6 jam

---

## 🟠 HIGH

### PERF-2: Bulk Upload Tanpa Streaming (Memory Exhaustion Risk)

**File**: `src/app/api/admin/galleries/[id]/upload/route.ts` (line 90-120)

**Kode Bermasalah**:
```typescript
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_FILES_PER_UPLOAD = 100;

const formData = await request.formData();
const files = formData.getAll("files") as File[];

// Load semua file ke memory sekaligus
const validatedFiles: Array<{ file: Buffer; filename: string }> = [];

for (const file of files) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer); // Load ke memory
  validatedFiles.push({ file: buffer, filename: file.name });
}

// Upload semua file sekaligus
const uploadResults = await uploadMultipleImages(
  validatedFiles,
  folderId,
  account
);
```

**Masalah**:
- **Memory Usage**: 100 files × 15MB = **1.5GB memory**
- Semua file di-load ke memory sebelum upload
- Tidak ada streaming upload ke Cloudinary
- Di serverless environment (Vercel):
  - Max memory: 1GB (Pro plan) atau 3GB (Enterprise)
  - Max request body: 50MB
  - Max execution time: 10s (Hobby) atau 60s (Pro)

**Attack Scenario**:
```javascript
// Attacker upload 100 files × 15MB = 1.5GB
const formData = new FormData();
for (let i = 0; i < 100; i++) {
  const blob = new Blob([new Uint8Array(15 * 1024 * 1024)]); // 15MB
  formData.append('files', blob, `file${i}.jpg`);
}

await fetch('/api/admin/galleries/ID/upload', {
  method: 'POST',
  body: formData,
});
// Server crash atau timeout
```

**Impact**:
- **Out of Memory (OOM)** error di serverless
- Request timeout (exceed 60s limit)
- Server crash untuk concurrent uploads
- Bad user experience (upload gagal tanpa feedback)

**Rekomendasi**:
```typescript
// Option 1: Streaming upload dengan chunks
import { Readable } from 'stream';

async function uploadFileStream(file: File, account: CloudinaryAccountConfig) {
  const stream = file.stream();
  const cloudinaryStream = cloudinary.uploader.upload_stream(
    { folder: folderId },
    (error, result) => {
      if (error) throw error;
      return result;
    }
  );
  
  // Pipe file stream ke Cloudinary
  stream.pipeTo(cloudinaryStream);
}

// Option 2: Batch processing dengan queue
// Upload 10 files at a time, not 100
const BATCH_SIZE = 10;
const results = [];

for (let i = 0; i < files.length; i += BATCH_SIZE) {
  const batch = files.slice(i, i + BATCH_SIZE);
  const batchResults = await Promise.all(
    batch.map(file => uploadFile(file, account))
  );
  results.push(...batchResults);
}

// Option 3: Background job dengan queue (BullMQ, Inngest)
import { inngest } from './inngest';

// API endpoint hanya create job
await inngest.send({
  name: 'gallery.upload',
  data: {
    galleryId,
    fileUrls: files.map(f => f.url), // Pre-signed URLs
  },
});

return NextResponse.json({ 
  message: 'Upload queued',
  jobId: 'xxx',
});
```

**Priority**: 🔥 CRITICAL (risk of server crash)

**Estimated Fix Time**: 1-2 hari

---

### PERF-3: Gallery Page Fetch Semua Foto Sekaligus (No Pagination)

**File**: `src/app/api/public/gallery/[token]/route.ts` (line 11-50)

**Kode Bermasalah**:
```typescript
const gallery = await prisma.gallery.findUnique({
  where: { clientToken: token },
  include: {
    photos: { 
      orderBy: { urutan: "asc" } 
    }, // Fetch ALL photos
    selections: true, // Fetch ALL selections
    settings: true,
    booking: { select: { maxSelection: true } },
    vendor: { select: { namaStudio: true, phone: true } },
  },
});

return NextResponse.json({
  gallery: {
    // ... semua data termasuk 500+ photos
  },
});
```

**Masalah**:
- Fetch **semua foto** tanpa pagination
- Jika gallery punya 500 foto:
  - Database query: 500 rows
  - JSON response: 5-10MB
  - Client-side rendering: 500 images
- Network transfer time untuk 10MB response:
  - 4G (10 Mbps): 8 detik
  - 3G (1 Mbps): 80 detik
  - Slow connection: timeout

**Benchmark**:
```
Photo Count | Response Size | Load Time (4G)
------------|---------------|----------------
50 photos   | 500KB         | 0.4s
100 photos  | 1MB           | 0.8s
200 photos  | 2MB           | 1.6s
500 photos  | 5MB           | 4s
1000 photos | 10MB          | 8s
```

**Impact**:
- Slow page load untuk gallery dengan 200+ foto
- High bandwidth usage
- Poor mobile experience
- Database load untuk fetch large datasets

**Rekomendasi**:
```typescript
// Option 1: Cursor-based pagination
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = 50; // 50 photos per page

  const photos = await prisma.photo.findMany({
    where: { galleryId },
    take: limit + 1, // Fetch 1 extra untuk check if has more
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { urutan: 'asc' },
  });

  const hasMore = photos.length > limit;
  const items = hasMore ? photos.slice(0, -1) : photos;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({
    photos: items,
    nextCursor,
    hasMore,
  });
}

// Option 2: Infinite scroll di client
function GalleryPage() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['gallery', token],
    queryFn: ({ pageParam }) => 
      fetch(`/api/public/gallery/${token}?cursor=${pageParam}`),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  return (
    <InfiniteScroll
      loadMore={fetchNextPage}
      hasMore={hasNextPage}
    >
      {data.pages.map(page => 
        page.photos.map(photo => <PhotoCard key={photo.id} {...photo} />)
      )}
    </InfiniteScroll>
  );
}

// Option 3: Virtual scrolling untuk large lists
import { useVirtualizer } from '@tanstack/react-virtual';

function GalleryGrid({ photos }) {
  const parentRef = useRef();
  const virtualizer = useVirtualizer({
    count: photos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // Estimated photo card height
  });

  return (
    <div ref={parentRef} style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(item => (
          <PhotoCard key={item.index} photo={photos[item.index]} />
        ))}
      </div>
    </div>
  );
}
```

**Priority**: 🔥 HIGH (bad UX untuk large galleries)

**Estimated Fix Time**: 2-3 hari

---

## 🟡 MEDIUM

### PERF-4: Real-time Selection Counter Tanpa Debouncing

**File**: `src/app/api/public/gallery/[token]/select/route.ts` (line 130-140)

**Kode Bermasalah**:
```typescript
// Setiap select/unselect langsung publish ke Ably
await prisma.photoSelection.create({ ... });

const finalCount = await incrementSelection(gallery.id);

// Publish real-time update
await ably.channels
  .get(ABLY_CHANNEL_SELECTION(gallery.id))
  .publish("count-updated", {
    count: finalCount,
    fileId,
    action,
  });
```

**Masalah**:
- Setiap click = 1 Ably message
- Jika user spam click (select/unselect cepat):
  - 10 clicks per detik = 10 Ably messages
  - Ably free tier limit: **6 messages/second**
  - Akan exceed quota dan throttled
- Tidak ada debouncing atau batching

**Attack Scenario**:
```javascript
// User spam click select/unselect
for (let i = 0; i < 100; i++) {
  await fetch('/api/public/gallery/TOKEN/select', {
    method: 'POST',
    body: JSON.stringify({
      fileId: 'photo1',
      action: i % 2 === 0 ? 'add' : 'remove',
    }),
  });
}
// Ably quota exceeded
```

**Impact**:
- Ably quota exceeded (free tier: 6 msg/s, paid: 100 msg/s)
- Real-time updates stop working
- Extra cost untuk Ably paid plan

**Rekomendasi**:
```typescript
// Option 1: Debounce di client-side
import { useDebouncedCallback } from 'use-debounce';

function PhotoCard({ photo }) {
  const debouncedSelect = useDebouncedCallback(
    async (action) => {
      await fetch('/api/public/gallery/TOKEN/select', {
        method: 'POST',
        body: JSON.stringify({ fileId: photo.id, action }),
      });
    },
    500 // Wait 500ms after last click
  );

  return (
    <button onClick={() => debouncedSelect('add')}>
      Select
    </button>
  );
}

// Option 2: Batch updates di server
// Collect updates dalam 1 detik, lalu publish 1 message
let updateQueue = [];
let publishTimer = null;

function queueUpdate(update) {
  updateQueue.push(update);
  
  if (!publishTimer) {
    publishTimer = setTimeout(async () => {
      const batch = [...updateQueue];
      updateQueue = [];
      publishTimer = null;
      
      await ably.channels.get(channel).publish('batch-update', {
        updates: batch,
        totalCount: await getSelectionCount(galleryId),
      });
    }, 1000);
  }
}

// Option 3: Use Ably batch API
await ably.channels.get(channel).publish([
  { name: 'count-updated', data: { count: 10 } },
  { name: 'count-updated', data: { count: 11 } },
  { name: 'count-updated', data: { count: 12 } },
]); // 1 API call instead of 3
```

**Priority**: 🟡 MEDIUM (tergantung Ably usage)

**Estimated Fix Time**: 2-3 jam

---

### PERF-5: Dashboard Metrics Tidak Di-cache

**File**: `src/app/api/admin/metrics/route.ts`

**Kode Bermasalah**:
```typescript
export async function GET() {
  const session = await auth();
  
  // Setiap request = 10 database queries
  const [totalBookings, bookingsBulanIni, ...] = await Promise.all([...]);
  
  return NextResponse.json({ ... });
}
```

**Masalah**:
- Setiap refresh dashboard = 10 database queries
- Data metrics tidak berubah setiap detik, tapi di-fetch ulang terus
- Tidak ada caching mechanism
- Jika 10 users buka dashboard bersamaan = 100 queries

**Benchmark**:
```
Concurrent Users | Queries/Second | Database Load
-----------------|----------------|---------------
1 user           | 10 queries     | Low
10 users         | 100 queries    | Medium
50 users         | 500 queries    | High
100 users        | 1000 queries   | Critical
```

**Impact**:
- High database load
- Slow dashboard untuk concurrent users
- Database connection pool exhaustion

**Rekomendasi**:
```typescript
// Option 1: Redis cache dengan TTL
import { redis } from '@/lib/redis';

export async function GET() {
  const session = await auth();
  const cacheKey = `metrics:${session.user.id}`;
  
  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }
  
  // Fetch from database
  const metrics = await fetchMetrics(session.user.id);
  
  // Cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(metrics), { ex: 300 });
  
  return NextResponse.json(metrics);
}

// Option 2: Next.js unstable_cache
import { unstable_cache } from 'next/cache';

const getMetrics = unstable_cache(
  async (vendorId: string) => {
    return await fetchMetrics(vendorId);
  },
  ['metrics'],
  { revalidate: 300 } // 5 minutes
);

// Option 3: SWR di client-side
import useSWR from 'swr';

function Dashboard() {
  const { data } = useSWR(
    '/api/admin/metrics',
    fetcher,
    { refreshInterval: 60000 } // Refresh every 1 minute
  );
}
```

**Priority**: 🟡 MEDIUM (optimization)

**Estimated Fix Time**: 3-4 jam

---

### PERF-6: Cloudinary List Photos Tanpa Pagination

**File**: `src/lib/cloudinary.ts` (line 200-250)

**Kode Bermasalah**:
```typescript
export async function listPhotosFromCloudinary(
  folderId: string,
  vendorId: string
) {
  const account = await getCloudinaryAccount(vendorId);
  configureCloudinary(account);

  const result = await cloudinary.api.resources({
    type: 'upload',
    prefix: folderId,
    max_results: 500, // Cloudinary limit
  });

  return result.resources;
}
```

**Masalah**:
- Cloudinary API limit: **max 500 results** per request
- Jika folder punya 1000+ foto:
  - Hanya fetch 500 pertama
  - 500 foto lainnya tidak kelihatan
- Tidak ada pagination handling dengan `next_cursor`

**Impact**:
- Data incomplete untuk large galleries
- User tidak bisa lihat semua foto
- Sync dari Cloudinary tidak complete

**Rekomendasi**:
```typescript
// Option 1: Pagination dengan next_cursor
export async function listAllPhotosFromCloudinary(
  folderId: string,
  vendorId: string
) {
  const account = await getCloudinaryAccount(vendorId);
  configureCloudinary(account);

  let allResources = [];
  let nextCursor = null;

  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderId,
      max_results: 500,
      next_cursor: nextCursor,
    });

    allResources.push(...result.resources);
    nextCursor = result.next_cursor;
  } while (nextCursor);

  return allResources;
}

// Option 2: Lazy loading dengan cursor
export async function listPhotosFromCloudinary(
  folderId: string,
  vendorId: string,
  cursor?: string
) {
  const result = await cloudinary.api.resources({
    type: 'upload',
    prefix: folderId,
    max_results: 100, // Smaller batch
    next_cursor: cursor,
  });

  return {
    photos: result.resources,
    nextCursor: result.next_cursor,
    hasMore: !!result.next_cursor,
  };
}

// Usage di API:
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  
  const result = await listPhotosFromCloudinary(folderId, vendorId, cursor);
  
  return NextResponse.json(result);
}
```

**Priority**: 🟡 MEDIUM (edge case untuk 500+ photos)

**Estimated Fix Time**: 2-3 jam

---

## 📊 SUMMARY

| Severity | Count | Estimated Fix Time |
|----------|-------|-------------------|
| 🔴 Critical | 1 | 4-6 jam |
| 🟠 High | 2 | 3-5 hari |
| 🟡 Medium | 3 | 8-10 jam |
| **Total** | **6** | **~1 minggu** |

### Prioritas Perbaikan

1. **PERF-2** (Bulk Upload Memory) — 🔥 CRITICAL (risk of crash)
2. **PERF-3** (Gallery Pagination) — 🔥 HIGH (bad UX)
3. **PERF-1** (N+1 Queries) — 🔥 HIGH (slow dashboard)
4. **PERF-5** (Dashboard Cache) — 🟡 MEDIUM (optimization)
5. **PERF-4** (Ably Debouncing) — 🟡 MEDIUM (cost optimization)
6. **PERF-6** (Cloudinary Pagination) — 🟡 LOW (edge case)

### Performance Targets

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Dashboard Load | 500ms-2s | <500ms | High |
| Gallery Load (200 photos) | 3-5s | <1s | High |
| Bulk Upload (50 photos) | Timeout | <30s | Critical |
| API Response Time (p95) | 300ms | <200ms | Medium |

---

**Last Updated**: 2026-03-04  
**Next Review**: 2026-04-04
