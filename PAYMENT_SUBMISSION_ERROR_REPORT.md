# Payment Submission Error Report

## Summary
When submitting a payment via the Payment Modal, the form submission **fails silently** due to Zod validation error on the `buktiBayar` (payment proof) field.

---

## Files Analyzed

### 1. Payment Form Component
**File:** `src/app/admin/events/_components/payment-modal.tsx`

#### handleSubmit Function (Lines 49-76)
```tsx
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!form.jumlah || Number(form.jumlah) <= 0) {
    toast.error("Jumlah harus lebih dari 0");
    return;
  }
  setIsSaving(true);
  try {
    const res = await fetch(`/api/admin/bookings/${bookingId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, jumlah: Number(form.jumlah) }),  // ← Line 60
    });
    if (!res.ok) {
      const err = await res.json() as { error?: string };
      toast.error(err.error ?? "Gagal menyimpan pembayaran");
      return;
    }
    // ... success handling
  }
}
```

#### Form Initialization (Line 37)
```tsx
const [form, setForm] = useState({
  jumlah: "",
  tipe: "DP" as "DP" | "PELUNASAN" | "LAINNYA",
  keterangan: "",
  buktiBayar: ""  // ← Initialized as empty string
});
```

#### buktiBayar Input Field (Lines 229-238)
```tsx
<div>
  <label className="block text-xs font-medium text-slate-600 mb-1">
    Link Bukti Transfer (opsional)
  </label>
  <input
    type="url"
    value={form.buktiBayar}
    onChange={(e) => setForm((f) => ({ ...f, buktiBayar: e.target.value }))}
    placeholder="https://..."
    className="..."
  />
</div>
```

**Issue:** When user doesn't fill this field, `form.buktiBayar` remains an **empty string `""`**

---

### 2. Payment API Route
**File:** `src/app/api/admin/bookings/[id]/payments/route.ts`

#### Payment Schema (Lines 6-11)
```typescript
const paymentSchema = z.object({
  jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  tipe: z.enum(["DP", "PELUNASAN", "LAINNYA"]).default("DP"),
  keterangan: z.string().optional(),
  buktiBayar: z.string().url().optional().nullable(),  // ← LINE 10: THE BUG
});
```

#### POST Handler (Lines 72-125)
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ... auth checks ...
  const body = await request.json();
  const parsed = paymentSchema.safeParse(body);  // ← Validation happens here
  if (!parsed.success) return validationErrorResponse(parsed.error.format());
  
  const { jumlah, tipe, keterangan, buktiBayar } = parsed.data;
  
  const payment = await prisma.payment.create({
    data: {
      bookingId,
      vendorId: session.user.id,
      jumlah,
      tipe,
      keterangan,
      buktiBayar,
    },
  });
  // ... rest of handler
}
```

---

## Root Cause

### The Problem
The Zod schema on **line 10** of `route.ts`:
```typescript
buktiBayar: z.string().url().optional().nullable()
```

This validator chain means:
- **`.string()`** - must be a string
- **`.url()`** - must be a valid URL
- **`.optional()`** - can be `undefined`
- **`.nullable()`** - can be `null`

### What Gets Sent
The form sends:
```json
{
  "jumlah": 1000000,
  "tipe": "DP",
  "keterangan": "",
  "buktiBayar": ""  // ← EMPTY STRING
}
```

### Validation Failure
When `buktiBayar: ""` is validated:
- ✗ It's not `undefined` (so `.optional()` doesn't match)
- ✗ It's not `null` (so `.nullable()` doesn't match)
- ✗ An empty string `""` is not a valid URL (so `.url()` fails)

**Result:** Validation fails → HTTP 400 error → Toast shows generic "Gagal menyimpan pembayaran"

---

## Database Schema Context

**Payment Model** (`prisma/schema.prisma`, lines 152-168):
```prisma
model Payment {
  id         String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bookingId  String      @map("booking_id") @db.Uuid
  vendorId   String      @map("vendor_id") @db.Uuid
  jumlah     Decimal     @db.Decimal(15, 0)
  tipe       PaymentType @default(DP)
  keterangan String?
  buktiBayar String?     @map("bukti_bayar")  // ← Optional in DB
  createdAt  DateTime    @default(now()) @map("created_at")
  // ... relations
}
```

The database field is **optional** (`String?`), so the API should accept empty/null values.

---

## Solutions

### Option 1: Strip empty strings in schema (Recommended)
```typescript
const paymentSchema = z.object({
  jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  tipe: z.enum(["DP", "PELUNASAN", "LAINNYA"]).default("DP"),
  keterangan: z.string().optional(),
  buktiBayar: z.string().trim().url().optional().or(z.literal("")).nullable(),
});
```

**Best approach:** Chains `.trim()` to remove whitespace, then uses `.or(z.literal(""))` to accept empty strings.

### Option 2: Transform empty to null
```typescript
buktiBayar: z
  .string()
  .url()
  .optional()
  .nullable()
  .transform((val) => val === "" ? null : val),
```

### Option 3: Handle in component (Less ideal)
Send `null` instead of empty string from frontend:
```tsx
body: JSON.stringify({
  ...form,
  jumlah: Number(form.jumlah),
  buktiBayar: form.buktiBayar === "" ? null : form.buktiBayar,
})
```

---

## Impact

- **Severity:** High
- **Scope:** All payment submissions without a proof URL
- **User Impact:** Payment recording fails silently with generic error message
- **Error Rate:** 100% when optional URL field is left empty

---

## Testing Steps to Reproduce

1. Open Payment Modal for any booking
2. Fill in:
   - **Jumlah:** 500000
   - **Tipe:** DP
   - **Keterangan:** "Transfer BCA"
   - **Link Bukti Transfer:** (leave empty)
3. Click "Catat Pembayaran"
4. **Expected:** Payment saved successfully
5. **Actual:** Toast error "Gagal menyimpan pembayaran" (validation error hidden in console)

---

## Recommended Fix

**File:** `src/app/api/admin/bookings/[id]/payments/route.ts`

**Change line 10 from:**
```typescript
buktiBayar: z.string().url().optional().nullable(),
```

**To:**
```typescript
buktiBayar: z.string().trim().url().optional().or(z.literal("")).nullable(),
```

This allows:
- ✓ `undefined` (not provided)
- ✓ `null` (explicitly null)
- ✓ `""` (empty string)
- ✓ Valid URLs like `"https://example.com/proof"`
