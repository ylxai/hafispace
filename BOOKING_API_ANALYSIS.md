# 📋 Analisis Lengkap API Routes untuk Booking

## 📌 Ringkasan Eksekutif

Platform Hafiportrait memiliki **8 endpoint booking utama** tersebar di:
- **Public API** (`/api/public/booking`) — untuk klien membuat booking baru
- **Admin API** (`/api/admin/events`, `/api/admin/bookings/[id]`, dll) — untuk fotografer mengelola booking
- **Payment API** (`/api/admin/bookings/[id]/payments`) — untuk mencatat pembayaran
- **Utility Endpoints** (export, reminder, upload) — untuk operasi tambahan

---

## 🔗 Daftar Semua Booking Endpoints

### 1️⃣ PUBLIC API — Create Booking (Client-Facing)

#### **GET `/api/public/booking`**
**Purpose:** Ambil informasi vendor + paket aktif untuk public booking form

**Input Parameters (Query String):**
```
?vendorId=<uuid>
```

**Response Format (200 OK):**
```json
{
  "vendor": {
    "id": "uuid",
    "namaStudio": "string",
    "logoUrl": "string",
    "waAdmin": "string",
    "dpPercentage": number,
    "rekeningPembayaran": "string",
    "syaratKetentuan": "string",
    "themeColor": "string",
    "successMessage": "string",
    "bookingFormActive": boolean,
    "packages": [
      {
        "id": "uuid",
        "namaPaket": "string",
        "kategori": "string",
        "harga": number,
        "deskripsi": "string",
        "kuotaEdit": number,
        "includeCetak": array
      }
    ],
    "customFields": [
      {
        "id": "uuid",
        "label": "string",
        "tipe": "string",
        "isRequired": boolean,
        "urutan": number
      }
    ]
  }
}
```

**Error Responses:**
- `400` — Vendor ID required
- `404` — Vendor not found
- `403` — Booking form is not active

**Rate Limiting:** ❌ No explicit rate limit

---

#### **POST `/api/public/booking`**
**Purpose:** Submit booking baru dari klien public

**Input Body:**
```json
{
  "vendorId": "uuid (required)",
  "namaClient": "string (required, min 1)",
  "hpClient": "string (required, min 8)",
  "emailClient": "string (optional, valid email)",
  "tanggalSesi": "string (required, ISO date)",
  "lokasiSesi": "string (optional)",
  "paketId": "uuid (required, valid paket)",
  "catatan": "string (optional)",
  "customFields": "object (optional)"
}
```

**Response Format (201 Created):**
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "kodeBooking": "BK24MM-XXXX (format: BKYYmm-random)",
    "namaClient": "string",
    "tanggalSesi": "ISO datetime",
    "status": "PENDING",
    "hargaPaket": number,
    "dpAmount": number,
    "dpPercentage": number
  }
}
```

**Error Responses:**
- `400` — Validasi gagal (invalid input)
- `404` — Vendor not found / Paket tidak ditemukan
- `403` — Booking form is not active
- `429` — Rate limited (max 5 bookings per hour per IP)

**Rate Limiting:** ✅ **5 bookings per hour per IP** (cegah spam)

**Special Features:**
- Auto-generate unique booking code (BK24mm-XXXX)
- Auto-create atau link client berdasarkan phone number
- Auto-send email konfirmasi jika emailClient ada
- Hitung DP amount berdasarkan vendor's dpPercentage

---

### 2️⃣ ADMIN API — List & CRUD Bookings

#### **GET `/api/admin/events`**
**Purpose:** List semua booking vendor dengan pagination

**Input Parameters (Query String):**
```
?page=1&limit=20
```

**Response Format (200 OK):**
```json
{
  "items": [
    {
      "id": "uuid",
      "kodeBooking": "string",
      "namaClient": "string",
      "hpClient": "string",
      "emailClient": "string",
      "paket": "string (dari paketCustom atau paket.namaPaket)",
      "tanggalSesi": "ISO datetime",
      "lokasiSesi": "string",
      "status": "PENDING | CONFIRMED | COMPLETED | CANCELLED",
      "dpAmount": number,
      "dpStatus": "UNPAID | PARTIAL | PAID",
      "hargaPaket": number,
      "galleryCount": number,
      "createdAt": "ISO datetime",
      "notes": "string",
      "maxSelection": number
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

**Error Responses:**
- `401` — Unauthorized (no session)
- `500` — Failed to load bookings

**Auth Required:** ✅ JWT Session (admin/vendor)

**Default Limit:** 20 items per page

**Sorting:** By tanggalSesi (DESC)

---

#### **POST `/api/admin/events`**
**Purpose:** Buat booking baru dari admin panel

**Input Body:**
```json
{
  "namaClient": "string (required)",
  "hpClient": "string (required)",
  "emailClient": "string (optional)",
  "paketId": "uuid (optional)",
  "paketCustom": "string (optional, jika paket custom)",
  "hargaPaket": "number (required)",
  "tanggalSesi": "string (required, YYYY-MM-DD atau ISO)",
  "lokasiSesi": "string (optional)",
  "maxSelection": "number (optional, default 40)",
  "notes": "string (optional)"
}
```

**Response Format (201 Created):**
```json
{
  "id": "uuid",
  "vendorId": "uuid",
  "kodeBooking": "string",
  "namaClient": "string",
  "hpClient": "string",
  "status": "PENDING",
  "tanggalSesi": "ISO datetime",
  "maxSelection": number,
  "createdAt": "ISO datetime"
}
```

**Error Responses:**
- `401` — Unauthorized
- `404` — Package not found or unauthorized
- `500` — Failed to create booking

**Auth Required:** ✅ JWT Session

**Special Features:**
- Auto-resolve maxSelection dari paket jika paketId dipilih
- IDOR protection: verify paket milik vendor
- Normalize tanggalSesi ke UTC 12:00:00

---

#### **PUT `/api/admin/events`**
**Purpose:** Update booking detail (all fields)

**Input Body:**
```json
{
  "id": "uuid (required)",
  "namaClient": "string (optional)",
  "hpClient": "string (optional)",
  "emailClient": "string (optional)",
  "paketId": "uuid (optional)",
  "paketCustom": "string (optional)",
  "hargaPaket": "number (optional)",
  "tanggalSesi": "string (optional)",
  "lokasiSesi": "string (optional)",
  "maxSelection": "number (optional)",
  "status": "PENDING | CONFIRMED | COMPLETED | CANCELLED (optional)",
  "notes": "string (optional)"
}
```

**Response Format (200 OK):**
```json
{
  "id": "uuid",
  "vendorId": "uuid",
  "kodeBooking": "string",
  "namaClient": "string",
  "status": "string",
  "updatedAt": "ISO datetime"
}
```

**Error Responses:**
- `401` — Unauthorized
- `404` — Booking not found
- `500` — Failed to update booking

**Auth Required:** ✅ JWT Session

---

#### **DELETE `/api/admin/events`**
**Purpose:** Hapus booking (hanya jika tidak punya gallery)

**Input Parameters (Query String):**
```
?id=<booking-uuid>
```

**Response Format (200 OK):**
```json
{
  "success": true,
  "message": "Booking deleted successfully"
}
```

**Error Responses:**
- `401` — Unauthorized
- `404` — Booking not found
- `400` — Cannot delete booking with N gallery(ies)
- `500` — Failed to delete booking

**Auth Required:** ✅ JWT Session

**Constraint:** ❌ Tidak bisa hapus jika ada gallery terkait (CASCADE protection)

---

### 3️⃣ ADMIN API — Booking Detail & Status Update

#### **GET `/api/admin/bookings/[id]`**
**Purpose:** Ambil detail booking lengkap dengan relasi (paket, klien, payments, galleries)

**Input:** Dynamic route parameter `[id]` = booking UUID

**Response Format (200 OK):**
```json
{
  "booking": {
    "id": "uuid",
    "kodeBooking": "string",
    "namaClient": "string",
    "hpClient": "string",
    "emailClient": "string",
    "tanggalSesi": "ISO datetime",
    "lokasiSesi": "string",
    "status": "PENDING | CONFIRMED | COMPLETED | CANCELLED",
    "hargaPaket": number,
    "dpAmount": number,
    "dpStatus": "UNPAID | PARTIAL | PAID",
    "notes": "string",
    "createdAt": "ISO datetime",
    "updatedAt": "ISO datetime",
    "paketId": "uuid",
    "paket": {
      "id": "uuid",
      "namaPaket": "string",
      "kategori": "string",
      "harga": number,
      "kuotaEdit": number,
      "includeCetak": array,
      "deskripsi": "string"
    },
    "client": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "phone": "string",
      "instagram": "string"
    },
    "payments": [
      {
        "id": "uuid",
        "jumlah": number,
        "tipe": "DP | PELUNASAN | LAINNYA",
        "keterangan": "string",
        "buktiBayar": "URL",
        "createdAt": "ISO datetime"
      }
    ],
    "galleries": [
      {
        "id": "uuid",
        "namaProject": "string",
        "status": "DRAFT | PUBLISHED | ARCHIVED",
        "clientToken": "string",
        "createdAt": "ISO datetime"
      }
    ]
  },
  "summary": {
    "totalBayar": number,
    "sisaTagihan": number,
    "lunas": boolean
  }
}
```

**Error Responses:**
- `401` — Unauthorized
- `404` — Booking not found
- `500` — Internal server error

**Auth Required:** ✅ JWT Session

**Relations Included:** paket, client, payments (max 5), galleries (last 5)

---

#### **PATCH `/api/admin/bookings/[id]`**
**Purpose:** Update booking status dan detail tertentu (partial update)

**Input Body:**
```json
{
  "status": "PENDING | CONFIRMED | COMPLETED | CANCELLED (optional)",
  "lokasiSesi": "string (optional, nullable)",
  "tanggalSesi": "string (optional, ISO)",
  "hargaPaket": "number (optional)",
  "notes": "string (optional, nullable)",
  "paketId": "uuid (optional, nullable)"
}
```

**Response Format (200 OK):**
```json
{
  "id": "uuid",
  "status": "string",
  "updatedAt": "ISO datetime"
}
```

**Error Responses:**
- `401` — Unauthorized
- `404` — Booking not found
- `400` — Invalid paket / validation error
- `500` — Internal server error

**Auth Required:** ✅ JWT Session

**IDOR Protection:** ✅ Verify ownership + vendorId in WHERE clause

---

### 4️⃣ PAYMENT API — Record & Upload Payment Proof

#### **GET `/api/admin/bookings/[id]/payments`**
**Purpose:** List semua payment untuk booking tertentu

**Input:** Dynamic route parameter `[id]` = booking UUID

**Response Format (200 OK):**
```json
{
  "booking": {
    "id": "uuid",
    "namaClient": "string",
    "kodeBooking": "string",
    "hargaPaket": number
  },
  "payments": [
    {
      "id": "uuid",
      "jumlah": number,
      "tipe": "DP | PELUNASAN | LAINNYA",
      "keterangan": "string",
      "buktiBayar": "URL (Cloudinary)",
      "createdAt": "ISO datetime"
    }
  ],
  "summary": {
    "totalBayar": number,
    "sisaTagihan": number,
    "lunas": boolean
  }
}
```

**Error Responses:**
- `401` — Unauthorized
- `404` — Booking not found

**Auth Required:** ✅ JWT Session

---

#### **POST `/api/admin/bookings/[id]/payments`**
**Purpose:** Catat pembayaran baru untuk booking

**Input Body:**
```json
{
  "jumlah": "number (required, > 0)",
  "tipe": "DP | PELUNASAN | LAINNYA (optional, default DP)",
  "keterangan": "string (optional)",
  "buktiBayar": "https://res.cloudinary.com/... (required, Cloudinary URL)"
}
```

**Response Format (201 Created):**
```json
{
  "id": "uuid",
  "bookingId": "uuid",
  "vendorId": "uuid",
  "jumlah": number,
  "tipe": "DP | PELUNASAN | LAINNYA",
  "keterangan": "string",
  "buktiBayar": "URL",
  "createdAt": "ISO datetime"
}
```

**Sisi Effect:**
- Auto-update `booking.dpStatus` ke UNPAID/PARTIAL/PAID
- Auto-update `booking.dpAmount` dengan aggregate sum

**Error Responses:**
- `401` — Unauthorized
- `404` — Booking not found
- `400` — Validasi gagal (invalid jumlah, tipe, atau URL)
- `500` — Internal server error

**Auth Required:** ✅ JWT Session

**Validation Rules:**
- `jumlah` harus > 0
- `buktiBayar` harus URL yang valid
- `buktiBayar` harus dimulai dengan `https://res.cloudinary.com/` (security)

---

#### **DELETE `/api/admin/bookings/[id]/payments`**
**Purpose:** Hapus payment record tertentu

**Input Parameters (Query String):**
```
?paymentId=<payment-uuid>
```

**Response Format (200 OK):**
```json
{
  "success": true
}
```

**Sisi Effect:**
- Auto-recalculate `booking.dpStatus` dan `booking.dpAmount`

**Error Responses:**
- `401` — Unauthorized
- `404` — Payment not found
- `400` — Payment ID required

**Auth Required:** ✅ JWT Session

---

#### **POST `/api/admin/bookings/[id]/payments/upload`**
**Purpose:** Upload bukti pembayaran ke Cloudinary (return URL untuk field buktiBayar)

**Input:** Form-data multipart
```
file: File (required)
  - Max 5MB
  - Allowed: JPG, PNG, WEBP, HEIC
```

**Response Format (200 OK):**
```json
{
  "url": "https://res.cloudinary.com/..."
}
```

**Error Responses:**
- `401` — Unauthorized
- `404` — Booking not found
- `400` — File validation error (format/size)

**Auth Required:** ✅ JWT Session

**Features:**
- Auto-upload ke folder `hafispace/bukti-bayar/{kodeBooking}`
- Auto-tag dengan `bukti-bayar` dan `kodeBooking`

---

### 5️⃣ UTILITY ENDPOINTS

#### **GET `/api/admin/bookings/export`**
**Purpose:** Export semua booking vendor ke CSV

**Input:** None (uses session vendor)

**Response Format (200 OK):**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="bookings-YYYY-MM-DD.csv"

Kode Booking,Nama Klien,HP,Email,Tanggal Sesi,Lokasi,Status,Paket,Kategori,Harga Paket,Total Bayar,Sisa Tagihan,Status Bayar,Tanggal Buat
BK2401-XXXX,John Doe,628123456789,john@email.com,01/01/2024,Jakarta,PENDING,Paket Gold,Wedding,5000000,0,5000000,UNPAID,01/01/2024
...
```

**Error Responses:**
- `401` — Unauthorized

**Auth Required:** ✅ JWT Session

**Columns:** 14 kolom (lihat CSV header di atas)

---

#### **POST `/api/admin/bookings/reminder`**
**Purpose:** Generate WhatsApp reminder link untuk klien

**Input Body:**
```json
{
  "bookingId": "uuid (required)"
}
```

**Response Format (200 OK):**
```json
{
  "success": true,
  "waUrl": "https://wa.me/628123456789?text=encoded_message"
}
```

**Message Template:**
```
Halo {namaClient} 👋

Ini adalah pengingat bahwa sesi foto Anda bersama *{namaStudio}* akan dilaksanakan *besok, {tanggal}*.

Kode Booking: *{kodeBooking}*
Paket: {namaPaket}

Mohon hadir tepat waktu. Sampai jumpa! 📸
```

**Error Responses:**
- `401` — Unauthorized
- `404` — Booking not found
- `400` — Booking ID required

**Auth Required:** ✅ JWT Session

**Features:**
- Auto-convert phone ke format internasional (62 prefix)
- URL-encode message untuk WhatsApp link

---

### 6️⃣ BULK OPERATIONS

#### **POST `/api/admin/events/bulk`**
**Purpose:** Bulk update atau delete bookings

**Input Body (Action: UPDATE):**
```json
{
  "action": "update",
  "bookingIds": ["uuid", "uuid", ...],
  "status": "PENDING | CONFIRMED | COMPLETED | CANCELLED (required)"
}
```

**Input Body (Action: DELETE):**
```json
{
  "action": "delete",
  "bookingIds": ["uuid", "uuid", ...]
}
```

**Response Format (200 OK):**
```json
{
  "success": true,
  "message": "N booking(s) updated successfully",
  "updatedCount": N
}
```

**Error Responses (DELETE):**
```json
{
  "code": "HAS_GALLERIES",
  "message": "Cannot delete N booking(s) with galleries. Delete galleries first.",
  "bookingsWithGalleries": [
    {
      "id": "uuid",
      "namaClient": "string",
      "galleryCount": number
    }
  ]
}
```

**Other Error Responses:**
- `401` — Unauthorized
- `400` — Validation error / Invalid action
- `500` — Failed to perform bulk operation

**Auth Required:** ✅ JWT Session

**IDOR Protection:** ✅ Filter by vendorId

---

## 📊 Tabel Ringkasan

| # | Endpoint | Method | Purpose | Auth | Rate Limit |
|---|----------|--------|---------|------|------------|
| 1 | `/api/public/booking` | GET | Ambil info vendor + paket | ❌ | ❌ |
| 2 | `/api/public/booking` | POST | Submit booking publik | ❌ | ✅ 5/hr |
| 3 | `/api/admin/events` | GET | List bookings paginated | ✅ | ❌ |
| 4 | `/api/admin/events` | POST | Buat booking admin | ✅ | ❌ |
| 5 | `/api/admin/events` | PUT | Update booking (all fields) | ✅ | ❌ |
| 6 | `/api/admin/events` | DELETE | Hapus booking | ✅ | ❌ |
| 7 | `/api/admin/bookings/[id]` | GET | Detail booking lengkap | ✅ | ❌ |
| 8 | `/api/admin/bookings/[id]` | PATCH | Update booking (partial) | ✅ | ❌ |
| 9 | `/api/admin/bookings/[id]/payments` | GET | List payments booking | ✅ | ❌ |
| 10 | `/api/admin/bookings/[id]/payments` | POST | Catat pembayaran | ✅ | ❌ |
| 11 | `/api/admin/bookings/[id]/payments` | DELETE | Hapus payment | ✅ | ❌ |
| 12 | `/api/admin/bookings/[id]/payments/upload` | POST | Upload bukti bayar | ✅ | ❌ |
| 13 | `/api/admin/bookings/export` | GET | Export CSV | ✅ | ❌ |
| 14 | `/api/admin/bookings/reminder` | POST | WhatsApp reminder | ✅ | ❌ |
| 15 | `/api/admin/events/bulk` | POST | Bulk update/delete | ✅ | ❌ |

---

## 🔐 Security & Authorization

### Session & Auth
- **JWT-based** NextAuth.js session
- **Middleware protected:** `/admin/*` dan `/api/admin/*`
- **IDOR Protection:** All admin endpoints verify `vendorId` ownership

### Validation & Input Sanitization
- **Zod schema validation** di semua request body
- **Cloudinary URL validation** untuk bukti bayar
- **Rate limiting** untuk public booking (5 per IP per hour)

### Error Handling Strategy
- **Standardized response format:**
  ```json
  {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {} // optional validation details
  }
  ```

---

## 📈 Data Flow Diagram

```
┌─────────────┐
│   Klien     │
│  (Public)   │
└──────┬──────┘
       │
       ├─→ GET /api/public/booking?vendorId=X
       │    (ambil vendor + paket)
       │
       └─→ POST /api/public/booking
            (submit booking baru)
            ├─ validate vendor + paket
            ├─ create/link client
            ├─ generate kode booking
            ├─ send email konfirmasi
            └─ return booking + DP amount

┌──────────────────┐
│  Fotografer      │
│  (Admin Panel)   │
└────────┬─────────┘
         │
         ├─→ GET /api/admin/events?page=1&limit=20
         │    (list all bookings paginated)
         │
         ├─→ GET /api/admin/bookings/[id]
         │    (view detail + payments + galleries)
         │
         ├─→ PUT/PATCH /api/admin/bookings/[id]
         │    (update booking status/detail)
         │
         ├─→ POST /api/admin/bookings/[id]/payments
         │    (record payment)
         │    ├─ validate jumlah & URL
         │    └─ auto-update dpStatus
         │
         ├─→ POST /api/admin/bookings/[id]/payments/upload
         │    (upload bukti bayar ke Cloudinary)
         │
         ├─→ DELETE /api/admin/bookings/[id]/payments?paymentId=X
         │    (delete payment & recalculate)
         │
         ├─→ POST /api/admin/bookings/reminder
         │    (generate WhatsApp link)
         │
         └─→ POST /api/admin/events/bulk
              (bulk update/delete bookings)
```

---

## ✅ Checklist Fitur yang Ada

- ✅ **Create Booking** — POST /api/public/booking (public)
- ✅ **Get Bookings** — GET /api/admin/events (list), GET /api/admin/bookings/[id] (detail)
- ✅ **Update Status** — PATCH /api/admin/bookings/[id], PUT /api/admin/events
- ✅ **Cancel Booking** — DELETE /api/admin/events (jika tidak ada gallery)
- ✅ **Record Payment** — POST /api/admin/bookings/[id]/payments
- ✅ **Track Payment Status** — GET /api/admin/bookings/[id]/payments (dpStatus: UNPAID/PARTIAL/PAID)
- ✅ **Upload Proof** — POST /api/admin/bookings/[id]/payments/upload
- ✅ **Export CSV** — GET /api/admin/bookings/export
- ✅ **WhatsApp Reminder** — POST /api/admin/bookings/reminder
- ✅ **Bulk Operations** — POST /api/admin/events/bulk

---

## 🚀 Response Helpers (src/lib/api/response.ts)

```typescript
// Error Response Helpers
- unauthorizedResponse() → 401
- notFoundResponse(message) → 404
- validationErrorResponse(details) → 400
- internalErrorResponse(message) → 500

// Parse & Validate Helpers
- parseRequestBody(request) → { ok: boolean, data?, response? }
- parseAndValidate(request, schema) → { ok: boolean, data?, response? }
```

---

## 📝 Notes & Observations

1. **No GET list endpoint untuk /api/admin/bookings/[id]** — list bookings harus via `/api/admin/events`
2. **Payment query result mungkin dari relasi** — POST endpoint checks di database, GET endpoint juga
3. **PATCH vs PUT:** PATCH partial update, PUT full update (dengan ownership check)
4. **Bulk delete protection:** Tidak bisa delete booking jika punya gallery (cascade protection)
5. **Auto email:** Hanya saat POST /api/public/booking jika emailClient ada
6. **Rate limiting:** Hanya di public booking endpoint (cegah spam)
7. **CSV export:** Semua bookings vendor tanpa filter (consider adding filters di UI)
8. **WhatsApp link:** Redirect ke wa.me dengan pre-formatted message (user klik untuk kirim)

