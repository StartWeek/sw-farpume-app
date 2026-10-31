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
10. [Kode Barcode Barang](#kode-barcode-barang)

---

## Status Master Data

Form dan tabel Brand, Barang Bibit/Absolute, Gudang, Supplier, Customer,
Sales, Botol Kemasan, dan Botol Kosong tidak menampilkan pilihan status.
Data baru otomatis berstatus AKTIF di server. Mengedit data tidak mengubah
status yang sudah tersimpan; data lama yang NONAKTIF tidak diaktifkan massal.

## Pembayaran Sisa DP dan Tempo

Pada riwayat Pembelian dan Penjualan, transaksi DP menampilkan **Bayar Sisa DP**
dan form **Pembayaran Sisa DP**; transaksi TEMPO menampilkan **Bayar Tempo**
dan form **Pembayaran Tempo**. Keduanya hanya tersedia saat masih ada sisa.
Isi seluruh sisa untuk melunasi, atau sebagian untuk mencicil. Pembayaran
mengurangi sisa hutang/piutang setelah disetujui di Validasi.
Tabel riwayat menampilkan kolom **Metode Bayar** (Uang Muka / DP, Tempo,
Tunai, Transfer, atau Cash + Transfer) dan **Status** agar jenis pembayaran terlihat langsung.
Untuk DP, kolom Metode Bayar juga menampilkan **DP awal** beserta nominalnya.
Modal **Pembayaran Sisa DP** menampilkan DP awal di atas sisa tagihan.
Database menyimpan metode DP sebagai TEMPO; label riwayat mengenali DP
dari `jumlah_bayar` awal yang lebih dari nol. Pembayaran cicilan berikutnya
tidak mengubah nilai awal tersebut, sehingga tempo yang dicicil tetap berlabel tempo.

## Persetujuan Validasi Terpilih

Detail barang pada modal Validasi memisahkan jumlah, isi per botol untuk
BOTOL ISI, total cairan dalam ML, harga per satuan, dan subtotal.
Isi per botol dihitung dari total cairan/jumlah pada snapshot transaksi,
bukan kapasitas master terbaru; botol kosong tidak diberi label cairan.

Centang pengajuan Menunggu pada menu Validasi Transaksi, atau pilih semua
pengajuan Menunggu di halaman yang terlihat, lalu klik **Setujui Terpilih**
dan konfirmasi. Pilihan dikosongkan saat halaman/filter berubah.
Maksimal 50 pengajuan diproses dari ID paling awal, dengan pemeriksaan akses,
stok, saldo, dan status untuk tiap transaksi. Transaksi yang gagal tidak
membatalkan transaksi lain; hasil menampilkan nomor berhasil dan alasan gagal.
Setelah selesai, notifikasi menampilkan jumlah disetujui dan gagal.
Jika ada yang gagal, notifikasi mengarahkan ke rincian kegagalan di halaman.
Pengajuan gagal karena stok/saldo tetap Menunggu. Pengajuan yang sudah diproses
tidak diposting ulang. Penolakan tetap dilakukan satu per satu.

## Membaca Laporan Stok

Master Barang Bibit/Absolute menampilkan **Stok Saat Ini (ML)**: total stok
yang sudah tercatat dari seluruh gudang dan varian botol untuk tiap barang.
Pengajuan yang belum disetujui tidak dihitung. Barang tanpa catatan stok
ditampilkan sebagai **0 ML, Habis**. Rincian per gudang tetap di laporan stok.
Form master Bibit/Absolute hanya menyediakan Gudang Cairan yang aktif
(tipe BIBIT); gudang tipe BOTOL digunakan untuk master Botol Kosong.

Filter **Ada Stok** menampilkan jumlah lebih dari nol, **Stok Habis**
menampilkan jumlah nol, dan **Semua stok** menampilkan keduanya.
Aturan ini berlaku untuk cairan (ML) dan botol kosong (PCS), termasuk
ekspor PDF/Excel. Filter tidak lagi membandingkan jumlah dengan minimum stok.
Stok Habis hanya menampilkan catatan stok yang bernilai nol, bukan barang
yang belum pernah memiliki catatan stok gudang.

## Pagination Laporan dan Ukuran Tombol

Laporan Laba Kotor menonjolkan keuntungan untuk seluruh periode/filter:
**penjualan setelah diskon - modal barang terjual (HPP) = laba kotor**.
Tombol **Hari Ini** mengisi kedua tanggal dengan tanggal operasional toko;
klik **Cari Laporan** untuk menerapkan. Untuk total keuntungan harian toko,
gunakan satu tanggal dan kosongkan filter lainnya. Periode beberapa hari
menampilkan total periode, bukan rata-rata harian. Kartu ringkasan memakai
latar dan teks standar; rugi kotor ditandai label dan angka negatif.
Filter Laba Kotor hanya tanggal dari/sampai, gudang, dan tipe penjualan.
Parameter filter lama yang dihapus tidak membatasi hasil atau ekspor laporan ini.
Laba kotor belum dikurangi listrik, gaji, sewa, dan biaya operasional, serta
termasuk penjualan yang belum lunas; bukan laba bersih atau uang kas diterima.
Diskon sudah termasuk dalam nilai penjualan dan tidak perlu dikurangi lagi.
Tabel dan PDF/Excel laba kotor memakai kolom ringkas tanggal, nomor transaksi,
customer, penjualan setelah diskon, modal barang, dan laba kotor.
Penjelasan tambahan disimpan dalam **Cara baca**, tertutup secara default
agar ringkasan utama tetap sederhana.

Barang Summary adalah rekap pergerakan stok per barang, gudang, dan varian:
**stok awal + masuk - keluar = stok akhir** selama periode terpilih.
Cairan menggunakan ML, sedangkan botol kosong menggunakan PCS.
Semua laporan hanya menampilkan filter saat menu dibuka: backend memeriksa
keberadaan data sesuai periode/filter awal dengan `EXISTS`, tanpa memuat baris,
total, rekap, atau tabel tambahan. Notifikasi **Laporan tersedia** atau
**Laporan tidak tersedia** muncul saat membuka menu dan setelah Reset.
Notifikasi tersedia memakai centang hijau, sedangkan tidak tersedia memakai
silang merah, termasuk setelah Cari Laporan.
Pemeriksaan juga mencakup botol kosong dan histori saldo untuk laporan terkait,
tanpa menjalankan agregasi summary. Hasil kosong bukan berarti tidak ada data
di periode lain; ubah periode/filter lalu cari ulang.
Tekan **Cari Laporan** untuk memuat hasil dengan pagination 10/25/50 baris.
Filter tanggal awal memakai tanggal operasional toko, bukan tanggal perangkat;
Laporan Stok tidak memakai batas tanggal.
Reset mengosongkan hasil dan kembali ke periode operasional. Pencarian dengan tanggal dikosongkan
tetap mendukung seluruh periode. Periode ekspor mengikuti filter yang diterapkan,
bukan perubahan form yang belum dicari.
Filter tanggal tidak valid menampilkan pesan; hasil kosong menampilkan panduan,
bukan dianggap kegagalan sistem.
Dropdown Barang, Supplier, Customer, Gudang, dan Botol memakai pencarian server:
ketik minimal satu karakter, permintaan ditunda 300 ms, maksimal 25 pilihan
per pencarian. Perjelas nama/kode jika pilihan belum muncul. Membuka halaman
tidak mengambil seluruh master; hanya pilihan yang sudah terpilih dikirim
agar label filter tetap terbaca. Pencarian pilihan memakai hak akses laporan
yang sama dan tidak menjalankan query laporan.
Khusus Gudang, membuka dropdown langsung memuat maksimal 25 pilihan aktif;
ketik nama atau kode gudang untuk mempersempit hasil. Tidak ada permintaan
dropdown Gudang saat halaman baru dibuka.
Laporan Kas menampilkan kartu Saldo Awal, Kas Masuk, Kas Keluar, dan Saldo Akhir
untuk seluruh hasil filter. Jika jenis kas dibatasi, saldo tetap saldo toko
pada transaksi pertama/terakhir yang cocok, bukan saldo khusus jenis kas.
Periode tetap bisa diubah; hasil kosong tidak otomatis berarti stok gudang habis.
Gunakan Laporan Stok untuk saldo saat ini dan Mutasi Stok untuk rincian per transaksi.

- Semua 11 jenis laporan menggunakan pagination di database: **10 baris**
  secara default, dengan pilihan **25** atau **50** baris per tabel.
  Backend menolak ukuran lain dan nomor halaman yang tidak valid.
- Tabel cairan/transaksi menggunakan `page`, tabel stok/summary botol kosong
  menggunakan `botol_page`, dan rekap customer/supplier menggunakan
  `groups_page`. Navigasi mempertahankan filter dan halaman tabel lainnya.
  Mengubah ukuran halaman atau mencari ulang mengembalikan halaman ke awal.
- Total, grand total, saldo awal/akhir kas, dan total botol kosong dihitung
  untuk **seluruh data sesuai filter**, bukan hanya halaman yang sedang dibuka.
  Summary barang menggabungkan saldo aktif dan histori di database; backend
  tidak memuat seluruh histori sebagai model untuk halaman laporan.
- Ekspor PDF/Excel tetap berisi seluruh hasil filter, terlepas dari pagination.
  Ekspor sinkron masih memuat seluruh hasil untuk pembuatan dokumen; pagination
  membatasi data halaman, bukan ukuran atau biaya pembuatan ekspor.
- Tombol aksi bersama memakai ukuran `sm` secara default, font 14 px, dan
  tinggi minimum 40 px. Tombol ikon tabel dan pagination memakai ukuran
  40 x 40 px. Ukuran `md`/`lg`/`xl` tetap tersedia untuk kontrol yang sengaja
  lebih besar.
- Uji regresi pagination: `rtk php artisan test --filter=ReportPaginationTest`.
- Uji tombol dan navigasi: `rtk proxy node --test tests/js/button-pagination.test.js`.

## Ringkasan dan Riwayat Pembayaran

- Pemilihan metode pembayaran menggunakan dropdown ringkas tanpa deskripsi
  panjang di Pembelian, Penjualan Retail/Sales/Grosir, dan Botol Kosong.
  Default tetap Tunai; DP/Tempo tetap hanya tersedia pada Pembelian dan
  Sales/Grosir. Input nominal dan jatuh tempo mengikuti metode yang dipilih.
- Form pembayaran transaksi baru, pembayaran sisa DP/tempo, serta hutang/piutang
  menampilkan total tagihan, sudah dibayar, sisa sebelum pembayaran, pembayaran
  sekarang, dan sisa setelah pembayaran. Isi nominal lalu klik **+ / Tambah
  Pembayaran** untuk memasukkannya ke tabel di bawah input dalam modal yang sama.
  Ringkasan dan pengajuan memakai pembayaran yang sudah ditambahkan, bukan draft.
  Pada Cash + Transfer, tabel memisahkan nominal cash dan transfer.
  Setelah pembayaran ditambahkan atau diperbarui, isi modal otomatis bergulir
  ke bawah menuju ringkasan dan tombol pengajuan, tanpa menggeser halaman belakang.
  Animasi gulir mengikuti preferensi reduced motion pengguna.
  Tombol hapus mengeluarkan pembayaran dari tabel; klik tambah kembali setelah
  mengubah nominal/metode/total. Klik tambah berulang memperbarui pembayaran,
  bukan menggandakan nominal. Aturan lunas, DP, tempo, dan kembalian tetap berlaku.
- Rumus pengurangan dan catatan persetujuan tidak ditampilkan pada ringkasan.
  Bagian riwayat disembunyikan bila kosong; riwayat yang benar-benar ada dan
  pembayaran menunggu validasi tetap ditampilkan.
- Contoh: tagihan Rp1.000.000, sudah dibayar Rp200.000, pembayaran sekarang
  Rp500.000 menghasilkan sisa Rp300.000 setelah pembayaran disetujui.
- Riwayat mencakup pembayaran awal/DP serta pembayaran yang sudah disetujui,
  dengan tanggal, referensi, nominal, dan sisa pada saat pembayaran tersebut.
  Pengajuan menunggu validasi ditampilkan terpisah dan tidak mengurangi sisa.
- Pembayaran lama yang hanya mempunyai total kumulatif ditandai tanpa rincian
  riwayat; tanggal dan nominal cicilannya tidak dibuat-buat.
- Nominal DP/cicilan melebihi sisa tagihan ditandai dan tidak bisa diajukan dari form.
- Pembelian, penjualan retail/grosir/sales, dan botol kosong menyediakan input
  **Uang Cash**, **Nominal Transfer**, serta metode **Cash + Transfer**.
  Cash harus cukup untuk melunasi; transfer harus sama dengan total tagihan.
  Gunakan DP (pada transaksi yang mendukungnya) untuk pembayaran sebagian.
- Tombol **Isi Nominal Otomatis** menampilkan nominal yang akan diisi dan mengisi total setelah diskon
  dikurangi nominal transfer; pada Cash saja, tombol mengisi seluruh tagihan.
  Nominal tetap bisa diedit untuk uang tunai lebih besar dan kembalian.
  Setelah mengisi otomatis, klik **+ / Tambah Pembayaran** untuk memasukkan ke tabel.
- Pada Cash + Transfer, kedua nominal wajib lebih dari nol; transfer harus
  kurang dari total tagihan dan gabungannya harus melunasi. Contoh:
  tagihan Rp1.000.000, transfer Rp400.000, cash Rp700.000 menghasilkan
  kembalian cash Rp100.000. Pembayaran yang tercatat tetap Rp1.000.000.
- Rincian cash, transfer, dan kembalian disimpan pada transaksi dan snapshot
  validasi serta ditampilkan di riwayat, detail validasi, PDF, dan slip cetak ulang.
  Validasi server dijalankan saat pengajuan dan persetujuan. Pengajuan lama
  Cash/Transfer tanpa nominal eksplisit tetap menggunakan pembayaran lunas.
- Jalankan `rtk php artisan migrate` sebelum menggunakan input baru.
  Migrasi `2026_11_01_000001_add_transaction_payment_details` menambahkan
  JSON nullable `payment_details` serta memperluas kolom metode pembayaran
  menjadi string untuk `SPLIT`, tanpa mengubah transaksi lama. Perubahan
  tipe kolom MySQL dapat mengunci tabel; jadwalkan deployment saat sepi.
  Rollback ditolak jika rincian pembayaran sudah tersimpan agar data tidak hilang;
  gunakan migrasi forward untuk perubahan berikutnya.

## Pemilihan Customer

Pada Penjualan Retail/Sales/Botol Kosong, pilih **Customer Terdaftar** untuk
mencari nama/kode customer, lalu klik customer agar modal langsung tertutup
dan pilihan tampil di transaksi. **Batal** menutup modal tanpa mengubah pilihan.
Pilih **Customer Tanpa Registrasi** untuk mengisi nama hanya pada transaksi ini
(tidak menambah master customer), lalu klik **Gunakan Nama Ini**.

## Kode Barcode Barang

- Pada Pembelian dan Penjualan Retail/Sales/Botol Kosong, **Cari Barcode**
  berada di sebelah kolom **Scan Barcode**, sebagai alternatif jika scanner
  tidak tersedia. Pilihan dari Cari Barcode membuka form barang yang sudah
  terisi; atur satuan, jumlah, dan harga, lalu klik **Simpan** untuk menambahkan
  ke daftar transaksi. **Batal** tidak menambahkan barang. Scan langsung
  tetap menambahkan barang ke daftar transaksi. Tidak ada Cari Barcode di dalam
  **Pilih Barang / Edit Barang**; form tersebut untuk mengatur barang,
  jumlah, satuan, dan harga.
  Pada Tambah Stok, Mutasi Stok, dan Hancur Stock, **Cari Barcode** berada
  di sebelah kolom scan di dalam form; pencarian/scan memilih barang/gudang, lalu
  jumlah diisi dan form disimpan.

- Detail Validasi Transaksi, riwayat Pembelian/Penjualan, bukti PDF, dan slip
  menampilkan kode/barcode barang. Pengajuan baru menyimpan kode di snapshot;
  pengajuan lama tanpa kode menampilkan `-` tanpa mengubah data historis.
- Laporan Stok (cairan dan botol kosong), Mutasi Stok, dan Barang Summary
  menampilkan kode/barcode. Filter **Kode / Barcode** menerima kode lengkap
  (tidak membedakan huruf besar/kecil) dan berlaku sebelum pagination serta
  ekspor PDF/Excel. Filter tanggal, gudang, dan barang tetap berlaku bersamaan.
- Master Barang Bibit (termasuk Absolute) tidak menampilkan kode/barcode
  pada form; tabel tetap menampilkan **Kode / Barcode**. Kode dibuat otomatis
  dan disimpan saat barang ditambahkan.
  Master Botol Kosong tetap menampilkan **Kode Barcode** pada form serta
  **Kode / Barcode** pada tabel.
- Inventory (Stok Gudang, Stok Menipis, Mutasi Stok, dan Hancur Stock)
  menampilkan **Kode / Barcode** pada tabel. Form Stok Gudang, Mutasi Stok,
  dan Hancur Stock menampilkan **Kode Barcode** setelah barang dipilih atau
  dipindai, termasuk kode Botol Kosong.
- Barcode memakai kode master yang sudah ada: `kode_barang` untuk Bibit/Absolute
  dan `kode_botol` untuk Botol Kosong. Tidak ada nomor barcode terpisah.
- Pada data baru, kode tersedia setelah disimpan. Kode Bibit/Absolute dapat
  dilihat di inventory/laporan. Kode Botol Kosong dapat disalin dari form edit.
- Gunakan kode lengkap pada kolom **Scan Barcode** di Pembelian,
  Penjualan, Stok Gudang, Mutasi Stok, dan Hancur Stock, lalu tekan Enter.
  Scanner harus mengirimkan teks kode master tersebut; nama barang atau barcode
  lain pada kemasan tidak otomatis dipetakan.
- Tombol **Simpan** pada modal Pilih Barang menampilkan notifikasi
  **Barang berhasil ditambahkan.** setelah barang masuk tabel transaksi;
  Edit Barang menampilkan **Barang berhasil diperbarui.**
  Notifikasi ini tidak berarti transaksi sudah diajukan atau disetujui.
- Pada transaksi, scan ulang barang yang sama menambah jumlah. Pemilihan
  supplier/customer/sales dan pemeriksaan gudang tetap mengikuti aturan transaksi.
- Pada Pembelian atau Penjualan, klik **Cari Barcode** di sebelah scan atau
  tekan **Ctrl+F1**. Shortcut tidak aktif ketika form Pilih Barang,
  pembayaran, atau pilihan customer/sales sedang terbuka.
  Pada Tambah Stok, Mutasi Stok, atau Hancur Stock, buka form terlebih dahulu.
  Pada MacBook gunakan **Fn+F1**, tanpa Command. Browser menerima kombinasi
  ini sebagai F1; jika tombol fungsi sudah aktif, F1 langsung juga bekerja.
  Tombol Cari Barcode tetap bisa digunakan
  jika shortcut ditangkap sistem operasi.
- Daftar barcode hanya menampilkan barang aktif dengan stok **lebih dari nol**,
  termasuk pada pembelian dan stok masuk. Cari nama/kode, filter jenis barang,
  lalu pilih untuk membuka form barang transaksi atau mengisi barang pada form stok.
  Daftar mengikuti jenis transaksi, gudang otomatis, dan gudang supplier;
  barang beda gudang harus dibuat dalam transaksi terpisah.
- Stok di daftar mengikuti data saat halaman dimuat; validasi transaksi tetap
  memeriksa stok aktual sebelum diproses. Scan manual dan pilihan barang
  sebelumnya tetap tersedia, termasuk untuk memasukkan stok barang baru.
- Penjualan Retail memakai default ML untuk cairan, termasuk saat scan
  langsung atau Cari Barcode di sebelah scan. Harga cairan dilabeli per ML.
  BOTOL ISI tetap bisa dipilih manual; mengedit item mempertahankan satuannya.
- Penjualan cairan mendukung satuan ML, LITER, dan BOTOL ISI. BOTOL ISI
  dikonversi menjadi ML berdasarkan varian botol yang dipilih, atau botol
  default pada master barang. Harga cairan tetap per ML; stok dikurangi
  dari varian tersebut setelah transaksi disetujui.
- Form Stok Gudang, Mutasi Stok, dan Hancur Stock memisahkan pilihan
  **Bibit**, **Absolute**, dan **Botol Kosong**. Daftar barang mengikuti jenis
  yang dipilih; scan barcode otomatis memilih jenis sesuai master barang.
  Bibit dan Absolute tetap memakai tipe gudang BIBIT. Untuk stok masuk,
  Bibit diinput sebagai jumlah botol dan kapasitasnya, Absolute sebagai ML,
  sedangkan Botol Kosong sebagai jumlah botol.

---

## Format Nota Cetak

- Nota pembelian, penjualan, validasi, dan ringkasan hutang/piutang memakai
  judul sesuai transaksi. Nota Hancur Stock berjudul **Hancur Stock**.
- PDF menggunakan A4 portrait dengan tampilan hitam-putih. Slip customer
  menggunakan printer thermal 80 mm melalui cetak browser atau Bluetooth.
- Kolom diskon, jatuh tempo, referensi, dan keterangan hanya tampil jika relevan.
  Status pengajuan tetap dicetak: **Menunggu Validasi / Belum diproses** atau
  **Ditolak / Tidak diproses**, sehingga tidak dianggap transaksi final.
- Ringkasan hutang/piutang menampilkan total tagihan, total dibayar, dan sisa
  tagihan; bukan bukti pembayaran individual.
- Identitas toko dan footer mengikuti Setting Nota. Template teks pada halaman
  pengaturan bukan template layout PDF/HTML nota.

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
