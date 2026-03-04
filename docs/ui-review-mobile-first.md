# UI Review Report — Mobile-First Analysis
**Platform:** Hafispace Admin Dashboard  
**Date:** 2026-03-04  
**Viewport tested:** Mobile 390×844 (iPhone 14 Pro) + Desktop 1440×900  
**Method:** Playwright MCP automated screenshots semua halaman admin

---

## 📊 Summary Score

| Halaman | Mobile | Desktop | Priority |
|---|---|---|---|
| Login | ✅ 9/10 | ✅ 9/10 | - |
| Dashboard | ⚠️ 7/10 | ✅ 9/10 | Medium |
| Events | 🔴 5/10 | ✅ 8/10 | **High** |
| Galleries | ⚠️ 6/10 | ✅ 8/10 | Medium |
| Packages | ✅ 8/10 | ✅ 9/10 | Low |
| Clients | ⚠️ 7/10 | ✅ 9/10 | Medium |
| Settings | ✅ 8/10 | ✅ 9/10 | Low |
| Event Detail | ⚠️ 7/10 | ✅ 9/10 | Medium |

---

## 🔴 Critical Issues (Harus Difix)

### UI-001 — Events Table Terpotong di Mobile
**Halaman:** `/admin/events`  
**Severity:** Critical  
**Platform:** Mobile only

**Problem:**  
Tabel booking di Events page menggunakan `<table>` HTML biasa dengan 8 kolom (checkbox, Client, Package, Session Date, Status, Dana Masuk, Galleries, Aksi). Di mobile 390px, kolom-kolom ini terpotong — user hanya bisa lihat kolom pertama sampai "SE DA..." yang terpotong. Tidak ada horizontal scroll indicator, user tidak tahu bisa scroll ke kanan.

**Screenshot:** `03-events-mobile.png`

**Solusi yang Direkomendasikan:**
```
Opsi A (Best): Ganti tabel dengan card-based list di mobile
- Setiap booking = 1 card dengan info esensial: nama, status, tanggal, action buttons
- Kolom detail (package, dana masuk, galleries) collapse/expandable

Opsi B (Quick): Tambah overflow-x: auto + scroll indicator
- Wrap table dengan div overflow-x-auto
- Tambah shadow gradient di kanan untuk indicate "ada lebih"
- Tambah touch-action: pan-x
```

**File yang perlu diubah:**  
`src/app/admin/events/page.tsx` atau `src/app/admin/events/_components/booking-table.tsx`

---

### UI-002 — Checkbox Terpotong di Galleries & Clients Mobile
**Halaman:** `/admin/galleries`, `/admin/clients`  
**Severity:** High  
**Platform:** Mobile only

**Problem:**  
Checkbox untuk select/bulk action terpotong di luar viewport (terlihat setengah checkbox di kanan card). Di Galleries, checkbox ada di pojok kanan card tapi terlalu mepet ke edge. Di Clients, checkbox sama persis terpotong di kanan row.

**Screenshot:** `04-galleries-mobile.png`, `06-clients-mobile.png`

**Solusi:**
```css
/* Pindahkan checkbox ke kiri card, atau pastikan ada padding-right yang cukup */
.card-container {
  padding-right: 16px; /* minimal 16px dari edge */
}

/* Atau gunakan relative positioning dengan right: 12px */
.checkbox-wrapper {
  position: absolute;
  top: 12px;
  right: 12px; /* jangan 0 */
}
```

---

## ⚠️ Medium Issues (Sebaiknya Difix)

### UI-003 — Dashboard Metric Cards Stacked Satu-Satu di Mobile
**Halaman:** `/admin`  
**Severity:** Medium  
**Platform:** Mobile only

**Problem:**  
4 metric cards (Total Omset, DP Bulan Ini, Booking Bulan Ini, Total Klien) ditampilkan stacked vertikal satu per satu di mobile. Ini menyebabkan user harus scroll jauh ke bawah hanya untuk lihat semua metrics. Di desktop sudah bagus (2×2 grid).

**Screenshot:** `02-dashboard-mobile.png`

**Solusi:**
```css
/* Ganti single column menjadi 2-column grid di mobile */
.metric-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 2 kolom di mobile */
  gap: 12px;
}

/* Desktop tetap 4 kolom */
@media (min-width: 1024px) {
  .metric-cards-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

### UI-004 — "Tambah Paket" Button Full-Width di Mobile (Kurang Ideal)
**Halaman:** `/admin/packages`  
**Severity:** Low-Medium  
**Platform:** Mobile only

**Problem:**  
Button "Tambah Paket" menggunakan full width di mobile (stretching dari kiri ke kanan). Secara UI ini tidak terlalu buruk, tapi kurang konsisten dengan desain button di halaman lain yang menggunakan `inline` width. Juga membuatnya terlihat seperti primary CTA yang dominan.

**Screenshot:** `05-packages-mobile.png`

**Solusi:**
```
Buat button width: fit-content, align ke kanan (konsisten dengan Create Event di Events page)
```

---

### UI-005 — Filter Events Terlalu Panjang di Mobile
**Halaman:** `/admin/events`  
**Severity:** Medium  
**Platform:** Mobile only

**Problem:**  
Filter section di Events page (Cari, Status, Sesi Dari, Sesi Sampai, Reset Filter) semua stacked vertikal mengambil banyak ruang di mobile. User harus scroll melewati semua filter sebelum bisa lihat data booking. Total filter area tingginya ~300px di mobile.

**Screenshot:** `03-events-mobile.png`

**Solusi:**
```
Opsi A: Collapsible filter panel
- Tampilkan hanya search bar + tombol "Filter ▼" 
- Klik tombol → expand filter options
- Tampilkan badge jumlah filter aktif

Opsi B: Bottom sheet filter
- Tombol "Filter" di top bar → buka bottom sheet dengan semua options
- Pattern umum di mobile apps
```

---

### UI-006 — Tren Pemasukan Chart Label X-Axis Terpotong di Mobile
**Halaman:** `/admin`  
**Severity:** Medium  
**Platform:** Mobile only

**Problem:**  
Chart "Tren Pemasukan" di dashboard mobile menampilkan label bulan di X-axis (Okt 25, Nov 25, Des 25, Jan 26, Feb 26, Mar 26) tapi terpotong atau terlalu rapat di mobile 390px. Label "Mar 26" terpotong di sisi kanan chart.

**Screenshot:** `02-dashboard-mobile.png`

**Solusi:**
```jsx
// Di Recharts, set margin kanan yang cukup dan rotate label jika perlu
<XAxis 
  dataKey="bulan" 
  tick={{ fontSize: 11 }}
  interval={0}
  angle={-30} // Rotate label sedikit di mobile
  textAnchor="end"
/>

// Atau gunakan abbreviated labels: "Okt", "Nov", dst
```

---

### UI-007 — Sidebar Navigation Tidak Ada Bottom Navigation di Mobile
**Halaman:** Semua halaman admin  
**Severity:** Medium  
**Platform:** Mobile only

**Problem:**  
Di mobile, navigasi hanya bisa diakses via hamburger menu (≡) di top-right. Ini adalah 2-tap navigation: tap hamburger → tap menu item. Untuk app yang sering digunakan di mobile, pattern yang lebih baik adalah **bottom navigation bar** dengan 5 items utama (Dashboard, Events, Galleries, Packages, Settings).

**Screenshot:** `02-dashboard-mobile.png`

**Solusi:**
```jsx
// Tambah fixed bottom navigation bar di mobile
// Hanya tampil di mobile (hidden di desktop)
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t lg:hidden z-50">
  <div className="flex justify-around items-center h-16">
    <BottomNavItem href="/admin" icon={<HomeIcon />} label="Dashboard" />
    <BottomNavItem href="/admin/events" icon={<CalendarIcon />} label="Events" />
    <BottomNavItem href="/admin/galleries" icon={<PhotoIcon />} label="Galleries" />
    <BottomNavItem href="/admin/packages" icon={<TagIcon />} label="Paket" />
    <BottomNavItem href="/admin/settings" icon={<SettingsIcon />} label="Settings" />
  </div>
</nav>

// Tambah padding-bottom di main content saat mobile
<main className="pb-16 lg:pb-0">
```

---

### UI-008 — Event Detail Page — Action Buttons Sempit di Mobile
**Halaman:** `/admin/events/[id]`  
**Severity:** Medium  
**Platform:** Mobile only

**Problem:**  
Di halaman detail booking, tombol-tombol aksi (status update, Bayar, dll) ditampilkan dalam row yang sempit di mobile. Tombol bisa terlalu kecil untuk di-tap (kurang dari 44px touch target yang direkomendasikan Apple/Google).

**Solusi:**
```css
/* Pastikan semua action buttons minimal 44px height */
.action-button {
  min-height: 44px;
  padding: 10px 16px;
}

/* Stack buttons vertikal di mobile jika ada lebih dari 2 */
@media (max-width: 640px) {
  .action-buttons-group {
    flex-direction: column;
    gap: 8px;
  }
}
```

---

## ✅ Yang Sudah Baik

### Login Page
- ✅ Layout centered yang clean, works perfectly di mobile
- ✅ Font size dan spacing yang nyaman
- ✅ "Encrypted connection" indicator di bawah — trust signal bagus

### Dashboard Desktop
- ✅ 4-column metric cards layout bersih
- ✅ Chart dan Paket Terlaris side-by-side rapi
- ✅ Sidebar navigation clear dengan section grouping

### Packages Page
- ✅ Card-based layout bekerja baik di mobile maupun desktop
- ✅ Category filter tabs menggunakan horizontal scroll yang rapi
- ✅ Informasi paket (harga, kuota, kategori, booking count) semua terbaca

### Settings Page
- ✅ List-based settings dengan deskripsi yang clear
- ✅ Cloudinary account form inline yang mudah diisi
- ✅ Consistent "Configure" CTA per section

### Clients Page Desktop
- ✅ Card layout dengan avatar, nama, HP, email — mudah dibaca
- ✅ "Select all" checkbox berfungsi baik di desktop

---

## 📋 Prioritas Fix

### Sprint 1 — Critical (1-2 hari)
| ID | Issue | Effort |
|---|---|---|
| UI-001 | Events table → card layout di mobile | Medium |
| UI-002 | Fix checkbox overflow di galleries & clients | Easy |
| UI-003 | Dashboard metric cards → 2-col grid mobile | Easy |

### Sprint 2 — UX Polish (2-3 hari)
| ID | Issue | Effort |
|---|---|---|
| UI-007 | Tambah bottom navigation bar mobile | Medium |
| UI-005 | Collapsible filter panel di Events | Medium |
| UI-006 | Fix chart label X-axis di mobile | Easy |
| UI-004 | Button width consistency | Easy |
| UI-008 | Touch target size untuk action buttons | Easy |

---

## 🎨 Saran Tambahan (Nice to Have)

1. **Dark mode support** — Tambah `prefers-color-scheme: dark` support
2. **Skeleton loading state** — Events table sudah punya "Loading bookings..." tapi bisa diganti skeleton UI yang lebih polished
3. **Pull-to-refresh** — Di mobile, swipe down untuk refresh data (UX pattern yang familiar)
4. **Haptic feedback** — Untuk PWA mode, tambah `navigator.vibrate()` pada action buttons
5. **Swipe to delete** — Di clients/galleries list, swipe left untuk reveal delete action (mobile UX pattern)
6. **Sticky header dengan summary** — Di Events, sticky header yang tetap tampil berisi total booking count saat scroll
7. **Empty state illustrations** — "Tidak ada sesi bulan ini" dan empty states lain bisa pakai ilustrasi yang lebih menarik daripada teks plain

---

## 🔧 Quick Fix Code Snippets

### Fix UI-002: Checkbox overflow (paling mudah)
```tsx
// Di galleries/clients card component
// Ganti: absolute right-0
// Dengan: absolute right-3 (atau right-4)
<div className="absolute top-3 right-3"> {/* bukan right-0 */}
  <input type="checkbox" ... />
</div>
```

### Fix UI-003: Dashboard 2-col grid mobile
```tsx
// Di dashboard metric cards wrapper
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
  {/* metric cards */}
</div>
```

### Fix UI-001: Events overflow-x scroll (quick fix sambil nunggu card refactor)
```tsx
// Wrap table dengan overflow container
<div className="overflow-x-auto -mx-4 px-4">
  <div className="min-w-[640px]">
    <table>...</table>
  </div>
</div>
```
