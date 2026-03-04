# 🐛 CRITICAL BUGS — Hafiportrait Platform

> **Tanggal Audit**: 2026-03-04  
> **Status**: 2 isu critical ditemukan

---

## 🔴 CRITICAL

### BUG-1: Race Condition di Selection Count

**File**: `src/app/api/public/gallery/[token]/select/route.ts` (line 60-110)

**Kode Bermasalah**:
```typescript
export async function POST(request: Request, { params }) {
  const { token } = await params;
  const gallery = await prisma.gallery.findUnique({
    where: { clientToken: token },
    include: { booking: { select: { maxSelection: true } } },
  });

  const maxSelection = gallery.booking?.maxSelection ?? 40;
  
  // ❌ Check count (non-atomic)
  const currentCount = await getSelectionCount(gallery.id);
  
  if (action === "add") {
    // ❌ Race condition window here!
    if (currentCount >= maxSelection) {
      return NextResponse.json(
        { code: "QUOTA_EXCEEDED", message: `Maximum ${maxSelection} photos` },
        { status: 422 }
      );
    }

    // ❌ Insert selection (separate transaction)
    await prisma.photoSelection.create({
      data: {
        galleryId: gallery.id,
        fileId,
        filename,
        selectionType: "EDIT",
      },
    });
  }
}
```

**Masalah**:
1. **Non-Atomic Operation**:
   - Check count dan insert selection adalah 2 operasi terpisah
   - Tidak ada database-level constraint untuk enforce max selection
   - Race condition window antara check dan insert

2. **Reproduksi**:
```
Timeline dengan maxSelection = 40:

T0: User A check count → 39 (OK, bisa insert)
T1: User B check count → 39 (OK, bisa insert)
T2: User A insert selection → count jadi 40
T3: User B insert selection → count jadi 41 ❌ (exceed quota!)
```

3. **Attack Scenario**:
```javascript
// 2 users spam select bersamaan
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(
    fetch('/api/public/gallery/TOKEN/select', {
      method: 'POST',
      body: JSON.stringify({
        fileId: `photo${i}`,
        action: 'add',
      }),
    })
  );
}
await Promise.all(promises);
// Bisa exceed maxSelection
```

**Impact**:
- User bisa select lebih dari maxSelection
- Business logic broken (paket 40 foto, tapi user select 50)
- Billing issue (vendor rugi)
- Data inconsistency

**Rekomendasi**:

**Option 1: Database Transaction dengan Pessimistic Locking**
```typescript
export async function POST(request: Request, { params }) {
  const { token } = await params;
  const body = await request.json();
  const { fileId, filename, action } = body;

  const result = await prisma.$transaction(async (tx) => {
    // Lock gallery row untuk prevent concurrent updates
    const gallery = await tx.gallery.findUnique({
      where: { clientToken: token },
      include: { 
        booking: { select: { maxSelection: true } },
        _count: { select: { selections: { where: { isLocked: false } } } },
      },
    });

    if (!gallery) {
      throw new Error('Gallery not found');
    }

    const maxSelection = gallery.booking?.maxSelection ?? 40;
    const currentCount = gallery._count.selections;

    if (action === 'add') {
      if (currentCount >= maxSelection) {
        throw new Error('QUOTA_EXCEEDED');
      }

      // Insert dalam transaction yang sama
      await tx.photoSelection.create({
        data: {
          galleryId: gallery.id,
          fileId,
          filename,
          selectionType: 'EDIT',
        },
      });

      return { count: currentCount + 1 };
    }
  });

  return NextResponse.json({ success: true, ...result });
}
```

**Option 2: Database Constraint (Recommended)**
```sql
-- Add constraint di Prisma migration
-- File: prisma/migrations/xxx_add_selection_constraint.sql

-- Create function untuk check max selection
CREATE OR REPLACE FUNCTION check_max_selection()
RETURNS TRIGGER AS $$
DECLARE
  max_sel INTEGER;
  current_count INTEGER;
BEGIN
  -- Get max selection dari booking
  SELECT b.max_selection INTO max_sel
  FROM galleries g
  JOIN bookings b ON g.booking_id = b.id
  WHERE g.id = NEW.gallery_id;

  -- Count current selections (exclude locked)
  SELECT COUNT(*) INTO current_count
  FROM photo_selections
  WHERE gallery_id = NEW.gallery_id
    AND is_locked = false;

  -- Check constraint
  IF current_count >= max_sel THEN
    RAISE EXCEPTION 'Maximum selection quota exceeded';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER enforce_max_selection
  BEFORE INSERT ON photo_selections
  FOR EACH ROW
  EXECUTE FUNCTION check_max_selection();
```

**Option 3: Unique Constraint + Error Handling**
```typescript
// Prisma schema
model PhotoSelection {
  @@unique([galleryId, fileId])
  @@index([galleryId, isLocked])
}

// API handler
try {
  await prisma.photoSelection.create({
    data: { galleryId, fileId, filename, selectionType: 'EDIT' },
  });
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    return NextResponse.json(
      { code: 'ALREADY_SELECTED', message: 'Photo already selected' },
      { status: 409 }
    );
  }
  throw error;
}
```

**Priority**: 🔥 CRITICAL

**Estimated Fix Time**: 2-3 jam

**Testing**:
```typescript
// Test concurrent requests
describe('Selection Race Condition', () => {
  it('should not exceed maxSelection with concurrent requests', async () => {
    const maxSelection = 40;
    const gallery = await createGallery({ maxSelection });
    
    // Create 50 concurrent requests
    const promises = Array.from({ length: 50 }, (_, i) =>
      selectPhoto(gallery.token, `photo${i}`)
    );
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    expect(successful).toBe(maxSelection); // Should be exactly 40
    
    const count = await getSelectionCount(gallery.id);
    expect(count).toBe(maxSelection); // Verify database state
  });
});
```

---

## 🔴 CRITICAL

### BUG-2: Cloudinary Multi-Account Race Condition

**File**: `src/lib/cloudinary.ts` (line 6-11, 75-80)

**Kode Bermasalah**:
```typescript
import { v2 as cloudinary } from 'cloudinary';

// ❌ Global configuration (shared state)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ❌ Mutate global state per request
export function configureCloudinary(account: CloudinaryAccountConfig) {
  cloudinary.config({
    cloud_name: account.cloudName,
    api_key: account.apiKey,
    api_secret: account.apiSecret,
  });
}

// Usage di upload handler
export async function uploadPhotoToCloudinary(file: Buffer, vendorId: string) {
  const account = await getCloudinaryAccount(vendorId);
  configureCloudinary(account); // ❌ Mutate global
  
  return cloudinary.uploader.upload(file); // ❌ Use global instance
}
```

**Masalah**:
1. **Global State Mutation**:
   - `cloudinary.config()` mengubah global singleton
   - Semua request share instance yang sama
   - Race condition di serverless environment

2. **Reproduksi**:
```
Timeline:

T0: Vendor A (accountA) call configureCloudinary(accountA)
    → cloudinary.config = { cloud_name: 'vendorA', api_key: 'keyA' }

T1: Vendor B (accountB) call configureCloudinary(accountB)
    → cloudinary.config = { cloud_name: 'vendorB', api_key: 'keyB' }

T2: Vendor A upload foto
    → cloudinary.uploader.upload() 
    → ❌ Pakai accountB credentials! (wrong account)

T3: Vendor B upload foto
    → cloudinary.uploader.upload()
    → ✅ Pakai accountB credentials (correct, by luck)
```

3. **Attack Scenario**:
```javascript
// Attacker bisa trigger race condition:
// 1. Vendor A mulai upload (slow connection)
// 2. Attacker trigger upload dengan account lain
// 3. Vendor A's upload pakai credentials attacker
```

**Impact**:
- **Upload ke account yang salah** → data leak antar vendor
- **Billing ke vendor yang salah** → financial loss
- **Storage quota salah** → vendor A pakai quota vendor B
- **Security breach** → foto vendor A masuk ke account vendor B

**Rekomendasi**:

**Option 1: Per-Request Cloudinary Instance (Recommended)**
```typescript
import { v2 as cloudinary, ConfigOptions } from 'cloudinary';

// ❌ Remove global config
// cloudinary.config({ ... });

// ✅ Create instance per request
export function getCloudinaryInstance(account: CloudinaryAccountConfig) {
  const config: ConfigOptions = {
    cloud_name: account.cloudName,
    api_key: account.apiKey,
    api_secret: account.apiSecret,
  };
  
  // Create new instance (not mutate global)
  const instance = Object.create(cloudinary);
  instance.config(config);
  
  return instance;
}

// Usage:
export async function uploadPhotoToCloudinary(
  file: Buffer,
  vendorId: string,
  accountId?: string
) {
  const account = await getCloudinaryAccount(vendorId, accountId);
  const cloudinaryClient = getCloudinaryInstance(account);
  
  return cloudinaryClient.uploader.upload(file, {
    folder: 'hafispace/galleries',
  });
}
```

**Option 2: Pass Config Explicitly**
```typescript
// Cloudinary SDK v2 supports passing config per request
export async function uploadPhotoToCloudinary(
  file: Buffer,
  account: CloudinaryAccountConfig
) {
  return cloudinary.uploader.upload(file, {
    cloud_name: account.cloudName,
    api_key: account.apiKey,
    api_secret: account.apiSecret,
    folder: 'hafispace/galleries',
  });
}
```

**Option 3: Request-Scoped Configuration**
```typescript
import { AsyncLocalStorage } from 'async_hooks';

const cloudinaryContext = new AsyncLocalStorage<CloudinaryAccountConfig>();

export function withCloudinaryAccount<T>(
  account: CloudinaryAccountConfig,
  fn: () => Promise<T>
): Promise<T> {
  return cloudinaryContext.run(account, fn);
}

export function getCloudinaryConfig(): CloudinaryAccountConfig {
  const config = cloudinaryContext.getStore();
  if (!config) {
    throw new Error('Cloudinary config not set');
  }
  return config;
}

// Usage:
await withCloudinaryAccount(account, async () => {
  const config = getCloudinaryConfig();
  cloudinary.config(config);
  return cloudinary.uploader.upload(file);
});
```

**Priority**: 🔥 CRITICAL (multi-vendor platform)

**Estimated Fix Time**: 4-6 jam

**Testing**:
```typescript
describe('Cloudinary Multi-Account', () => {
  it('should not mix credentials between concurrent uploads', async () => {
    const vendorA = await createVendor({ cloudinaryAccount: accountA });
    const vendorB = await createVendor({ cloudinaryAccount: accountB });
    
    // Upload concurrently
    const [resultA, resultB] = await Promise.all([
      uploadPhoto(fileA, vendorA.id),
      uploadPhoto(fileB, vendorB.id),
    ]);
    
    // Verify uploaded to correct accounts
    expect(resultA.url).toContain(accountA.cloudName);
    expect(resultB.url).toContain(accountB.cloudName);
    
    // Verify in Cloudinary
    const photosA = await listPhotosFromCloudinary(accountA);
    const photosB = await listPhotosFromCloudinary(accountB);
    
    expect(photosA).toContainEqual(expect.objectContaining({ public_id: resultA.public_id }));
    expect(photosB).toContainEqual(expect.objectContaining({ public_id: resultB.public_id }));
  });
});
```

---

## 📊 SUMMARY

| Bug ID | Severity | Impact | Fix Time | Priority |
|--------|----------|--------|----------|----------|
| BUG-1 | 🔴 Critical | Data corruption, business logic broken | 2-3 jam | 🔥 Immediate |
| BUG-2 | 🔴 Critical | Data leak, billing error, security breach | 4-6 jam | 🔥 Immediate |

**Total Estimated Fix Time**: 6-9 jam (1 hari kerja)

---

**Last Updated**: 2026-03-04  
**Next Review**: 2026-03-11
