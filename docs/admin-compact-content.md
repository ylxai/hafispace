# Admin Dashboard Compact Content Plan

> Disimpan: 16 Maret 2026
> Status: Brainstorming - Perlu Implementasi

---

## Overview

Dokumen ini berisi rencana untuk membuat content di setiap tab admin dashboard menjadi lebih compact dan efisien dalam penggunaan space.

---

## Opsi Compact Content per Tab

### 1. Dashboard (Home)

**Metrics Cards**
- Layout: Grid 2x2
- Items:
  - Total Events (bulan ini)
  - Revenue (bulan ini)
  - Galeri Aktif
  - Klien Baru
- Style: Icon + number besar + label kecil

**Quick Actions**
- 2 tombol utama: "Tambah Event", "Lihat Gallery"
- Posisi: Di bawah metrics cards

**Recent Activity**
- 3-5 item terbaru
- Format: "Event X dibuat oleh Client Y - 2 jam lalu"
- Link ke detail page

---

### 2. Events Tab

**Table View**
- Kolom: Klien | Tanggal | Paket | Status | Actions
- Row height: 48px (compact)
- Font size: 13px

**Filters Inline**
- Posisi: Di atas table
- Dropdown: Status (All, Pending, Completed, Cancelled)
- Date range picker

**Bulk Actions**
- Checkbox di setiap row
- Action dropdown: "Delete Selected", "Export", dll

---

### 3. Galleries Tab

**Grid Cards**
- Thumbnail: 120x80px
- Info: Client name, Date, Photo count (badge)
- Status badges: "Selected", "Processing", "Completed"
- Hover actions: Edit, View, Delete

**Alternatif: List View**
- Thumbnail kecil: 60x40px
- Info lebih compact
- Toggle view mode

---

### 4. Clients Tab

**List with Avatar**
- Avatar: 32px circle
- Kolom: Nama | Email | Total Events | Last Contact
- Row height: 56px

**Quick Search**
- Inline search bar di atas list
- Real-time filtering

**Expandable Row**
- Klik row → expand detail
- Shows: Phone, Address, Notes, Related Events

---

### 5. Packages Tab

**Compact Cards**
- Layout: Grid 3-4 columns
- Info: Nama paket, Harga (bold), Included items (icon list)
- Badge: "Popular", "New"

**Toggle Edit Mode**
- Inline edit tanpa modal
- Save/Cancel buttons muncul saat edit mode

---

### 6. Settings Tab

**Accordion Sections**
- Studio Profile
- Form Booking Fields
- Notifications
- Access Control
- Viesus Enhancement
- Cloudinary Accounts
- Custom Fields
- Default behavior: Semua collapsed, user klik untuk expand

**Compact Form**
- Padding: 16px (bukan 24px)
- Label: Smaller font (12px)
- Input height: 36px
- Group related fields dalam section

---

## Additional Compact Patterns

### 1. Text Truncation
```
Long description → "Lorem ipsum dolor sit amet..." 
Tooltip on hover → show full text
```

### 2. Pagination
- Jika >10 items: numbered pagination
- Page size: 10/25/50 options

### 3. Skeleton Loaders
- Tampilkan saat data loading
- Match table/card layout

### 4. Empty States
- Ilustrasi + title + description + CTA button
- Contoh: "Belum ada gallery" → "Buat Gallery Baru"

---

## Implementation Checklist

- [ ] Dashboard - Metrics cards grid
- [ ] Dashboard - Quick actions buttons
- [ ] Dashboard - Recent activity list
- [ ] Events - Compact table view
- [ ] Events - Inline filters
- [ ] Events - Bulk actions
- [ ] Galleries - Grid cards (thumbnail + info)
- [ ] Galleries - Status badges
- [ ] Galleries - Hover actions
- [ ] Clients - Avatar list view
- [ ] Clients - Inline search
- [ ] Clients - Expandable rows
- [ ] Packages - Compact cards grid
- [ ] Packages - Inline edit mode
- [ ] Settings - Accordion sections
- [ ] Settings - Compact forms
- [ ] Global - Skeleton loaders
- [ ] Global - Empty states
- [ ] Global - Text truncation with tooltip

---

## Notes

- Pertimbangkan mobile-first: 1 column di mobile, 2-4 di desktop
- Gunakan consistent spacing: 8px, 16px, 24px
- Prioritaskan information hierarchy: yang penting harus visible tanpa scroll