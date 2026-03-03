# Playwright MCP - Panduan Analisis Website

Dokumen ini berisi rincian lengkap penggunaan MCP Playwright untuk menganalisis website, termasuk tool yang tersedia, cara penggunaan, dan contoh analisis nyata pada Clientspace dan Hafiportrait Platform.

---

## Daftar Isi

1. [Tools yang Tersedia](#1-tools-yang-tersedia)
2. [Cara Penggunaan](#2-cara-penggunaan)
3. [Output Format](#3-output-format)
4. [Contoh Analisis - Clientspace](#4-contoh-analisis---clientspace)
5. [Contoh Analisis - Hafiportrait](#5-contoh-analisis---hafiportrait)
6. [Tips & Tricks](#6-tips--tricks)

---

## 1. Tools yang Tersedia

| Tool | Fungsi |
|------|--------|
| `playwright_browser_navigate` | Buka URL |
| `playwright_browser_snapshot` | Ambil snapshot halaman (accessibility tree) |
| `playwright_browser_click` | Klik element |
| `playwright_browser_type` | Ketik teks (per karakter) |
| `playwright_browser_fill_form` | Isi form field langsung |
| `playwright_browser_select_option` | Pilih dropdown |
| `playwright_browser_hover` | Hover element |
| `playwright_browser_drag` | Drag & drop |
| `playwright_browser_press_key` | Tekan keyboard (Enter, Escape, dll) |
| `playwright_browser_take_screenshot` | Screenshot halaman |
| `playwright_browser_evaluate` | Eksekusi JavaScript kustom |
| `playwright_browser_wait_for` | Tunggu text/element muncul |
| `playwright_browser_navigate_back` | Back sejarah browser |
| `playwright_browser_tabs` | Manage tabs (list, new, close, select) |
| `playwright_browser_network_requests` | Lihat network requests |
| `playwright_browser_console_messages` | Lihat console messages |
| `playwright_browser_handle_dialog` | Handle dialog/alert/prompt |
| `playwright_browser_file_upload` | Upload file |
| `playwright_browser_install` | Install browser |
| `playwright_browser_resize` | Resize window |
| `playwright_browser_close` | Tutup browser |

---

## 2. Cara Penggunaan

### 2.1 Navigasi ke URL

```
playwright_browser_navigate({
  url: "https://contoh.com/login"
})
```

### 2.2 Isi Form

```
playwright_browser_fill_form({
  fields: [
    { name: "Username", ref: "e17", type: "textbox", value: "dtrnm" },
    { name: "Password", ref: "e20", type: "textbox", value: "password123" }
  ]
})
```

### 2.3 Klik Element

```
playwright_browser_click({
  element: "Login button",
  ref: "e21"
})
```

### 2.4 Ambil Snapshot

```
playwright_browser_snapshot()
```

### 2.5 Tunggu Loading

```
playwright_browser_wait_for({ time: 3 })
```

### 2.6 Pindah Tab

```
playwright_browser_tabs({ action: "select", index: 1 })
```

### 2.7 Screenshot

```
playwright_browser_take_screenshot({
  type: "png",
  fullPage: true,
  filename: "screenshot.png"
})
```

---

## 3. Output Format

### 3.1 Snapshot Output

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - heading "Judul Halaman" [level=1] [ref=e3]
    - paragraph [ref=e4]: Deskripsi
  - generic [ref=e5]:
    - textbox "Username" [ref=e6]:
      - /placeholder: "Masukkan username"
    - textbox "Password" [ref=e7]:
      - /placeholder: "Masukkan password"
    - button "Login" [ref=e8] [cursor=pointer]
```

**Penjelasan:**
- `ref=X` = Unique identifier element
- `[level=1]` = Heading level (h1)
- `[cursor=pointer]` = Element bisa diklik
- `/placeholder` = Placeholder text
- `[selected]` = Option yang dipilih

### 3.2 Element Types

| Type | Deskripsi |
|------|-----------|
| `heading [level=N]` | Heading h1-h6 |
| `paragraph` | Text paragraf |
| `textbox` | Input field |
| `button` | Tombol |
| `link` | Link/anchor |
| `combobox` | Dropdown select |
| `checkbox` | Checkbox |
| `table` | Tabel |
| `row` | Baris tabel |
| `cell` | Cell tabel |
| `img` | Gambar |
| `navigation` | Navigasi |

---

## 4. Contoh Analisis - Clientspace

### 4.1 Halaman Login

**URL:** `https://clientspace.toolsverse.my.id/thisadmin/login.php`

```
Aksi: playwright_browser_navigate
URL: https://clientspace.toolsverse.my.id/thisadmin/login.php

Output Snapshot:
- heading "Clientspace" [level=1] [ref=e4]
- paragraph [ref=e5]: Studio Management Dashboard
- textbox [ref=e10] → Email / Username
- textbox [ref=e13] → Password
- button "Masuk Dashboard" [ref=e14]
```

### 4.2 Submit Login

```
Aksi: playwright_browser_fill_form
Fields:
- Email/Username: ref=e10 → "dtrnm"
- Password: ref=e13 → "dtrnmdtrnm"

Aksi: playwright_browser_click
Element: "Masuk Dashboard button" ref=e14

URL sekarang: https://clientspace.toolsverse.my.id/thisadmin/index.php
Page Title: Detranium Photography | Clientspace Admin
```

### 4.3 Dashboard - Menu Sidebar

```
Output Snapshot:
- navigation [ref=e5]:
  - paragraph [ref=e6]: Menu Utama
  - link "Dashboard" [ref=e7]
  - link "Daftar Booking" [ref=e10]
  - paragraph [ref=e13]: Manajemen
  - link "Daftar Paket" [ref=e14]
  - link "Form & Transaksi" [ref=e17]
  - paragraph [ref=e20]: Pengaturan
  - link "Profil" [ref=e21]
```

**Dashboard Stats:**
```
- heading "Selamat datang, Avie Detranium!" [level=2] [ref=e45]
- Total Klien: "17"
- Booking Bulan Ini: "6 Sesi"
- Pemasukan DP: "Rp 1.110.000"
- Total Omset: "Rp 3.670.000"
```

### 4.4 Daftar Booking

```
Aksi: playwright_browser_click
Element: "Daftar Booking menu" ref=e10

Output:
- heading "Daftar Booking" [level=2] [ref=e133]
- combobox [ref=e137]: Urutan (Acara Terbaru, Acara Terlama, dll)
- textbox [ref=e142]: "Cari nama klien..."
- table [ref=e145] dengan kolom:
  - "#"
  - "Klien & WhatsApp"
  - "Invoice"
  - "Sesi & Paket"
  - "Dana Masuk"
  - "Aksi"

Data booking pertama:
- cell: "Dinda"
- cell: "INV-49BE42"
- cell: "25 Apr 2026 PERSONAL - Gold"
- cell: "Rp 0"
- cell aksi: "    " (5 tombol aksi)
```

### 4.5 Expand Detail Booking

```
Aksi: playwright_browser_click
Element: "Expand button on first booking" ref=e157

Output detail:
- Waktu Sesi: "Saturday, 25 April 2026 (19:00)"
- Lokasi: "Cafe"
- Status Pembayaran: "Belum Ada Bayar"
```

### 4.6 Daftar Paket

```
Aksi: playwright_browser_click
Element: "Daftar Paket menu" ref=e14

Output:
- button "Lainnya 1" [ref=e646]
- button "PERSONAL 1" [ref=e647]
- button "PREWED 1" [ref=e648]
- button "WEDDING 1" [ref=e649]
- button "Tambah Paket Baru" [ref=e643]

Detail paket (contoh):
- heading "Paket Tws" [level=3] [ref=e656]
- Investasi: "Rp 150.000"
- Benefit Editing: "2 File Terpilih"
- Include Cetak: "4r - 2 PCS"
- button "Edit" [ref=e679]
- button "Hapus" [ref=e681]
```

### 4.7 Tambah Paket (Modal)

```
Aksi: playwright_browser_click
Element: "Tambah Paket Baru button" ref=e643

Output Modal:
- heading "Tambah Paket Baru" [level=3] [ref=e687]
- textbox [ref=e694] → "Nama Identitas Paket"
- application [ref=e698] → Rich Text Editor (TinyMCE)
  - toolbar: Bold, Italic, Bullet list, Numbered list
- spinbutton [ref=e741] → Kuota Edit
- textbox [ref=e747] → Harga Jual
- button "Batal" [ref=e750]
- button "Simpan" [ref=e751]
```

### 4.8 Form & Transaksi - Tab Menu

```
Aksi: playwright_browser_click
Element: "Form & Transaksi menu" ref=e17

Output: 4 Tab-button:
- button "Field Form" [ref=e765]
- button "Transaksi" [ref=e767]
- button "Syarat" [ref=e769]
- button "Tampilan" [ref=e771]
```

### 4.9 Tab Transaksi

```
Aksi: playwright_browser_click
Element: "Transaksi tab" ref=e767

Output:
- heading "% Persentase Minimal DP" [level=3]
- slider [ref=e877] → "30" (default 30%)
- textbox [ref=e884] → Rekening Pembayaran

Isi rekening: "BCA 1234567890 a.n Nama Anda"
```

### 4.10 Tab Syarat

```
Aksi: playwright_browser_click
Element: "Syarat tab" ref=e769

Output:
- heading "Syarat & Ketentuan (T&C)" [level=3]
- application [ref=e888] → TinyMCE Rich Text Editor

Isi default:
- heading "1. Ketentuan Pembayaran" [level=4]
  - "Pembayaran DP minimal 50% dari total harga."
  - "DP TIDAK BISA DITARIK KEMBALI (Hangus) bila terjadi pembatalan."
- heading "2. Keterlambatan" [level=4]
  - "Keterlambatan memotong waktu sesi foto Anda sendiri."
```

### 4.11 Tab Tampilan

```
Aksi: playwright_browser_click
Element: "Tampilan tab" ref=e771

Output:
- heading "Tema Warna Form" [level=3]
  - 6 button warna [ref=e958-e963]
  - textbox custom HEX [ref=e967] → "#1c858d"
- heading "Pesan Sukses (Setelah Submit)" [level=3]
  - textbox [ref=e972]: "Terima kasih! Booking Anda telah kami terima..."
```

### 4.12 Profil

```
Aksi: playwright_browser_click
Element: "Profil menu" ref=e21

Output:
- img [ref=e984] → Logo Studio
- heading "Detranium Photography" [level=3]
- paragraph: "@dtrnm"
- heading "Pemilik / Owner": "Avie Detranium"
- Email: "detranium@gmail.com" + indicator "Terverifikasi"
- No. Handphone: "82220008040"
- Instagram: "@detranium"
- checkbox "Pickspace AI - Face Detection" [ref=e1026]
- button "Edit Profil" [ref=e1029]

Riwayat Layanan:
- heading "omnispace" [level=4]
- Biaya: "Rp 1.350.000 / thn"
- Aktif Mulai: "23 Feb 2026"
- Berakhir: "23 Feb 2027"
```

### 4.13 Edit Profil (Modal)

```
Aksi: playwright_browser_click
Element: "Edit Profil button" ref=e1029

Output Modal:
- heading "Edit Profil Studio" [level=3]
- textbox [ref=e1068] → "Nama Studio" = "Detranium Photography"
- textbox [ref=e1072] → "Username" = "dtrnm"
- button "Choose File" [ref=e1080] → Logo
- textbox [ref=e1086] → "Email" = "detranium@gmail.com"
- textbox [ref=e1091] → "Instagram" = "detranium"
- textbox [ref=e1094] → "Password Baru" (placeholder: kosongkan jika tidak ingin mengubah)
- button "Batal" [ref=e1096]
- button "Simpan Perubahan" [ref=e1097]
```

### 4.14 Halaman Form Publik (Bizspace)

```
Aksi: playwright_browser_click
Element: "Form Anda link" ref=e39
Result: Tab baru terbuka

URL: https://clientspace.toolsverse.my.id/bizspace/?v=dtrnm&ft=urRgqFQAdtrnm

Aksi: playwright_browser_tabs({ action: "select", index: 1 })

Output Halaman Klien:
- heading "Detranium Photography" [level=1]
- heading "Informasi Pemesan" [level=3]
  - textbox [ref=e19] → "Siapa nama Anda?"
  - combobox [ref=e23]: "+62" (prefix HP)
  - textbox [ref=e24] → "812 3456 7890"
  
- heading "Detail Sesi Foto" [level=3]
  - combobox [ref=e33] → "-- Pilih Paket Foto --"
    Options: PERSONAL - Gold, PREWED - Essential Package, WEDDING - All in, Paket Tws, Paket Lainnya
  - textbox [ref=e37] → Jadwal Sesi
  - textbox [ref=e40] → "Nama Studio/Alamat"
  
- heading "Kebutuhan Lainnya" [level=3]
  - textbox [ref=e48] → "Jumlah orang"
  - textbox [ref=e51] → "Instagram"
  
- heading "Pembayaran DP" [level=4]
  - "Minimal DP (30%)"
  - "Rp 0"
  
- checkbox [ref=e64] → "Saya telah membaca dan menyetujui Syarat & Ketentuan..."
- button [ref=e67] → "Proses Booking Sekarang"
```

---

## 5. Contoh Analisis - Hafiportrait

### 5.1 Halaman Login

**URL:** `http://124.197.42.88:3000/login`

```
Aksi: playwright_browser_navigate
URL: http://124.197.42.88:3000/login

Output:
- heading "Hafiportrait" [level=1]
- paragraph: "Private Gallery Management"
- heading "Welcome back" [level=2]
- textbox [ref=e17] → "Username"
- textbox [ref=e20] → "Password"
- button "Sign in" [ref=e21]
```

### 5.2 Submit Login

```
Aksi: playwright_browser_fill_form
Fields:
- Username: ref=e17 → "nandika"
- Password: ref=e20 → "klp123"

Aksi: playwright_browser_click
Element: "Sign in button" ref=e21

Tunggu: playwright_browser_wait_for({ time: 3 })

URL sekarang: http://124.197.42.88:3000/admin
Page Title: Hafiportrait Platform
```

### 5.3 Dashboard Admin

```
Output:
- banner:
  - "Hafispace"
  - "Hafiportrait Photography"
  - button "Logout" [ref=e52]

- navigation [ref=e55]:
  - link "Dashboard" [ref=e56]
  - link "Events" [ref=e57]
  - link "Galleries" [ref=e58]
  - link "Clients" [ref=e59]
  - link "Settings" [ref=e60]

- Stats Cards:
  - "Active Bookings": "0"
  - "Total Bookings": "1"
  - "Galleries": "1"
  - "Clients": "1"

- Quick Actions:
  - link "Create Event" [ref=e91]
  - link "Manage Galleries" [ref=e92]
  - link "View Clients" [ref=e93]
  - link "Settings" [ref=e94]
```

### 5.4 Events (Booking)

```
Aksi: playwright_browser_click
Element: "Events menu" ref=e57
URL: /admin/events

Output:
- heading "Events" [level=1]
- button "Create Event" [ref=e104]
- Stats: Total Bookings: 1, Active: 0, Pending: 0, Completed: 1

Table columns:
- Client
- Package
- Session Date
- Status
- Galleries

Data event:
- "Lestari & Dani"
- "BK-WEDDING001"
- "Wedding Package"
- "18 Apr 2024"
- "COMPLETED"
- "1" (jumlah gallery)
```

### 5.5 Create Event (Modal)

```
Aksi: playwright_browser_click
Element: "Create Event button" ref=e104

Output Modal:
- heading "Create New Booking" [level=2]
- textbox [ref=e154] → "Client Name *"
- textbox [ref=e157] → "Phone *"
- textbox [ref=e160] → "Email"
- textbox [ref=e164] → "Session Date *"
- textbox [ref=e167] → "Location *"
- textbox [ref=e170] → "Package Name"
- combobox [ref=e173] → "Max Selections *" (40/80/120/160/200 photos)
- textbox [ref=e176] → "Notes"
- button "Cancel" [ref=e178]
- button "Create Booking" [ref=e179]
```

### 5.6 Galleries

```
Aksi: playwright_browser_navigate
URL: http://124.197.42.88:3000/admin/galleries

Output:
- heading "Galleries" [level=1]
- paragraph: "Curate and publish professional photo galleries for your clients."

Gallery Card:
- heading "Lestari Wedding"
- Client: "Lestari & Dani"
- Status: "DELIVERED"
- Stats: 6 photos, 4 selections, 74 views
- button "Manage Gallery" [ref=e111]
```

### 5.7 Manage Gallery (Modal)

```
Aksi: playwright_browser_click
Element: "Manage Gallery button" ref=e111

Output Modal:
- heading "Manage Gallery" [level=2]
- "Lestari Wedding"
- "Client: Lestari & Dani"
- "6 photos, 4 selections, 74 views"
- textbox [ref=e138] → "Client Gallery Link"
  - Value: "http://124.197.42.88:3000/gallery/abc123def456"
  - button "Copy" [ref=e139]
- Status buttons:
  - "DRAFT" [ref=e143]
  - "IN REVIEW" [ref=e144]
  - "DELIVERED" [ref=e145]
- button "Upload Photos" [ref=e147]
- button "Delete" [ref=e148]
- button "Cancel" [ref=e149]
- button "Save Changes" [ref=e150]
```

### 5.8 Clients

```
Aksi: playwright_browser_navigate
URL: http://124.197.42.88:3000/admin/clients

Output:
- heading "Clients" [level=1]
- paragraph: "Keep track of client information, bookings, and gallery access."

Client Card:
- Initial: "L"
- heading: "Lestari & Dani"
- Email: "lestari@example.com"
- Joined: "01 Maret 2026"
- Bookings: "1"
- button "View" [ref=e90]
```

### 5.9 Settings

```
Aksi: playwright_browser_navigate
URL: http://124.197.42.88:3000/admin/settings

Output:
- heading "Settings" [level=1]

Setting Cards:
1. "Studio Profile"
   - paragraph: "Update brand name, logo, and contact information."
   - button "Configure" [ref=e29]

2. "Access Control"
   - paragraph: "Manage admins, client invitations, and permissions."
   - button "Configure" [ref=e33]

3. "Notifications"
   - paragraph: "Configure email templates and delivery alerts."
   - button "Configure" [ref=e37]

4. "VIESUS Enhancement"
   - paragraph: "Enable automatic image enhancement using VIESUS technology."
   - button "Configure" [ref=e47]
```

### 5.10 Configure Studio Profile (Modal)

```
Aksi: playwright_browser_click
Element: "Configure" ref=e29

Output Modal:
- heading "Studio Profile" [level=2]
- textbox [ref=e52] → "Studio Name" = "Hafiportrait Photography"
- textbox [ref=e55] → "Phone" = "+6281234567890"
- textbox [ref=e58] → "Email" = "nandika@example.com"
- button "Save Changes" [ref=e60]

Cloudinary Accounts Section:
- heading "Cloudinary Accounts"
- Account:
  - "akun utama" + "Default"
  - "doweertbx"
  - button "Nonaktifkan"
  - button "Hapus"
- heading "Tambah Akun Cloudinary Baru" [level=3]
- textbox [ref=e82] → "Nama Akun"
- textbox [ref=e85] → "Cloud Name"
- textbox [ref=e88] → "API Key"
- textbox [ref=e91] → "API Secret"
- checkbox [ref=e93] → "Jadikan akun default"
- button "Tambah Akun" [ref=e95]
```

### 5.11 Client Gallery Page

```
Aksi: playwright_browser_navigate
URL: http://124.197.42.88:3000/gallery/abc123def456
Tunggu: playwright_browser_wait_for({ time: 2 })

Output:
- heading "Hafiportrait Photography"
- heading "Lestari Wedding" [level=1]
- link "Select 4" [ref=e10]
- paragraph: "Hai Lestari & Dani! Senang sekali bisa mengabadikan momen indah kalian."

Photo Tabs:
- button "All Photos6" [ref=e19]
- button "Editing List4" [ref=e20]

Photos (6 images):
- button [ref=e22] → C007BF6A-0412-4DFA-85E0-3E1281B08214.jpeg
- button [ref=e24] → 3630BFF7-A651-4565-855F-8E7978D391B0.jpeg
- button [ref=e26] → 92E9704D-5413-4882-9075-E65D277DA6CD.jpeg
- button [ref=e28] → 0F94AF96-BF52-429F-851D-CB010618C37A.jpeg
- button [ref=e30] → A03BFD3C-5C2E-4932-8FA6-72182400BDB5.jpeg
- button [ref=e32] → F17CA726-26BC-4D51-B740-DC04ED05A46F.jpeg
```

---

## 6. Tips & Tricks

### 6.1 Menemukan Element

1. **Gunakan snapshot** - Semua element memiliki `ref=X` yang unik
2. **Perhatikan hierarki** - Element bersarang dalam parent element
3. **Gunakan description** - Snapshot menyertakan deskripsi (button "Login", heading "Dashboard", dll)

### 6.2 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Element tidak ditemukan | Gunakan `playwright_browser_wait_for({ time: 2 })` untuk tunggu loading |
| Modal blocking click | Navigasi langsung ke URL atau close modal dulu |
| Dropdown tidak bisa diklik | Coba `playwright_browser_select_option` |
| Alert popup | Gunakan `playwright_browser_handle_dialog` |

### 6.3 Best Practices

1. **Selalu tunggu setelah navigasi** - `wait_for({ time: 2 })` sebelum snapshot
2. **Gunakan tab dengan bijak** - Buka link di tab baru jika perlu
3. **Cek console untuk error** - `playwright_browser_console_messages`
4. **Gunakan screenshot untuk debugging** - `playwright_browser_take_screenshot`

### 6.4 Workflow Analisis Standar

```
1. Navigasi ke URL awal
2. Ambil snapshot untuk lihat struktur
3. Isi form jika perlu login
4. Klik menu untuk navigasi
5. Ambil snapshot di setiap halaman
6. Eksplorasi modal/popup
7. Dokumentasikan temuan
8. Tutup browser di akhir
```

---

## Referensi

- Playwright Official Docs: https://playwright.dev/
- Accessibility Tree: https://playwright.dev/docs/accessibility-testing
