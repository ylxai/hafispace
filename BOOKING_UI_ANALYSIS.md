# Analisa UI Components & Pages untuk Booking — Hafiportrait Platform

## 📋 Ringkasan Eksekutif

Hafiportrait memiliki **sistem booking yang kompleks** dengan dua alur utama:
1. **Admin/Vendor**: Mengelola booking, track pembayaran, analisis galeri
2. **Client**: Form booking public dan invoice tracking

Total ada **9 main components/pages** yang fokus pada booking management.

---

## 🎯 Booking Pages & Routes

### 1. **Admin Events List Page** (`src/app/admin/events/page.tsx`)
**Deskripsi**: Dashboard utama untuk admin mengelola semua booking (events).

**Fitur Utama**:
- ✅ **List Bookings dengan Pagination**: 20 items per halaman, navigasi page via query param
- ✅ **Filter Kompleks**:
  - Search: by nama client, kode booking, nomor HP
  - Status Filter: PENDING, CONFIRMED, COMPLETED, CANCELLED
  - Date Range: Sesi dari & sampai tanggal
  - All filters persisten di URL query params (bookmarkable & refresh-safe)
- ✅ **Bulk Actions**:
  - Multi-select bookings dengan checkbox
  - Change status bulk untuk multiple bookings
  - Bulk delete dengan confirmation
  - Clear selection & bulk processing state indicator
- ✅ **Summary Stats** (real-time computed):
  - Total Bookings
  - Active (CONFIRMED)
  - Pending (PENDING)
  - Completed (COMPLETED)
- ✅ **Export CSV**: Download semua booking data
- ✅ **Create Button**: Open modal untuk booking baru

**Komponen Anak**:
- `EventsFilterBar` — Search + Advanced Filters
- `EventsBulkActions` — Bulk action controls
- `EventsSummaryBar` — Stats cards
- `CreateBookingModal` — Form booking baru
- `PaymentModal` — Record pembayaran

**Data Structure** (`AdminBooking` type):
```typescript
{
  id: string;
  kodeBooking: string;
  namaClient: string;
  hpClient: string | null;
  tanggalSesi: string;
  lokasiSesi: string | null;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  dpStatus: "UNPAID" | "PARTIAL" | "PAID";
  hargaPaket: number;
  namaPaket: string | null;
  paketId: string | null;
  notes: string | null;
  createdAt: string;
  clientId: string | null;
}
```

---

### 2. **Booking Detail Page** (`src/app/admin/events/[id]/page.tsx`)
**Deskripsi**: Detail lengkap satu booking, payment tracking, gallery list, status update.

**Fitur Utama**:
- ✅ **Booking Info Card**:
  - Nama client, kode booking, tanggal sesi, lokasi
  - Status badge (PENDING/CONFIRMED/COMPLETED/CANCELLED)
  - Contact info (HP, email, Instagram)
- ✅ **Package Details**: Nama paket, harga, kuota edit, include cetak
- ✅ **Payment Section**:
  - Tabel pembayaran (DP, PELUNASAN, LAINNYA)
  - Hitung total bayar & sisa tagihan
  - Lunas status
  - Add payment button
- ✅ **Gallery List**: Semua gallery yang linked ke booking ini
- ✅ **Notes/Custom Fields**: Display notes dan custom fields
- ✅ **Action Buttons**:
  - Update status dropdown
  - WhatsApp admin button
  - Download invoice

**Status Management**:
- Update individual booking status (tidak bulk)
- Show current status dengan color coding

---

### 3. **Create/Edit Booking Modal** (`src/app/admin/events/_components/create-booking-modal.tsx`)
**Deskripsi**: Modal form untuk membuat booking baru dari admin.

**Fitur Utama**:
- ✅ **Form Fields**:
  - Nama client (required)
  - HP client (required)
  - Email client (optional)
  - Tanggal sesi (required, date picker, no past dates)
  - Lokasi sesi (optional)
  - Pilih paket (dropdown dari database)
  - Paket custom name (optional)
  - Harga paket (auto-fill dari paket atau manual custom)
  - Notes (optional)
  - Max selection default: 40
- ✅ **Validation**:
  - Real-time field validation (Zod schema)
  - Date validation (no past dates)
  - Price validation (positive number)
  - Phone number format validation
- ✅ **Package Selection**:
  - Fetch packages dari `/api/admin/packages`
  - Auto-populate harga ketika paket dipilih
  - Support custom paket (overwrite harga)
- ✅ **API Integration**:
  - POST `/api/admin/events` to create
  - Error handling & toast notifications
  - Auto-invalidate cache setelah success

---

### 4. **Payment Modal** (`src/app/admin/events/_components/payment-modal.tsx`)
**Deskripsi**: Modal untuk record pembayaran (DP, PELUNASAN, LAINNYA).

**Fitur Utama**:
- ✅ **Payment Form**:
  - Jumlah pembayaran (required, positive number)
  - Tipe: DP / PELUNASAN / LAINNYA (required)
  - Keterangan (optional)
  - Bukti bayar upload (optional, Cloudinary URL)
- ✅ **Payment History Table**:
  - List semua pembayaran existing
  - Tabel: Tanggal, Tipe, Jumlah, Keterangan, Bukti
  - Delete button per payment
- ✅ **Payment Summary**:
  - Total bayar (sum of all payments)
  - Sisa tagihan (hargaPaket - totalBayar)
  - Lunas status (true if totalBayar >= hargaPaket)
- ✅ **File Upload**:
  - Preview bukti bayar sebelum upload
  - Upload ke Cloudinary
  - Validate URL format (must be Cloudinary URL)
- ✅ **Validation**:
  - Zod schema untuk payment data
  - Real-time field validation
- ✅ **API Integration**:
  - GET `/api/admin/bookings/{id}/payments` — fetch payment data
  - POST `/api/admin/bookings/{id}/payments` — add payment
  - DELETE `/api/admin/bookings/{id}/payments/{paymentId}` — remove payment

---

### 5. **Events Filter Bar** (`src/app/admin/events/_components/events-filter-bar.tsx`)
**Deskripsi**: Shared filter component untuk advanced search & filtering.

**Fitur Utama**:
- ✅ **Search Input** (always visible):
  - Real-time search by nama, kode, HP
  - Placeholder: "Nama, kode, HP..."
- ✅ **Advanced Filters** (collapsible di mobile, expanded di desktop):
  - Status dropdown (Semua Status / PENDING / CONFIRMED / COMPLETED / CANCELLED)
  - Date From (date picker)
  - Date To (date picker)
  - Reset Filter button
- ✅ **Filter Badge**: Show active filter count
- ✅ **Mobile Responsive**: Toggle filter visibility di mobile dengan button
- ✅ **URL-based State**: Semua filter di-persist ke URL params untuk bookmarkable/refreshable

---

### 6. **Events Bulk Actions Bar** (`src/app/admin/events/_components/events-bulk-actions.tsx`)
**Deskripsi**: Toolbar untuk multi-select actions pada bookings.

**Fitur Utama**:
- ✅ **Selection Counter**: "X booking dipilih"
- ✅ **Bulk Status Update**:
  - Dropdown pilih status baru
  - Update button
- ✅ **Bulk Delete**:
  - Delete button dengan confirmation dialog
  - Warning: Cannot delete booking dengan galleries
- ✅ **Clear Selection**: Clear all selected bookings
- ✅ **Processing State**: Show "Memproses..." during bulk operations
- ✅ **Disabled States**: Buttons disabled saat processing atau no selection

---

### 7. **Events Summary Bar** (`src/app/admin/events/_components/events-summary-bar.tsx`)
**Deskripsi**: Stat cards menampilkan overview booking stats.

**Fitur Utama**:
- ✅ **Stat Cards Grid**:
  - Total Bookings
  - Active (CONFIRMED)
  - Pending
  - Completed
  - Responsive grid: 2 col mobile, 4 col desktop
- ✅ **Loading Skeleton**: Placeholder saat loading data
- ✅ **Total Count**: Show total booking count di bottom right

---

### 8. **Public Booking Form Page** (`src/app/booking/page.tsx` + `src/app/booking/_components/booking-form-content.tsx`)
**Deskripsi**: Public-facing booking form untuk client mengajukan booking baru.

**Fitur Utama**:
- ✅ **Vendor Selection**:
  - Load via query param `?v={vendorId}`
  - Fetch vendor data & settings dari `/api/public/booking`
- ✅ **Booking Form**:
  - Nama client (required)
  - HP client (required)
  - Email client (optional)
  - Tanggal sesi (required)
  - Lokasi sesi (optional)
  - Catatan (optional)
  - Pilih paket (required, dropdown dari vendor packages)
- ✅ **Dynamic Custom Fields**:
  - Support custom fields per vendor (TEXT, TEXTAREA, DATE, SELECT)
  - Required field validation
- ✅ **Package Display**:
  - Show deskripsi paket
  - Show harga
  - Show kuota edit
  - Show include cetak items
- ✅ **DP Calculation**:
  - Auto-calculate DP amount (dpPercentage × hargaPaket)
  - Display total + DP amount
- ✅ **Success State**:
  - Show booking code setelah success
  - Show kode booking, harga, DP amount
  - Option untuk print invoice
- ✅ **Validation**:
  - Client-side validation
  - Server-side validation (Zod schema)
  - Custom field validation
- ✅ **Form Active Check**:
  - Check `bookingFormActive` flag di vendor settings
  - Show error jika form inactive
- ✅ **Theme Support**:
  - Vendor-specific theme color
  - Custom success message
- ✅ **API Integration**:
  - POST `/api/public/booking` untuk submit
  - Trigger email notification (optional)

**Form Submission Flow**:
1. Fetch vendor data by vendorId
2. Validate all fields (including custom fields)
3. POST to `/api/public/booking`
4. Show success state dengan booking code
5. Option print invoice via `/invoice/{kodeBooking}`

---

### 9. **Invoice Page** (`src/app/invoice/[kodeBooking]/page.tsx`)
**Deskripsi**: Invoice detail public page untuk view/print booking invoice.

**Fitur Utama**:
- ✅ **Invoice Header**:
  - Logo vendor
  - Nama studio (vendor)
  - Invoice number (kodeBooking)
  - Tanggal invoice
- ✅ **Bill To**:
  - Nama client
  - Email & HP client
  - Instagram client
- ✅ **Booking Details**:
  - Paket name
  - Tanggal sesi
  - Lokasi sesi
  - Kategori paket
  - Kuota edit & include cetak
- ✅ **Payment Summary Table**:
  - List all payments (DP, PELUNASAN, etc.)
  - Tanggal, tipe, jumlah, keterangan
- ✅ **Total Calculation**:
  - Total harga paket
  - Total pembayaran
  - Sisa tagihan
  - Status lunas (badge)
- ✅ **Print Functionality**:
  - Print button (via print-button.tsx)
  - Responsive print styles
  - Hide UI buttons saat print
- ✅ **Vendor Info**:
  - Contact info (phone, email)
  - Rekening pembayaran (banking details)
  - Theme color (customizable header border)
- ✅ **Server-side Rendering**:
  - Static page generation
  - Metadata generation (title, description)
  - notFound() jika kodeBooking tidak ditemukan

---

## 🎨 UI Components Hierarchy

```
Admin Events Page (/admin/events)
├── PageHeader (Create, Export buttons)
├── EventsFilterBar
│   ├── Search input
│   ├── Status dropdown
│   ├── Date range pickers
│   └── Reset button
├── EventsBulkActions (conditional, if items selected)
│   ├── Status dropdown
│   ├── Update button
│   └── Delete button
├── EventsSummaryBar
│   ├── Stat cards (Total, Active, Pending, Completed)
│   └── Total count
├── Bookings Table (sortable columns)
│   ├── Checkbox (multi-select)
│   ├── Booking code
│   ├── Client name
│   ├── Package name
│   ├── Session date
│   ├── Status badge
│   ├── DP status badge
│   ├── Price
│   └── Action buttons (View, Payment, etc.)
└── Pagination

Modals (conditional rendering)
├── CreateBookingModal
│   ├── Client info inputs
│   ├── Session date input
│   ├── Package dropdown
│   ├── Price input
│   ├── Notes textarea
│   └── Submit button
└── PaymentModal
    ├── Payment amount input
    ├── Type dropdown (DP/PELUNASAN/LAINNYA)
    ├── Description input
    ├── File upload (bukti bayar)
    ├── Payment history table
    ├── Summary (total, sisa, lunas)
    └── Submit button

Booking Detail Page (/admin/events/[id])
├── Booking info card
├── Client info section
├── Package details section
├── Payment section
│   ├── Payment history table
│   ├── Summary (total, sisa, lunas)
│   └── Add payment button
├── Gallery list section
└── Action buttons

Public Booking Form Page (/booking)
├── Vendor branding
├── Package selection dropdown
├── Client info inputs (nama, HP, email)
├── Session info inputs (tanggal, lokasi)
├── Dynamic custom fields
├── Notes textarea
├── Terms & conditions checkbox
├── Submit button
└── Success state (booking confirmation)

Invoice Page (/invoice/[kodeBooking])
├── Header (vendor logo, invoice number)
├── Bill To section
├── Booking details section
├── Payment history table
├── Total summary
├── Vendor contact & banking info
└── Print button
```

---

## 📊 Current Features Matrix

| Feature | Admin Events | Detail | Modal | Public Form | Invoice |
|---------|--------------|--------|-------|-------------|---------|
| **List/Grid** | ✅ | - | - | - | - |
| **Detail View** | - | ✅ | - | - | ✅ |
| **Create** | ✅ | - | ✅ | ✅ | - |
| **Edit** | ✅ (bulk) | ✅ (status) | - | - | - |
| **Delete** | ✅ (bulk) | - | - | - | - |
| **Search** | ✅ | - | - | - | - |
| **Filter** | ✅ | - | - | - | - |
| **Sort** | - (implicit) | - | - | - | - |
| **Pagination** | ✅ | - | - | - | - |
| **Export** | ✅ (CSV) | - | - | - | ✅ (Print) |
| **Payment Track** | - | ✅ | ✅ | - | ✅ |
| **Status Management** | ✅ | ✅ | - | - | - |
| **Multi-select** | ✅ | - | - | - | - |
| **Bulk Actions** | ✅ | - | - | - | - |
| **Real-time Stats** | ✅ | - | - | - | - |

---

## 🔌 API Endpoints Used

### Admin APIs
- `GET /api/admin/events?page={page}&limit={limit}` — Fetch bookings dengan pagination
- `POST /api/admin/events` — Create booking baru
- `GET /api/admin/events/[id]` — Get booking detail
- `PUT /api/admin/events/[id]` — Update booking
- `DELETE /api/admin/events/[id]` — Delete booking
- `POST /api/admin/events/bulk` — Bulk operations (update/delete)
- `GET /api/admin/bookings/[id]/payments` — Get payment history
- `POST /api/admin/bookings/[id]/payments` — Add payment record
- `DELETE /api/admin/bookings/[id]/payments/{paymentId}` — Remove payment
- `GET /api/admin/packages` — Get package list
- `GET /api/admin/bookings/export` — Export bookings as CSV
- `GET /api/admin/bookings/reminder` — Send booking reminders

### Public APIs
- `GET /api/public/booking?vendorId={id}` — Get vendor data & packages untuk booking form
- `POST /api/public/booking` — Submit booking baru dari client
- `GET /api/public/invoice/{kodeBooking}` — Get invoice data

---

## 🎯 Status & DP Status Enums

### Booking Status
- `PENDING` — Menunggu konfirmasi dari admin
- `CONFIRMED` — Sudah dikonfirmasi
- `COMPLETED` — Sesi sudah selesai
- `CANCELLED` — Dibatalkan

### DP Status (Payment Status)
- `UNPAID` — Belum ada pembayaran DP
- `PARTIAL` — Ada pembayaran DP tapi belum lunas
- `PAID` — Sudah lunas

### Color Coding
**Status Badges**:
- PENDING: `bg-amber-100 text-amber-700`
- CONFIRMED: `bg-green-100 text-green-700`
- COMPLETED: `bg-slate-100 text-slate-600`
- CANCELLED: `bg-red-100 text-red-500`

**DP Status Badges**:
- PAID/Lunas: `bg-green-100 text-green-700`
- PARTIAL: `bg-amber-100 text-amber-700` atau `bg-sky-100 text-sky-700`
- UNPAID/Belum Bayar: `bg-slate-100 text-slate-500`

---

## 🔐 Access Control

- **Admin pages** (`/admin/events/*`): Middleware protects, requires NextAuth session dengan role admin
- **Public form** (`/booking`): Public accessible, requires vendorId query param
- **Invoice** (`/invoice/[kodeBooking]`): Public accessible via kodeBooking (no auth required)
- **API endpoints**:
  - `/api/admin/*` — Requires admin auth
  - `/api/public/*` — Public or token-based access

---

## 🚀 Tech Stack untuk Booking UI

- **Framework**: Next.js 15 (App Router)
- **State Management**: TanStack Query v5 untuk caching & data fetching
- **Form Validation**: Zod schemas
- **UI Library**: Custom Tailwind CSS + shadcn/ui components
- **Icons**: Lucide React
- **Toast Notifications**: Custom toast hook
- **File Upload**: Cloudinary integration
- **Formatting**: `@/lib/format` utilities (formatRupiah, formatDate, etc.)

---

## ✨ Key Implementation Patterns

### 1. **URL-based Filtering**
- All filters persisted in URL query params
- Allows bookmarking & page refresh without losing state
- Page reset to 1 when filters change

### 2. **Real-time Validation**
- Zod schema-based validation on both client & server
- Show validation errors immediately
- Support conditional validation (e.g., date can't be past)

### 3. **Pessimistic Updates**
- Wait for server response before updating UI
- Show loading/processing state during mutations
- Handle errors gracefully

### 4. **Cache Invalidation**
- Invalidate `admin-bookings` query after mutations
- Force refetch dari server untuk fresh data

### 5. **Responsive Design**
- Mobile-first approach
- Collapsible filters on mobile
- Grid layout yang adapt ke screen size
- Print styles untuk invoice

### 6. **Accessibility**
- Semantic HTML (button, select, input)
- Color coding + labels (tidak rely hanya warna)
- Proper form labeling
- Status badges dengan text labels

---

## 📝 Notes & Observations

1. **No Sorting**: Events page tidak ada sorting feature (hanya filter & search)
2. **Pagination**: Hard-coded 20 items per page, tidak configurable
3. **Bulk Delete Warning**: Cannot delete booking dengan galleries (prevents data orphaning)
4. **Custom Packages**: Support paket custom di create modal (override paket template)
5. **Payment Types**: Ada 3 tipe pembayaran (DP, PELUNASAN, LAINNYA) - flexible
6. **DP Calculation**: Auto-calculated dari dpPercentage × hargaPaket
7. **Custom Fields**: Public booking form support dynamic custom fields per vendor
8. **Theme Customization**: Invoice & public form support vendor-specific theme color
9. **WhatsApp Integration**: Quick contact button ke admin WhatsApp
10. **Invoice Printable**: Full print support dengan hidden UI elements

---

## 🎓 Summary

Hafiportrait memiliki **comprehensive booking management system** dengan:
- ✅ Admin dashboard untuk list, filter, bulk manage bookings
- ✅ Detailed booking view dengan payment tracking
- ✅ Public-facing booking form untuk clients
- ✅ Invoice system untuk payment tracking & printing
- ✅ Real-time stats & analytics
- ✅ Multi-select & bulk operations
- ✅ Advanced filtering & search
- ✅ Custom package & custom fields support
- ✅ Payment type flexibility
- ✅ Responsive design & print-friendly

**Key Gaps/Future Enhancements**:
- No sorting feature (only filter)
- No duplicate booking detection
- No booking reminder automation (endpoint exists but not in UI)
- No booking cancellation workflow (just status change)
- No booking email notifications visible in UI
- No booking template/draft feature
