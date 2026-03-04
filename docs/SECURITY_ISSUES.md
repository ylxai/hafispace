# 🔒 SECURITY ISSUES — Hafiportrait Platform

> **Tanggal Audit**: 2026-03-04  
> **Status**: 6 isu ditemukan (1 Critical, 3 High, 2 Medium)

---

## 🔴 CRITICAL

### SEC-1: CORS Configuration Vulnerability

**File**: `next.config.ts` (line 5)

**Kode Bermasalah**:
```typescript
const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async headers() {
  return [
    {
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: allowedOrigin },
        { key: "Access-Control-Allow-Credentials", value: "true" },
      ],
    },
  ];
}
```

**Masalah**:
- CORS hanya mengizinkan 1 origin, tidak mendukung multiple origins
- Jika ada kebutuhan multi-domain (staging, production, mobile app), konfigurasi ini tidak fleksibel
- Tidak ada validasi origin di runtime
- Kombinasi `Access-Control-Allow-Credentials: true` dengan single origin bisa jadi security risk

**Impact**: 
- Tidak bisa support multiple frontend domains
- Jika `NEXT_PUBLIC_APP_URL` salah dikonfigurasi, semua CORS request gagal

**Rekomendasi**:
```typescript
// Option 1: Whitelist multiple origins
const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_STAGING_URL,
  'http://localhost:3000',
].filter(Boolean);

// Option 2: Dynamic CORS di middleware
export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isAllowed = allowedOrigins.includes(origin ?? '');
  
  if (isAllowed) {
    return NextResponse.next({
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }
}
```

**Priority**: 🔥 HIGH (jika ada rencana multi-domain)

---

## 🟠 HIGH

### SEC-2: Rate Limiting Tidak Ada di Public Endpoints

**File**: `src/app/api/public/gallery/[token]/select/route.ts`

**Kode Bermasalah**:
```typescript
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const gallery = await prisma.gallery.findUnique({
    where: { clientToken: token },
  });
  // ... langsung process tanpa rate limiting
}
```

**Masalah**:
- Endpoint publik tanpa rate limiting
- User bisa spam select/unselect foto unlimited
- Bisa menyebabkan:
  - Database overload (write operations)
  - Ably quota exceeded (real-time updates)
  - Server resource exhaustion

**Attack Scenario**:
```bash
# Attacker bisa spam request:
for i in {1..1000}; do
  curl -X POST https://yoursite.com/api/public/gallery/TOKEN/select \
    -H "Content-Type: application/json" \
    -d '{"fileId":"photo1","filename":"test.jpg","action":"add"}'
done
```

**Impact**:
- Database write operations bisa mencapai 100+ per detik
- Ably free tier limit: 6 messages/second → akan exceeded
- Server bisa crash atau lambat untuk user lain

**Rekomendasi**:
```typescript
// Install: npm install @upstash/ratelimit @upstash/redis

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"), // 10 requests per 10 seconds
  analytics: true,
});

export async function POST(request: Request, { params }) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests", reset },
      { status: 429 }
    );
  }

  // ... process request
}
```

**Priority**: 🔥 CRITICAL (sudah ada di roadmap H5)

---

### SEC-3: View Count Manipulation

**File**: `src/app/api/public/gallery/[token]/route.ts` (line 65-75)

**Kode Bermasalah**:
```typescript
const viewedCookie = request.headers
  .get("cookie")
  ?.includes(`viewed_${gallery.id}`);

if (!viewedCookie) {
  await prisma.gallery.update({
    where: { id: gallery.id },
    data: { viewCount: { increment: 1 } },
  });

  response.headers.set(
    "Set-Cookie",
    `viewed_${gallery.id}=1; Path=/; Max-Age=86400; HttpOnly; SameSite=Strict`
  );
}
```

**Masalah**:
- Cookie-based deduplication mudah di-bypass:
  - Clear cookies → view count increment lagi
  - Incognito mode → setiap session baru = view baru
  - Multiple browsers → multiple views
- Tidak ada IP tracking atau fingerprinting
- View count bisa dimanipulasi dengan script

**Attack Scenario**:
```javascript
// Attacker bisa inflate view count:
for (let i = 0; i < 1000; i++) {
  await fetch('/api/public/gallery/TOKEN', {
    credentials: 'omit' // Tidak kirim cookies
  });
}
```

**Impact**:
- View count tidak akurat
- Bisa digunakan untuk manipulasi metrics
- Jika ada fitur "trending galleries", bisa di-game

**Rekomendasi**:
```typescript
// Option 1: IP-based tracking dengan Redis
const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
const viewKey = `view:${gallery.id}:${ip}`;
const hasViewed = await redis.get(viewKey);

if (!hasViewed) {
  await redis.set(viewKey, "1", { ex: 86400 }); // 24 hours
  await prisma.gallery.update({
    where: { id: gallery.id },
    data: { viewCount: { increment: 1 } },
  });
}

// Option 2: Fingerprinting (lebih robust)
// Install: npm install @fingerprintjs/fingerprintjs
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const fp = await FingerprintJS.load();
const result = await fp.get();
const visitorId = result.visitorId;
```

**Priority**: 🟡 MEDIUM (tergantung importance view count)

---

### SEC-4: Cloudinary Credentials Exposure Risk

**File**: `src/lib/cloudinary.ts` (line 6-11, 75-80)

**Kode Bermasalah**:
```typescript
// Global configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Dynamic configuration (race condition risk)
export function configureCloudinary(account: CloudinaryAccountConfig) {
  cloudinary.config({
    cloud_name: account.cloudName,
    api_key: account.apiKey,
    api_secret: account.apiSecret,
  });
}
```

**Masalah**:
1. **Global State Mutation**: 
   - `cloudinary.config()` mengubah global state
   - Jika 2 vendor upload bersamaan dengan account berbeda, bisa pakai credentials yang salah
   - Race condition di serverless environment (multiple instances)

2. **Credentials Exposure**:
   - Jika ada error logging yang tidak di-sanitize, credentials bisa bocor
   - Stack trace bisa expose `apiSecret`

**Attack Scenario**:
```
Timeline:
T0: Vendor A call configureCloudinary(accountA)
T1: Vendor B call configureCloudinary(accountB) 
T2: Vendor A upload foto → pakai accountB credentials!
```

**Impact**:
- Upload foto ke account Cloudinary yang salah
- Billing ke vendor yang salah
- Potensi data leak antar vendor

**Rekomendasi**:
```typescript
// Option 1: Per-request Cloudinary instance
import { v2 as cloudinary } from 'cloudinary';

export function getCloudinaryInstance(account: CloudinaryAccountConfig) {
  const instance = cloudinary;
  instance.config({
    cloud_name: account.cloudName,
    api_key: account.apiKey,
    api_secret: account.apiSecret,
  });
  return instance;
}

// Usage:
const cloudinaryClient = getCloudinaryInstance(account);
await cloudinaryClient.uploader.upload(file);

// Option 2: Use Cloudinary SDK v2 with explicit config
import { v2 as cloudinary } from 'cloudinary';

export async function uploadToCloudinary(file: Buffer, account: CloudinaryAccountConfig) {
  return cloudinary.uploader.upload(file, {
    cloud_name: account.cloudName,
    api_key: account.apiKey,
    api_secret: account.apiSecret,
  });
}
```

**Priority**: 🔥 HIGH (multi-vendor platform)

---

## 🟡 MEDIUM

### SEC-5: Error Messages Terlalu Detail

**File**: Multiple files (26 occurrences)

**Kode Bermasalah**:
```typescript
// src/app/api/admin/galleries/[id]/upload/route.ts (line 219)
try {
  // ... upload logic
} catch (error) {
  console.error("Error uploading photos:", error);
  return NextResponse.json(
    { error: "Failed to upload photos" },
    { status: 500 }
  );
}
```

**Masalah**:
- `console.error` dengan full error object bisa expose:
  - Stack traces dengan file paths
  - Database connection strings
  - API keys jika ada di error message
  - Internal implementation details
- Di production, console logs bisa di-capture oleh logging service
- Attacker bisa gunakan info ini untuk reconnaissance

**Impact**:
- Information disclosure
- Memudahkan attacker untuk find vulnerabilities
- Compliance issue (GDPR, PCI-DSS)

**Rekomendasi**:
```typescript
// Install: npm install pino

import pino from 'pino';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: ['password', 'apiKey', 'apiSecret', 'token'],
    remove: true,
  },
});

// Usage:
try {
  // ... upload logic
} catch (error) {
  logger.error({ err: error, galleryId }, 'Failed to upload photos');
  
  return NextResponse.json(
    { 
      error: "Failed to upload photos",
      // Only include error code, not details
      code: error instanceof Error ? error.name : 'UNKNOWN_ERROR'
    },
    { status: 500 }
  );
}
```

**Priority**: 🟡 MEDIUM (best practice)

---

### SEC-6: Token Generation Menggunakan crypto.randomUUID()

**File**: `src/app/api/admin/galleries/route.ts` (line 65)

**Kode Bermasalah**:
```typescript
const clientToken = crypto.randomUUID();

const gallery = await prisma.gallery.create({
  data: {
    vendorId: session.user.id,
    clientToken,
    // ... no expiry mechanism
  },
});
```

**Masalah**:
1. **UUID v4 Predictability**:
   - UUID v4 menggunakan random, tapi ada timing attack risk
   - Jika attacker bisa predict timing, bisa brute force token
   - 122 bits entropy (good, tapi bisa lebih baik)

2. **No Expiry Mechanism**:
   - Token tidak pernah expire
   - Jika token bocor, bisa diakses selamanya
   - Tidak ada revocation mechanism

**Attack Scenario**:
```javascript
// Brute force attack (sangat sulit, tapi possible):
const chars = '0123456789abcdef-';
for (let i = 0; i < 1000000; i++) {
  const token = generateRandomUUID(); // Try random UUIDs
  const response = await fetch(`/api/public/gallery/${token}`);
  if (response.ok) {
    console.log('Found valid token:', token);
  }
}
```

**Impact**:
- Token bisa di-brute force (sangat sulit, tapi possible)
- Jika token bocor, tidak ada cara untuk revoke
- Gallery bisa diakses selamanya

**Rekomendasi**:
```typescript
// Option 1: Stronger token generation
import crypto from 'crypto';

const clientToken = crypto.randomBytes(32).toString('hex'); // 256 bits entropy

// Option 2: Add expiry mechanism
const gallery = await prisma.gallery.create({
  data: {
    vendorId: session.user.id,
    clientToken,
    tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
});

// Check expiry di public endpoint:
if (gallery.tokenExpiry && gallery.tokenExpiry < new Date()) {
  return NextResponse.json(
    { error: "Gallery link has expired" },
    { status: 410 }
  );
}

// Option 3: Add revocation mechanism
await prisma.gallery.update({
  where: { id: galleryId },
  data: { 
    clientToken: crypto.randomBytes(32).toString('hex'), // Regenerate token
    tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
});
```

**Priority**: 🟡 LOW (UUID v4 sudah cukup secure untuk most cases)

---

## 📊 SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 1 | Open |
| 🟠 High | 3 | Open |
| 🟡 Medium | 2 | Open |
| **Total** | **6** | **Open** |

### Prioritas Perbaikan

1. **SEC-2** (Rate Limiting) — 🔥 CRITICAL
2. **SEC-4** (Cloudinary Race Condition) — 🔥 HIGH
3. **SEC-3** (View Count Manipulation) — 🟡 MEDIUM
4. **SEC-1** (CORS Configuration) — 🟡 MEDIUM (jika multi-domain)
5. **SEC-5** (Error Messages) — 🟡 LOW (best practice)
6. **SEC-6** (Token Generation) — 🟡 LOW (nice to have)

---

**Last Updated**: 2026-03-04  
**Next Review**: 2026-04-04
