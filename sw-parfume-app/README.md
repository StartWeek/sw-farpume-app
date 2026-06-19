## Middleware Notes

Dokumen ini mencatat middleware yang saat ini dipakai di aplikasi.

### 1) Middleware Custom

- `request.signature` -> `App\Http\Middleware\VerifyRequestSignature`
	- Fungsi: validasi header request security (`X-Timestamp`, `X-Nonce`, `X-Signature`), cek toleransi waktu, dan anti replay (nonce cache).

- `sql.injection.guard` -> `App\Http\Middleware\PreventSqlInjection`
	- Fungsi: deteksi pola SQL injection pada input request (query/body) dengan regex guard.
	- Konfigurasi pattern & whitelist field ada di `config/security_guards.php`.

- `xss.guard` -> `App\Http\Middleware\PreventXss`
	- Fungsi: deteksi pola XSS pada input request (mis. `<script>`, `javascript:`, inline event handler).
	- Konfigurasi pattern & whitelist field ada di `config/security_guards.php`.

### 2) Middleware Web Global

- `App\Http\Middleware\HandleInertiaRequests`
	- Didaftarkan di web middleware stack pada `bootstrap/app.php`.

### 3) Middleware Bawaan Laravel yang Dipakai di Route

- `guest`
	- Dipakai pada grup route autentikasi guest (halaman/login process).

- `auth`
	- Dipakai pada grup route admin (`/admin/*`).

- `throttle`
	- `throttle:5,1` pada `POST /login`
	- `throttle:20,1` pada `POST /admin/logout`
	- `throttle:60,1` pada `GET /admin/examples/async-options`

### 4) Endpoint yang Dilindungi Security Guard

- `POST /login`
	- Middleware: `request.signature`, `sql.injection.guard`, `xss.guard`, `throttle:5,1`

- `POST /admin/logout`
	- Middleware: `request.signature`, `sql.injection.guard`, `xss.guard`, `throttle:20,1`

- `GET /admin/examples/async-options`
	- Middleware: `request.signature`, `sql.injection.guard`, `xss.guard`, `throttle:60,1`

### 5) File Referensi

- `bootstrap/app.php`
- `routes/web.php`
- `app/Http/Middleware/VerifyRequestSignature.php`
- `app/Http/Middleware/PreventSqlInjection.php`
- `app/Http/Middleware/PreventXss.php`
- `config/security_guards.php`

## AI Quick Context (Base Project)

Bagian ini dibuat untuk membantu AI/dev baru memahami fondasi project dengan cepat.

### 1) Stack Utama

- Backend: Laravel 12 (`laravel/framework:^12.51`) + PHP `^8.2`
- Frontend: Inertia.js + React 19 + Vite 7
- Styling: Tailwind CSS 4
- HTTP Client frontend: Axios
- Routing JS helper: Ziggy

### 2) Struktur Folder Kunci

- `app/Http/Controllers` -> logic endpoint/controller Laravel
- `app/Http/Middleware` -> middleware custom security dan Inertia
- `routes/web.php` -> route web utama (guest/auth/admin)
- `resources/js` -> source frontend React + Inertia
- `resources/views/app.blade.php` -> root Blade host untuk Inertia app
- `config/security_guards.php` -> konfigurasi pattern + whitelist SQL/XSS guard
- `database/seeders` -> seeder data awal

### 3) Arsitektur Request Frontend-Backend

- Frontend menambahkan security header pada request Axios (`X-Timestamp`, `X-Nonce`, `X-Signature`) lewat `resources/js/bootstrap.js`.
- Backend memverifikasi signature + timestamp + nonce replay di middleware `VerifyRequestSignature`.
- Endpoint sensitif juga memakai SQL guard, XSS guard, dan throttle limiter.

### 4) Alur Auth Singkat

- Guest:
	- `GET /login`
	- `POST /login` (dilindungi signature/sql/xss/throttle)
- Auth (admin):
	- `POST /admin/logout` (dilindungi signature/sql/xss/throttle)
	- route admin lain ada di prefix `/admin`

### 5) Command Harian

- Install dependency:
	- `composer install`
	- `npm install`
- Jalankan mode dev full stack:
	- `composer run dev`
- Build frontend:
	- `npm run build`
- Testing:
	- `composer run test`
- Seeder:
	- `php artisan db:seed`

### 6) Catatan Penting Untuk AI

- Jangan ubah middleware security tanpa cek dampak login/logout dan endpoint async.
- Jika update pattern SQL/XSS, edit di `config/security_guards.php` (bukan hardcode di middleware).
- Untuk perubahan route sensitif, pastikan middleware minimum tetap ada:
	- `request.signature`
	- `sql.injection.guard`
	- `xss.guard`
	- `throttle`

### 7) Aturan Reuse Komponen (Wajib Untuk AI)

- Prinsip utama: gunakan komponen yang sudah tersedia terlebih dahulu.
- Buat komponen baru hanya jika benar-benar tidak ada komponen existing yang bisa dipakai/di-extend.

Checklist sebelum membuat komponen baru:

- Cek folder komponen berikut terlebih dahulu:
	- `resources/js/components/common`
	- `resources/js/components/input`
	- `resources/js/components/layouts`
	- `resources/js/components/ui`
	- `resources/js/components/common/DataTable.jsx`
	- `resources/js/components/common/Modal.jsx`
- Jika kebutuhan mirip >= 70% dengan komponen existing, lakukan extend via props, bukan duplikasi file.
- Hindari membuat varian komponen dengan fungsi sama tapi nama berbeda.
- Pastikan style mengikuti pola Tailwind dan naming yang sudah dipakai di project.

Kapan boleh membuat komponen baru:

- Tidak ada komponen existing yang memenuhi kebutuhan inti.
- Perubahan pada komponen lama akan merusak banyak pemakaian existing.
- Komponen baru bersifat reusable dan kemungkinan dipakai lebih dari satu halaman.

Standar saat membuat komponen baru:

- Lokasi file sesuai kategori (`common`, `input`, `layouts`, atau `ui`).
- API props jelas dan konsisten dengan pola komponen existing.
- Nama komponen deskriptif dan tidak ambigu.
- Tambahkan contoh pemakaian minimal di halaman contoh bila relevan (`admin/examples/ComponentShowcase`).

Tujuan aturan ini:

- Mengurangi duplikasi komponen.
- Mempermudah maintenance dan refactor.
- Menjaga konsistensi UI/UX di seluruh aplikasi.

- `resources/js/components/menu/index.jsx`
ini adalah folder menu untuk kebutuhan sidebar
