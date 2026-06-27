# ERP Parfum

Aplikasi ERP untuk distributor/wholesaler parfum — Laravel 12 + Inertia.js + React 19.

---

## Daftar Isi

1. [Kebutuhan System](#kebutuhan-system)
2. [Setup Pertama Kali](#setup-pertama-kali)
3. [Setting Database](#setting-database)
4. [Menjalankan Project](#menjalankan-project)
5. [Build Production](#build-production)
6. [Testing](#testing)
7. [Akun Default](#akun-default)
8. [Arsitektur Singkat](#arsitektur-singkat)
9. [Aturan Reuse Komponen](#aturan-reuse-komponen)

---

## Kebutuhan System

Sebelum mulai, pastikan sudah terinstall:

| Tools | Versi Minimal |
|-------|--------------|
| PHP | 8.2+ |
| Composer | 2.x |
| Node.js | 18+ |
| npm | 9+ |
| MySQL / MariaDB | 5.7+ (atau SQLite untuk development) |

Ekstensi PHP yang dibutuhkan:
```
bcmath, ctype, curl, fileinfo, json, mbstring, openssl, pdo, tokenizer, xml
```

---

## Setup Pertama Kali

Clone project lalu jalankan satu perintah:

```bash
cd sw-parfume-app
composer run setup
```

Perintah `setup` akan otomatis menjalankan:

1. `composer install` — install dependency PHP
2. Copy `.env.example` → `.env` (jika belum ada)
3. `php artisan key:generate` — generate APP_KEY
4. `php artisan migrate --force` — buat tabel di database
5. `npm install` — install dependency frontend
6. `npm run build` — build frontend production

> **Alternatif manual** — jika `composer run setup` gagal, jalankan satu per satu:
> ```bash
> cp .env.example .env
> composer install
> php artisan key:generate
> npm install
> # Setting database dulu (lihat bagian Setting Database)
> php artisan migrate
> php artisan db:seed
> npm run build
> ```

---

## Setting Database

### A. Pakai SQLite (paling simpel — untuk development)

1. Buka file `.env`
2. Pastikan baris berikut:
   ```env
   DB_CONNECTION=sqlite
   DB_DATABASE=database/database.sqlite
   ```
3. Buat file SQLite kosong:
   ```bash
   touch database/database.sqlite
   ```
4. Jalankan migrasi + seeder:
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

### B. Pakai MySQL (untuk production / development serius)

1. Buat database di MySQL:
   ```sql
   CREATE DATABASE sw_erp_parfum CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Buka file `.env`, ubah jadi:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=sw_erp_parfum
   DB_USERNAME=root
   DB_PASSWORD=password_kamu
   ```
3. Jalankan migrasi + seeder:
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

---

## Menjalankan Project

### Mode Development (full stack — Laravel + Vite + Queue + Log)

```bash
composer run dev
```

Ini akan menjalankan 4 service sekaligus dalam 1 terminal:

| Service | Port / Deskripsi |
|---------|-----------------|
| Laravel server | `http://127.0.0.1:8000` |
| Vite HMR (hot reload) | Auto-reload frontend |
| Queue listener | Proses job background |
| Log viewer (pail) | Lihat log real-time |

### Hanya Frontend (Vite dev server)

```bash
npm run dev
```

> Pastikan Laravel server sudah berjalan di terminal lain: `php artisan serve`

### Hanya Backend

```bash
php artisan serve
```

Buka browser ke **http://127.0.0.1:8000**

---

## Build Production

```bash
npm run build
```

Output ada di folder `public/build/`. Setelah build, deploy seluruh folder project ke server production.

Untuk production, pastikan `.env` sudah disetting:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://domain-kamu.com
```

---

## Testing

Jalankan semua test (pakai SQLite :memory: — tidak perlu database terpisah):

```bash
composer run test
```

Test spesifik:

```bash
php artisan test --filter=NamaTest
```

---

## Akun Default

Setelah `php artisan db:seed`, tersedia akun:

| Username | Password | Role |
|----------|----------|------|
| `sw` | `startw33k` | superadmin (akses semua menu) |
| `testuser` | `password` | admin (akses terbatas) |

---

## Arsitektur Singkat

### Stack

| Layer | Teknologi |
|-------|----------|
| Backend | Laravel 12, PHP 8.2+ |
| Frontend | Inertia.js 2, React 19, Vite 7 |
| CSS | Tailwind CSS 4 |
| Icons | @tabler/icons-react |
| State | Zustand |
| Table | @tanstack/react-table |
| Toast | react-hot-toast |
| PDF | barryvdh/laravel-dompdf |
| Excel | maatwebsite/excel |

### Alur Request

```
Browser → Laravel Route → Middleware → Controller → Service → Model → Database
                ↓
         Inertia::render('Page', props)
                ↓
         React SPA (app.jsx → Page Component)
```

### Konvensi Tabel Database

| Prefix | Arti | Contoh |
|--------|------|--------|
| `tm_*` | Master data | `tm_barang_bibit`, `tm_brand`, `tm_users` |
| `tt_*` | Transaksi | `tt_stok_gudang`, `tt_pembelian`, `tt_mutasi_stok` |
| `tp_*` | System parameter | `tp_system`, `tp_app_settings` |

### Struktur Folder Penting

```
sw-parfume-app/
├── app/
│   ├── Http/Controllers/   # Controller (thin — logic di Service)
│   ├── Http/Middleware/    # Middleware custom (signature, SQL guard, XSS guard)
│   ├── Models/             # Eloquent Models
│   └── Services/           # Business logic (BusinessService = file paling penting)
├── database/
│   ├── migrations/         # Skema database
│   └── seeders/            # Data awal
├── resources/
│   ├── js/                 # Frontend React + Inertia
│   │   ├── admin/business/ # Halaman modul bisnis
│   │   ├── components/     # Komponen reusable
│   │   │   ├── common/     # DataTable, Modal, Button
│   │   │   ├── input/      # AsyncSelect, ImageUpload
│   │   │   ├── layouts/    # ProtectedLayout, PublicLayout
│   │   │   └── ui/         # Avatar, Badge, Progress
│   │   └── store/          # Zustand stores
│   └── views/              # Blade templates (hanya app.blade.php)
├── routes/web.php          # Semua route web
├── public/build/           # Output frontend setelah build
└── .env                    # Konfigurasi environment
```

### Middleware Security

4 middleware custom terdaftar:

| Middleware | Fungsi |
|-----------|--------|
| `request.signature` | Validasi header `X-Timestamp`, `X-Nonce`, `X-Signature` + anti-replay |
| `sql.injection.guard` | Deteksi pola SQL injection di input |
| `xss.guard` | Deteksi pola XSS di input |
| `menu.access` | Cek hak akses menu user |

Pattern security bisa diedit di `config/security_guards.php`.

---

## Aturan Reuse Komponen

**Gunakan komponen yang sudah ada dulu.** Buat komponen baru hanya jika benar-benar berbeda.

Folder komponen:
- `resources/js/components/common/` — DataTable, Modal, Button, ConfirmDialog
- `resources/js/components/input/` — AsyncSelectInput, ImageUpload, dsb
- `resources/js/components/layouts/` — ProtectedLayout, PublicLayout, Sidebar
- `resources/js/components/ui/` — Avatar, Badge, Progress, Table

Jika komponen existing ≥70% sesuai, **extend via props**, jangan duplikasi.
