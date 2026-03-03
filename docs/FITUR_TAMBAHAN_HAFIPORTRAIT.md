# Spesifikasi Fitur Tambahan Hafiportrait Platform

Dokumen ini menjelaskan detail implementasi untuk 5 fitur yang belum tersedia di Hafiportrait Platform:

1. Paket Management
2. Pembayaran/DP Tracking
3. Invoice System
4. Custom Form Fields
5. Dashboard Analytics

---

## 1. Paket Management

### Deskripsi
Fitur untuk mengelola katalog paket foto yang ditawarkan kepada klien, termasuk harga, benefit, dan spesifikasi teknis.

### Data Model

```typescript
interface Package {
  id: string;
  vendorId: string;
  name: string;
  category: PackageCategory;
  price: number;
  description: string;
  benefits: PackageBenefit[];
  maxSelections: number;
  includePrint: boolean;
  printItems?: PrintItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type PackageCategory = 'PREWED' | 'WEDDING' | 'PERSONAL' | 'EVENT' | 'PROPERTY' | 'OTHER';

interface PackageBenefit {
  id: string;
  name: string;
  value: string;
  icon?: string;
}

interface PrintItem {
  size: string;
  quantity: number;
}
```

### Fitur

#### 1.1 Daftar Paket
- Tampilkan semua paket dalam bentuk grid atau list
- Filter berdasarkan kategori: PREWED, WEDDING, PERSONAL, EVENT, PROPERTY, OTHER
- Status aktif/nonaktif
- Informasi yang ditampilkan per paket:
  - Nama paket
  - Kategori (badge)
  - Harga
  - Kuota edit (jumlah file)
  - Jumlah benefit
  - Status (Aktif/Nonaktif)

#### 1.2 Tambah Paket
- **Field yang diperlukan:**
  - Nama Paket (text)
  - Kategori (dropdown)
  - Harga (number, format Rupiah)
  - Deskripsi/Spesifikasi (rich text editor)
  - Kuota Edit (number, dalam unit file)
  - Include Cetak (toggle)
  
- **Field opsional:**
  - Benefit Editing (dynamic list)
  - Include Cetak - Detail (size + quantity)

#### 1.3 Edit Paket
- Semua field sama seperti Tambah Paket
- Riwayat perubahan

#### 1.4 Hapus Paket
- Soft delete (arsipkan)
- Konfirmasi sebelum hapus
- Paket yang sudah digunakan di booking tidak bisa dihapus, hanya diarsipkan

### API Endpoints

```
GET    /api/admin/packages              - List semua paket
GET    /api/admin/packages/:id         - Detail paket
POST   /api/admin/packages              - Buat paket baru
PUT    /api/admin/packages/:id         - Update paket
DELETE /api/admin/packages/:id         - Hapus paket
GET    /api/admin/packages/categories   - List kategori
```

### UI Components

- `PackageCard` - Card untuk menampilkan paket
- `PackageForm` - Form tambah/edit paket
- `PackageList` - Grid/List semua paket
- `PackageFilter` - Filter kategori
- `BenefitEditor` - Dynamic benefit input

---

## 2. Pembayaran/DP Tracking

### Deskripsi
Sistem pelacakan pembayaran DP (Down Payment) dan pelunasan dari klien, termasuk pengaturan minimal DP dan rekening pembayaran.

### Data Model

```typescript
interface Payment {
  id: string;
  bookingId: string;
  vendorId: string;
  type: PaymentType;
  amount: number;
  paymentMethod?: string;
  transferTo?: string;
  transferFrom?: string;
  proofImage?: string;
  status: PaymentStatus;
  notes?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type PaymentType = 'DP' | 'LUNAS' | 'TAMBAHAN';
type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

interface PaymentSettings {
  id: string;
  vendorId: string;
  minDpPercentage: number;
  bankAccounts: BankAccount[];
  paymentInstructions?: string;
  cancellationPolicy?: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}
```

### Fitur

#### 2.1 Dashboard Pembayaran
- Ringkasan:
  - Total DP belum lunas
  - Total DP diterima bulan ini
  - Total pelunasan bulan ini
  - Jumlah booking dengan pembayaran pending

#### 2.2 Input Pembayaran (per Booking)
- Field:
  - Tipe Pembayaran: DP / Pelunasan / Tambahan
  - Jumlah (auto-hitung dari % DP atau manual)
  - Tanggal Transfer
  - Metode Transfer (Transfer Bank / QRIS / Cash / Lainnya)
  - Rekening Tujuan (dropdown dari settings)
  - Bukti Transfer (upload image)
  - Catatan (optional)
- Status: Pending → Dikonfirmasi / Ditolak

#### 2.3 Pengaturan Pembayaran
- **Minimal DP %** (slider 0-100%)
  - Default: 30%
  - 0% = bisa booking tanpa DP
- **Rekening Pembayaran** (multi-account)
  - Nama Bank
  - Nomor Rekening
  - Nama Pemilik
  - Jadikan default
- **Instruksi Pembayaran** (rich text)
- **Kebijakan Pembatalan** (rich text)

#### 2.4 Riwayat Pembayaran
- Tabel semua transaksi pembayaran
- Filter: Tanggal, Status, Tipe, Booking
- Export ke CSV/Excel

### API Endpoints

```
GET    /api/admin/payments              - List pembayaran
GET    /api/admin/payments/:id         - Detail pembayaran
POST   /api/admin/payments              - Input pembayaran
PUT    /api/admin/payments/:id/status  - Update status (confirm/reject)
GET    /api/admin/payments/settings    - Get payment settings
PUT    /api/admin/payments/settings    - Update payment settings
GET    /api/admin/payments/booking/:id - Pembayaran per booking
```

---

## 3. Invoice System

### Deskripsi
Sistem generate dan management invoice otomatis untuk setiap booking.

### Data Model

```typescript
interface Invoice {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  bookingId: string;
  clientId: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';

interface InvoiceSettings {
  id: string;
  vendorId: string;
  prefix: string;
  nextNumber: number;
  dueDays: number;
  taxPercentage: number;
  footerNotes?: string;
  logo?: string;
}
```

### Fitur

#### 3.1 Generate Invoice Otomatis
- Trigger saat booking dibuat
- Atau generate manual dari booking
- Format nomor invoice: `{PREFIX}-{YEAR}{MONTH}{SEQUENCE}`
  - Contoh: INV-2026030001, DTRNM-2026030001

#### 3.2 Detail Invoice
- **Header:**
  - Logo Studio
  - Nama Studio & Alamat
  - Invoice Number
  - Tanggal Terbit & Jatuh Tempo
  
- **Client Info:**
  - Nama Klien
  - Email
  - No. HP
  
- **Items:**
  - Paket (dari booking)
  - Add-ons (jika ada)
  - Diskon (jika ada)
  - Pajak (jika ada)
  
- **Summary:**
  - Subtotal
  - Diskon
  - Pajak
  - Total
  - Sudah Dibayar
  - Sisa Bayar
  
- **Footer:**
  - Rekening Pembayaran
  - Syarat & Ketentuan
  - Catatan

#### 3.3 Kirim Invoice
- Kirim via email (PDF attachment)
- Kirim via WhatsApp (link atau PDF)
- Copy manual link

#### 3.4 Status Invoice
- DRAFT → SENT (setelah dikirim)
- PARTIAL (ada partial payment)
- PAID (lunas)
- OVERDUE (melewati jatuh tempo)
- CANCELLED (dibatalkan)

#### 3.5 Pengaturan Invoice
- Prefix invoice (default: INV)
- Nomor berikutnya (auto-increment)
- Due days (hari jatuh tempo)
- Tax percentage
- Footer notes
- Logo

### API Endpoints

```
GET    /api/admin/invoices             - List invoice
GET    /api/admin/invoices/:id        - Detail invoice
POST   /api/admin/invoices             - Generate invoice
PUT    /api/admin/invoices/:id        - Update invoice
POST   /api/admin/invoices/:id/send    - Kirim invoice
GET    /api/admin/invoices/:id/pdf     - Generate PDF
PUT    /api/admin/invoices/:id/status - Update status
GET    /api/admin/invoices/settings   - Get settings
PUT    /api/admin/invoices/settings   - Update settings
```

---

## 4. Custom Form Fields

### Deskripsi
Sistem kustomisasi form booking publik yang memungkinkan vendor menyesuaikan field apa saja yang dibutuhkan.

### Data Model

```typescript
interface FormField {
  id: string;
  vendorId: string;
  label: string;
  fieldType: FieldType;
  placeholder?: string;
  options?: string[]; // untuk dropdown/radio/checkbox
  isRequired: boolean;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type FieldType = 
  | 'text'           // teks singkat
  | 'textarea'       // teks panjang
  | 'number'         // angka
  | 'date'           // tanggal
  | 'time'           // waktu
  | 'datetime'       // tanggal waktu
  | 'select'         // dropdown
  | 'radio'          // radio button
  | 'checkbox'       // checkbox
  | 'file'           // upload file
  | 'phone';         // nomor HP

interface FormSettings {
  id: string;
  vendorId: string;
  fields: FormField[];
  themeColor: string;
  successMessage: string;
  requireTerms: boolean;
  termsContent?: string;
  allowOnlinePayment: boolean;
  paymentGateway?: string;
}
```

### Fitur

#### 4.1 Pengaturan Field Form
- **Tambah Field:**
  - Label / Pertanyaan
  - Tipe Input (dropdown: teks, angka, tanggal, dll)
  - Placeholder
  - Options (untuk dropdown/radio - comma separated)
  - Wajib Diisi (toggle)
  - Urutan (drag & drop)
  
- **Default Fields (tidak bisa dihapus):**
  - Nama Lengkap (text, wajib)
  - No. HP (phone, wajib)
  - Email (email, wajib)
  - Pilihan Paket (select, wajib)
  - Jadwal Sesi (datetime, wajib)
  - Lokasi (text, wajib)

- **Custom Fields yang tersedia:**
  - Jumlah Orang (number)
  - Instagram (text)
  - Tema Warna (color)
  - Request Foto (textarea)
  - Referensi (file/image)
  - dll

#### 4.2 Urutan Field
- Drag & drop untuk mengubah urutan
- Tombol panah ↑↓ untuk reposition

#### 4.3 Preview Form
- Live preview real-time
- Tampilan mobile-responsive

#### 4.4 Pengaturan Tambahan
- **Theme Color**: Warna tema form
- **Pesan Sukses**: Pesan yang muncul setelah submit
- **Syarat & Ketentuan**: Toggle wajib setuj
- **Online Payment**: Integrasi payment gateway (opsional)

### API Endpoints

```
GET    /api/admin/form-fields          - List form fields
POST   /api/admin/form-fields           - Tambah field
PUT    /api/admin/form-fields/:id      - Update field
DELETE /api/admin/form-fields/:id      - Hapus field
PUT    /api/admin/form-fields/reorder - Reorder fields
GET    /api/admin/form-settings        - Get form settings
PUT    /api/admin/form-settings        - Update form settings
GET    /api/public/form/:vendorId      - Get form config (untuk client)
POST   /api/public/form/submit         - Submit booking dari form
```

---

## 5. Dashboard Analytics

### Deskripsi
Fitur analytics dan reporting untuk melihat tren bisnis, performa paket, dan statistik pendapatan.

### Data Model

```typescript
interface DashboardStats {
  totalClients: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  dpReceived: number;
  outstandingDp: number;
}

interface RevenueTrend {
  month: string;
  year: number;
  dpAmount: number;
  lunasAmount: number;
  totalAmount: number;
  bookingCount: number;
}

interface PackageStats {
  packageId: string;
  packageName: string;
  category: string;
  totalBookings: number;
  totalRevenue: number;
  percentage: number;
}

interface ClientStats {
  totalNewClients: number;
  returningClients: number;
  topClients: Client[];
}

interface BookingTimeline {
  date: string;
  bookings: number;
  revenue: number;
}
```

### Fitur

#### 5.1 Statistik Utama (Ringkasan)
- **Total Klien**: Jumlah klien terdaftar
- **Booking Bulan Ini**: Jumlah booking bulan berjalan
- **Pemasukan DP**: Total DP diterima bulan ini
- **Total Omset**: Total revenue (DP + Lunas)

#### 5.2 Tren Pemasukan (Chart)
- Grafik line/bar chart 6 bulan terakhir
- Breakdown: DP vs Pelunasan
- Filter: 3 bulan, 6 bulan, 1 tahun, custom

#### 5.3 Perbandingan Paket Terlaris (Chart)
- Pie/Donut chart
- Tampilkan persentase per kategori paket
- Tabel detail:
  - Nama Paket
  - Jumlah Booking
  - Total Pendapatan
  - Persentase

#### 5.4 Jadwal Sesi
- Calendar view bulan berjalan
- List upcoming bookings
- Filter: Minggu ini, Bulan ini

#### 5.5 Booking Terbaru
- 5-10 booking terbaru
- Info: Nama klien, Paket, Tanggal sesi, Lokasi, Status pembayaran

#### 5.6 Top Clients
- Klien dengan booking paling banyak
- Total spend per client

### API Endpoints

```
GET    /api/admin/dashboard/stats         - Statistik utama
GET    /api/admin/dashboard/revenue-trend - Tren pendapatan
GET    /api/admin/dashboard/package-stats - Statistik paket
GET    /api/admin/dashboard/timeline      - Jadwal sesi
GET    /api/admin/dashboard/recent        - Booking terbaru
GET    /api/admin/dashboard/clients       - Statistik klien
```

---

## Implementation Priority

| Priority | Feature | Estimasi |
|----------|---------|----------|
| 1 | Custom Form Fields + Paket Management | 2-3 minggu |
| 2 | Invoice System | 1-2 minggu |
| 3 | Pembayaran/DP Tracking | 1-2 minggu |
| 4 | Dashboard Analytics | 1 minggu |

---

## Tech Stack Notes

- **Frontend**: React 19, Tailwind CSS 4, Recharts (untuk charts)
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (existing)
- **File Storage**: Cloudinary (existing)
- **PDF Generation**: @react-pdf/renderer atau puppeteer
- **Email**: Nodemailer / Resend
- **WhatsApp**: WhatsApp Business API / twilio

---

## Mockup Links

- Form Builder: https://formbuilder.online/
- Invoice Templates: https://invoice-generator.com/
- Dashboard Examples: https://dribbble.com/search/dashboard-admin
