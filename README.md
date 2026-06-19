# STARWEK ERP PARFUM

Aplikasi web ERP untuk distributor/grosir parfum. Frontend memakai React + Tailwind CSS, sedangkan backend sekarang memakai template Laravel 12 + Inertia.js dari `template-admin-laravel-inertiajs`.

Backend Express lama masih disimpan di `server-express-backup` sebagai referensi migrasi endpoint ERP.

## Menjalankan Backend

```bash
cd server
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

Backend berjalan di `http://127.0.0.1:8000`.

Untuk memakai MySQL, isi konfigurasi database di `server/.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=starwek_erp
DB_USERNAME=root
DB_PASSWORD=
```

Untuk menjalankan template Laravel lengkap beserta asset Inertia/Vite:

```bash
cd server
composer run dev
```

## Menjalankan Frontend

```bash
cd client
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173`.

Jika frontend perlu mengarah ke backend Laravel, set `VITE_API_URL=http://127.0.0.1:8000/api`.

## Modul

- Dashboard Owner
- Master Wangi, Brand, Barang/Bibit, Gudang, Supplier, Customer, Sales, User
- Stok Gudang, Mutasi Stok, Stok Menipis
- Pembelian Supplier dengan konversi ML dan hutang tempo
- POS Retail/Grosir dengan validasi stok dan piutang tempo
- Keuangan Hutang/Piutang dan pembayaran
- Laporan pembelian, penjualan, stok, mutasi, hutang, piutang, laba kotor

## Akun Seed

- Owner: `owner` / `password`
- Admin: `admin` / `password`
- Gudang: `gudang` / `password`
- Kasir: `kasir` / `password`
