CREATE TABLE IF NOT EXISTS "cache" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "expiration" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "cache_locks" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "owner" TEXT NOT NULL,
  "expiration" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "failed_jobs" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "uuid" TEXT NOT NULL,
  "connection" TEXT NOT NULL,
  "queue" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "exception" TEXT NOT NULL,
  "failed_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "failed_jobs_uuid_unique" ON "failed_jobs"("uuid");

CREATE TABLE IF NOT EXISTS "job_batches" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "total_jobs" INTEGER NOT NULL,
  "pending_jobs" INTEGER NOT NULL,
  "failed_jobs" INTEGER NOT NULL,
  "failed_job_ids" TEXT NOT NULL,
  "options" TEXT,
  "cancelled_at" INTEGER DEFAULT NULL,
  "created_at" INTEGER NOT NULL,
  "finished_at" INTEGER DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "jobs" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "queue" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL,
  "reserved_at" INTEGER DEFAULT NULL,
  "available_at" INTEGER NOT NULL,
  "created_at" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "jobs_queue_index" ON "jobs"("queue");

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "email" TEXT NOT NULL PRIMARY KEY,
  "token" TEXT NOT NULL,
  "created_at" TEXT NULL DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" INTEGER DEFAULT NULL,
  "ip_address" TEXT DEFAULT NULL,
  "user_agent" TEXT,
  "payload" TEXT NOT NULL,
  "last_activity" INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS "sessions_user_id_index" ON "sessions"("user_id");

CREATE INDEX IF NOT EXISTS "sessions_last_activity_index" ON "sessions"("last_activity");

CREATE TABLE IF NOT EXISTS "th_saldo_barang" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tanggal" DATE NOT NULL,
  "id_gudang" INTEGER NOT NULL,
  "id_barang" INTEGER NOT NULL,
  "id_botol" INTEGER NOT NULL DEFAULT '0',
  "stok_awal_ml" REAL NOT NULL DEFAULT '0.00',
  "masuk_ml" REAL NOT NULL DEFAULT '0.00',
  "keluar_ml" REAL NOT NULL DEFAULT '0.00',
  "stok_akhir_ml" REAL NOT NULL DEFAULT '0.00',
  "minimum_stok_ml" REAL NOT NULL DEFAULT '0.00',
  "total_mutasi" INTEGER NOT NULL DEFAULT '0',
  "terakhir_mutasi" DATE DEFAULT NULL,
  "closed_at" TEXT NOT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "th_saldo_barang_id_barang_foreign" FOREIGN KEY ("id_barang") REFERENCES "tm_barang_bibit" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "th_saldo_barang_id_gudang_foreign" FOREIGN KEY ("id_gudang") REFERENCES "tm_gudang" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "th_saldo_barang_day_item_unique" ON "th_saldo_barang"("tanggal", "id_gudang", "id_barang", "id_botol");

CREATE INDEX IF NOT EXISTS "th_saldo_barang_id_barang_foreign" ON "th_saldo_barang"("id_barang");

CREATE INDEX IF NOT EXISTS "th_saldo_barang_item_index" ON "th_saldo_barang"("id_gudang", "id_barang", "id_botol");

CREATE TABLE IF NOT EXISTS "tm_barang_bibit" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "kode_barang" TEXT NOT NULL,
  "id_brand" INTEGER NOT NULL,
  "id_gudang" INTEGER DEFAULT NULL,
  "id_botol" INTEGER DEFAULT NULL,
  "nama_barang" TEXT NOT NULL,
  "jenis_barang" TEXT NOT NULL DEFAULT 'BIBIT',
  "harga_beli_per_ml" REAL NOT NULL DEFAULT '0.00',
  "harga_jual_retail_per_ml" REAL NOT NULL DEFAULT '0.00',
  "harga_jual_grosir_per_ml" REAL NOT NULL DEFAULT '0.00',
  "harga_beli_per_botol" REAL DEFAULT '0.00',
  "harga_jual_per_botol" REAL DEFAULT '0.00',
  "minimum_stok_ml" REAL NOT NULL DEFAULT '0.00',
  "satuan_dasar" TEXT NOT NULL DEFAULT 'ML',
  "status" TEXT NOT NULL DEFAULT 'AKTIF' CHECK ("status" IN ('AKTIF', 'NONAKTIF')),
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tm_barang_bibit_id_botol_foreign" FOREIGN KEY ("id_botol") REFERENCES "tm_botol" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tm_barang_bibit_id_brand_foreign" FOREIGN KEY ("id_brand") REFERENCES "tm_brand" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tm_barang_bibit_id_gudang_foreign" FOREIGN KEY ("id_gudang") REFERENCES "tm_gudang" (
    "id"
  ) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_barang_bibit_kode_barang_unique" ON "tm_barang_bibit"("kode_barang");

CREATE INDEX IF NOT EXISTS "tm_barang_bibit_id_brand_foreign" ON "tm_barang_bibit"("id_brand");

CREATE INDEX IF NOT EXISTS "tm_barang_bibit_id_botol_foreign" ON "tm_barang_bibit"("id_botol");

CREATE INDEX IF NOT EXISTS "tm_barang_bibit_id_gudang_foreign" ON "tm_barang_bibit"("id_gudang");

CREATE TABLE IF NOT EXISTS "tm_botol" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "kode_botol" TEXT NOT NULL,
  "varian_ml" INTEGER NOT NULL,
  "nama_botol" TEXT NOT NULL,
  "isi_per_dus" INTEGER NOT NULL DEFAULT '1',
  "harga_beli_per_botol" REAL NOT NULL DEFAULT '0.00',
  "harga_jual_per_botol" REAL NOT NULL DEFAULT '0.00',
  "harga_jual_per_dus" REAL NOT NULL DEFAULT '0.00',
  "stock_botol" REAL NOT NULL DEFAULT '0.00',
  "status" TEXT NOT NULL DEFAULT 'AKTIF' CHECK ("status" IN ('AKTIF', 'NONAKTIF')),
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_botol_kode_botol_unique" ON "tm_botol"("kode_botol");

CREATE TABLE IF NOT EXISTS "tm_botol_kosong" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "kode_botol" TEXT NOT NULL,
  "id_gudang" INTEGER DEFAULT NULL,
  "nama_botol" TEXT NOT NULL,
  "harga_beli" REAL NOT NULL DEFAULT '0.00',
  "harga_jual" REAL NOT NULL DEFAULT '0.00',
  "stock" REAL NOT NULL DEFAULT '0.00',
  "satuan" TEXT NOT NULL DEFAULT 'BOTOL',
  "status" TEXT NOT NULL DEFAULT 'AKTIF' CHECK ("status" IN ('AKTIF', 'NONAKTIF')),
  "keterangan" TEXT,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tm_botol_kosong_id_gudang_foreign" FOREIGN KEY ("id_gudang") REFERENCES "tm_gudang" (
    "id"
  ) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_botol_kosong_kode_botol_unique" ON "tm_botol_kosong"("kode_botol");

CREATE INDEX IF NOT EXISTS "tm_botol_kosong_id_gudang_foreign" ON "tm_botol_kosong"("id_gudang");

CREATE TABLE IF NOT EXISTS "tm_brand" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "kode_brand" TEXT NOT NULL,
  "nama_brand" TEXT NOT NULL,
  "negara_asal" TEXT DEFAULT NULL,
  "keterangan" TEXT,
  "status" TEXT NOT NULL DEFAULT 'AKTIF' CHECK ("status" IN ('AKTIF', 'NONAKTIF')),
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_brand_kode_brand_unique" ON "tm_brand"("kode_brand");

CREATE TABLE IF NOT EXISTS "tm_customer" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "kode_customer" TEXT NOT NULL,
  "nama_customer" TEXT NOT NULL,
  "tipe_customer" TEXT NOT NULL DEFAULT 'RETAIL' CHECK ("tipe_customer" IN ('RETAIL', 'SALES')),
  "no_hp" TEXT DEFAULT NULL,
  "alamat" TEXT,
  "limit_piutang" REAL NOT NULL DEFAULT '0.00',
  "status" TEXT NOT NULL DEFAULT 'AKTIF' CHECK ("status" IN ('AKTIF', 'NONAKTIF')),
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_customer_kode_customer_unique" ON "tm_customer"("kode_customer");

CREATE TABLE IF NOT EXISTS "tm_gudang" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "kode_gudang" TEXT NOT NULL,
  "nama_gudang" TEXT NOT NULL,
  "tipe_gudang" TEXT NOT NULL DEFAULT 'BIBIT',
  "alamat" TEXT,
  "status" TEXT NOT NULL DEFAULT 'AKTIF' CHECK ("status" IN ('AKTIF', 'NONAKTIF')),
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_gudang_kode_gudang_unique" ON "tm_gudang"("kode_gudang");

CREATE TABLE IF NOT EXISTS "tm_sales" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "kode_sales" TEXT NOT NULL,
  "nama_sales" TEXT NOT NULL,
  "no_hp" TEXT DEFAULT NULL,
  "alamat" TEXT,
  "status" TEXT NOT NULL DEFAULT 'AKTIF' CHECK ("status" IN ('AKTIF', 'NONAKTIF')),
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_sales_kode_sales_unique" ON "tm_sales"("kode_sales");

CREATE TABLE IF NOT EXISTS "tm_supplier" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "kode_supplier" TEXT NOT NULL,
  "nama_supplier" TEXT NOT NULL,
  "pic_name" TEXT DEFAULT NULL,
  "no_hp" TEXT DEFAULT NULL,
  "alamat" TEXT,
  "keterangan" TEXT,
  "status" TEXT NOT NULL DEFAULT 'AKTIF' CHECK ("status" IN ('AKTIF', 'NONAKTIF')),
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_supplier_kode_supplier_unique" ON "tm_supplier"("kode_supplier");

CREATE TABLE IF NOT EXISTS "tm_users" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "username" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'admin' CHECK ("role" IN ('superadmin', 'owner', 'admin', 'manager', 'kepala_toko', 'kasir')),
  "akses_menu" TEXT DEFAULT NULL,
  "email_verified_at" TEXT NULL DEFAULT NULL,
  "password" TEXT NOT NULL,
  "remember_token" TEXT DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_users_username_unique" ON "tm_users"("username");

CREATE TABLE IF NOT EXISTS "tp_app_settings" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "logo_path" TEXT DEFAULT NULL,
  "login_logo_path" TEXT DEFAULT NULL,
  "app_name" TEXT NOT NULL DEFAULT 'Paris Parfum Admin',
  "primary_color" TEXT NOT NULL DEFAULT 'amber',
  "light_theme" TEXT NOT NULL DEFAULT 'slate',
  "dark_theme" TEXT NOT NULL DEFAULT 'navy',
  "is_dark_mode" INTEGER NOT NULL DEFAULT '0',
  "store_name" TEXT NOT NULL DEFAULT 'PARIS PARFUM',
  "store_address" TEXT,
  "store_phone" TEXT DEFAULT NULL,
  "receipt_footer" TEXT,
  "receipt_template" TEXT,
  "payment_receipt_template" TEXT,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "tp_system" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tanggal_system" DATE NOT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS "tt_barang_bibit" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tanggal" DATE NOT NULL,
  "id_gudang" INTEGER NOT NULL,
  "id_barang" INTEGER NOT NULL,
  "id_botol" INTEGER DEFAULT NULL,
  "tipe_mutasi" TEXT NOT NULL CHECK ("tipe_mutasi" IN ('MASUK', 'KELUAR')),
  "qty_ml" REAL NOT NULL,
  "stok_awal_ml" REAL NOT NULL,
  "stok_akhir_ml" REAL NOT NULL,
  "sumber_transaksi" TEXT NOT NULL,
  "no_transaksi" TEXT NOT NULL,
  "keterangan" TEXT,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tt_barang_bibit_id_barang_foreign" FOREIGN KEY ("id_barang") REFERENCES "tm_barang_bibit" (
    "id"
  ) ON DELETE RESTRICT,
  CONSTRAINT "tt_barang_bibit_id_botol_foreign" FOREIGN KEY ("id_botol") REFERENCES "tm_botol" (
    "id"
  ) ON DELETE SET NULL,
  CONSTRAINT "tt_barang_bibit_id_gudang_foreign" FOREIGN KEY ("id_gudang") REFERENCES "tm_gudang" (
    "id"
  ) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "tt_barang_bibit_id_barang_foreign" ON "tt_barang_bibit"("id_barang");

CREATE INDEX IF NOT EXISTS "tt_barang_bibit_id_botol_foreign" ON "tt_barang_bibit"("id_botol");

CREATE INDEX IF NOT EXISTS "tt_barang_bibit_report_idx" ON "tt_barang_bibit"("id_gudang", "id_barang", "id_botol", "tanggal");

CREATE INDEX IF NOT EXISTS "tt_barang_bibit_tanggal_index" ON "tt_barang_bibit"("tanggal");

CREATE TABLE IF NOT EXISTS "tt_botol_kosong" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tanggal" DATE NOT NULL,
  "id_gudang" INTEGER NOT NULL,
  "id_botol_kosong" INTEGER NOT NULL,
  "tipe_mutasi" TEXT NOT NULL CHECK ("tipe_mutasi" IN ('MASUK', 'KELUAR')),
  "qty_botol" REAL NOT NULL,
  "stok_awal" REAL NOT NULL,
  "stok_akhir" REAL NOT NULL,
  "sumber_transaksi" TEXT NOT NULL,
  "no_transaksi" TEXT NOT NULL,
  "keterangan" TEXT,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tt_botol_kosong_id_botol_kosong_foreign" FOREIGN KEY ("id_botol_kosong") REFERENCES "tm_botol_kosong" (
    "id"
  ) ON DELETE RESTRICT,
  CONSTRAINT "tt_botol_kosong_id_gudang_foreign" FOREIGN KEY ("id_gudang") REFERENCES "tm_gudang" (
    "id"
  ) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "tt_botol_kosong_id_botol_kosong_foreign" ON "tt_botol_kosong"("id_botol_kosong");

CREATE INDEX IF NOT EXISTS "tt_botol_kosong_report_idx" ON "tt_botol_kosong"("id_gudang", "id_botol_kosong", "tanggal");

CREATE INDEX IF NOT EXISTS "tt_botol_kosong_tanggal_index" ON "tt_botol_kosong"("tanggal");

CREATE TABLE IF NOT EXISTS "tt_hutang" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "no_hutang" TEXT NOT NULL,
  "tanggal" DATE NOT NULL,
  "id_supplier" INTEGER NOT NULL,
  "id_pembelian" INTEGER DEFAULT NULL,
  "total_hutang" REAL NOT NULL,
  "total_bayar" REAL NOT NULL DEFAULT '0.00',
  "sisa_hutang" REAL NOT NULL,
  "status_hutang" TEXT NOT NULL DEFAULT 'OPEN',
  "jatuh_tempo" DATE DEFAULT NULL,
  "keterangan" TEXT,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tt_hutang_id_pembelian_foreign" FOREIGN KEY ("id_pembelian") REFERENCES "tt_pembelian" (
    "id"
  ) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "tt_hutang_id_supplier_foreign" FOREIGN KEY ("id_supplier") REFERENCES "tm_supplier" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "tt_hutang_no_hutang_unique" ON "tt_hutang"("no_hutang");

CREATE INDEX IF NOT EXISTS "tt_hutang_id_supplier_foreign" ON "tt_hutang"("id_supplier");

CREATE INDEX IF NOT EXISTS "tt_hutang_id_pembelian_foreign" ON "tt_hutang"("id_pembelian");

CREATE TABLE IF NOT EXISTS "tt_kas_mutasi" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tanggal" DATE NOT NULL,
  "no_transaksi" TEXT NOT NULL,
  "jenis_transaksi" TEXT NOT NULL,
  "sumber_transaksi" TEXT NOT NULL,
  "pihak" TEXT DEFAULT NULL,
  "kas_masuk" REAL NOT NULL DEFAULT '0.00',
  "kas_keluar" REAL NOT NULL DEFAULT '0.00',
  "saldo_akhir" REAL NOT NULL DEFAULT '0.00',
  "keterangan" TEXT,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS "tt_kas_mutasi_no_transaksi_index" ON "tt_kas_mutasi"("no_transaksi");

CREATE TABLE IF NOT EXISTS "tt_mutasi_stok" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tanggal" DATE NOT NULL,
  "tipe_mutasi" TEXT NOT NULL,
  "sumber_transaksi" TEXT NOT NULL,
  "no_transaksi" TEXT NOT NULL,
  "id_gudang" INTEGER NOT NULL,
  "id_barang" INTEGER NOT NULL,
  "id_botol" INTEGER DEFAULT NULL,
  "qty_ml" REAL NOT NULL,
  "stok_sebelum_ml" REAL NOT NULL,
  "stok_sesudah_ml" REAL NOT NULL,
  "keterangan" TEXT,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tt_mutasi_stok_id_barang_foreign" FOREIGN KEY ("id_barang") REFERENCES "tm_barang_bibit" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tt_mutasi_stok_id_gudang_foreign" FOREIGN KEY ("id_gudang") REFERENCES "tm_gudang" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "tt_mutasi_stok_id_gudang_foreign" ON "tt_mutasi_stok"("id_gudang");

CREATE INDEX IF NOT EXISTS "tt_mutasi_stok_id_barang_foreign" ON "tt_mutasi_stok"("id_barang");

CREATE TABLE IF NOT EXISTS "tt_pembelian" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "no_pembelian" TEXT NOT NULL,
  "tanggal" DATE NOT NULL,
  "id_supplier" INTEGER NOT NULL,
  "id_gudang" INTEGER NOT NULL,
  "total_qty_ml" REAL NOT NULL DEFAULT '0.00',
  "total_qty_botol" REAL NOT NULL DEFAULT '0.00',
  "total_pembelian" REAL NOT NULL DEFAULT '0.00',
  "jumlah_bayar" REAL NOT NULL DEFAULT '0.00',
  "discount" REAL NOT NULL DEFAULT '0.00',
  "metode_pembayaran" TEXT NOT NULL CHECK ("metode_pembayaran" IN ('CASH', 'TRANSFER', 'TEMPO')),
  "status_pembayaran" TEXT NOT NULL,
  "jatuh_tempo" DATE DEFAULT NULL,
  "keterangan" TEXT,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tt_pembelian_id_gudang_foreign" FOREIGN KEY ("id_gudang") REFERENCES "tm_gudang" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tt_pembelian_id_supplier_foreign" FOREIGN KEY ("id_supplier") REFERENCES "tm_supplier" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "tt_pembelian_no_pembelian_unique" ON "tt_pembelian"("no_pembelian");

CREATE INDEX IF NOT EXISTS "tt_pembelian_id_supplier_foreign" ON "tt_pembelian"("id_supplier");

CREATE INDEX IF NOT EXISTS "tt_pembelian_id_gudang_foreign" ON "tt_pembelian"("id_gudang");

CREATE TABLE IF NOT EXISTS "tt_pembelian_detail" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "id_pembelian" INTEGER NOT NULL,
  "tipe_item" TEXT NOT NULL DEFAULT 'BIBIT',
  "item_id" INTEGER DEFAULT NULL,
  "nama_item" TEXT DEFAULT NULL,
  "id_barang" INTEGER DEFAULT NULL,
  "id_botol" INTEGER DEFAULT NULL,
  "qty_input" REAL NOT NULL,
  "satuan_input" TEXT NOT NULL,
  "qty_ml" REAL NOT NULL,
  "konversi_qty_dasar" REAL DEFAULT NULL,
  "satuan_dasar" TEXT NOT NULL DEFAULT 'ML',
  "harga" REAL DEFAULT NULL,
  "harga_beli_per_ml" REAL NOT NULL,
  "subtotal" REAL NOT NULL,
  "discount" REAL NOT NULL DEFAULT '0.00',
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tt_pembelian_detail_id_barang_foreign" FOREIGN KEY ("id_barang") REFERENCES "tm_barang_bibit" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tt_pembelian_detail_id_pembelian_foreign" FOREIGN KEY ("id_pembelian") REFERENCES "tt_pembelian" (
    "id"
  ) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "tt_pembelian_detail_id_pembelian_foreign" ON "tt_pembelian_detail"("id_pembelian");

CREATE INDEX IF NOT EXISTS "tt_pembelian_detail_id_barang_foreign" ON "tt_pembelian_detail"("id_barang");

CREATE TABLE IF NOT EXISTS "tt_penjualan" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "no_penjualan" TEXT NOT NULL,
  "tanggal" DATE NOT NULL,
  "id_customer" INTEGER DEFAULT NULL,
  "manual_customer_name" TEXT DEFAULT NULL,
  "tipe_penjualan" TEXT NOT NULL CHECK ("tipe_penjualan" IN ('RETAIL', 'GROSIR', 'BOTOL_KOSONG')),
  "id_sales" INTEGER DEFAULT NULL,
  "id_gudang" INTEGER NOT NULL,
  "total_qty_ml" REAL NOT NULL DEFAULT '0.00',
  "total_qty_botol" REAL NOT NULL DEFAULT '0.00',
  "total_penjualan" REAL NOT NULL DEFAULT '0.00',
  "jumlah_bayar" REAL NOT NULL DEFAULT '0.00',
  "discount" REAL NOT NULL DEFAULT '0.00',
  "total_modal" REAL NOT NULL DEFAULT '0.00',
  "laba_kotor" REAL NOT NULL DEFAULT '0.00',
  "metode_pembayaran" TEXT NOT NULL CHECK ("metode_pembayaran" IN ('CASH', 'TRANSFER', 'TEMPO')),
  "status_pembayaran" TEXT NOT NULL,
  "jatuh_tempo" DATE DEFAULT NULL,
  "keterangan" TEXT,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tt_penjualan_id_customer_foreign" FOREIGN KEY ("id_customer") REFERENCES "tm_customer" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tt_penjualan_id_gudang_foreign" FOREIGN KEY ("id_gudang") REFERENCES "tm_gudang" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tt_penjualan_id_sales_foreign" FOREIGN KEY ("id_sales") REFERENCES "tm_sales" (
    "id"
  ) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "tt_penjualan_no_penjualan_unique" ON "tt_penjualan"("no_penjualan");

CREATE INDEX IF NOT EXISTS "tt_penjualan_id_customer_foreign" ON "tt_penjualan"("id_customer");

CREATE INDEX IF NOT EXISTS "tt_penjualan_id_sales_foreign" ON "tt_penjualan"("id_sales");

CREATE INDEX IF NOT EXISTS "tt_penjualan_id_gudang_foreign" ON "tt_penjualan"("id_gudang");

CREATE TABLE IF NOT EXISTS "tt_penjualan_detail" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "id_penjualan" INTEGER NOT NULL,
  "tipe_item" TEXT NOT NULL DEFAULT 'BIBIT',
  "item_id" INTEGER DEFAULT NULL,
  "nama_item" TEXT DEFAULT NULL,
  "id_barang" INTEGER DEFAULT NULL,
  "id_botol" INTEGER DEFAULT NULL,
  "qty_input" REAL NOT NULL DEFAULT '0.00',
  "satuan_input" TEXT NOT NULL DEFAULT 'ML',
  "qty_ml" REAL NOT NULL,
  "konversi_qty_dasar" REAL DEFAULT NULL,
  "satuan_dasar" TEXT NOT NULL DEFAULT 'ML',
  "harga" REAL DEFAULT NULL,
  "harga_beli_per_ml" REAL NOT NULL,
  "harga_jual_per_ml" REAL NOT NULL,
  "subtotal_modal" REAL NOT NULL,
  "subtotal_jual" REAL NOT NULL,
  "laba_kotor" REAL NOT NULL,
  "discount" REAL NOT NULL DEFAULT '0.00',
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tt_penjualan_detail_id_barang_foreign" FOREIGN KEY ("id_barang") REFERENCES "tm_barang_bibit" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tt_penjualan_detail_id_penjualan_foreign" FOREIGN KEY ("id_penjualan") REFERENCES "tt_penjualan" (
    "id"
  ) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "tt_penjualan_detail_id_penjualan_foreign" ON "tt_penjualan_detail"("id_penjualan");

CREATE INDEX IF NOT EXISTS "tt_penjualan_detail_id_barang_foreign" ON "tt_penjualan_detail"("id_barang");

CREATE TABLE IF NOT EXISTS "tt_piutang" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "no_piutang" TEXT NOT NULL,
  "tanggal" DATE NOT NULL,
  "id_customer" INTEGER NOT NULL,
  "id_penjualan" INTEGER NOT NULL,
  "total_piutang" REAL NOT NULL,
  "total_bayar" REAL NOT NULL DEFAULT '0.00',
  "sisa_piutang" REAL NOT NULL,
  "status_piutang" TEXT NOT NULL DEFAULT 'OPEN',
  "jatuh_tempo" DATE DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tt_piutang_id_customer_foreign" FOREIGN KEY ("id_customer") REFERENCES "tm_customer" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tt_piutang_id_penjualan_foreign" FOREIGN KEY ("id_penjualan") REFERENCES "tt_penjualan" (
    "id"
  ) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "tt_piutang_no_piutang_unique" ON "tt_piutang"("no_piutang");

CREATE INDEX IF NOT EXISTS "tt_piutang_id_customer_foreign" ON "tt_piutang"("id_customer");

CREATE INDEX IF NOT EXISTS "tt_piutang_id_penjualan_foreign" ON "tt_piutang"("id_penjualan");

CREATE TABLE IF NOT EXISTS "tt_piutang_supplier" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "no_piutang_supplier" TEXT NOT NULL,
  "tanggal" DATE NOT NULL,
  "id_supplier" INTEGER NOT NULL,
  "total_piutang" REAL NOT NULL,
  "total_bayar" REAL NOT NULL DEFAULT '0.00',
  "sisa_piutang" REAL NOT NULL,
  "status_piutang" TEXT NOT NULL DEFAULT 'OPEN',
  "jatuh_tempo" DATE DEFAULT NULL,
  "keterangan" TEXT,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tt_piutang_supplier_id_supplier_foreign" FOREIGN KEY ("id_supplier") REFERENCES "tm_supplier" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "tt_piutang_supplier_no_piutang_supplier_unique" ON "tt_piutang_supplier"("no_piutang_supplier");

CREATE INDEX IF NOT EXISTS "tt_piutang_supplier_id_supplier_foreign" ON "tt_piutang_supplier"("id_supplier");

CREATE TABLE IF NOT EXISTS "tt_saldo_barang" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tanggal" DATE NOT NULL,
  "id_gudang" INTEGER NOT NULL,
  "id_barang" INTEGER NOT NULL,
  "id_botol" INTEGER NOT NULL DEFAULT '0',
  "stok_awal_ml" REAL NOT NULL DEFAULT '0.00',
  "masuk_ml" REAL NOT NULL DEFAULT '0.00',
  "keluar_ml" REAL NOT NULL DEFAULT '0.00',
  "stok_akhir_ml" REAL NOT NULL DEFAULT '0.00',
  "minimum_stok_ml" REAL NOT NULL DEFAULT '0.00',
  "total_mutasi" INTEGER NOT NULL DEFAULT '0',
  "terakhir_mutasi" DATE DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tt_saldo_barang_id_barang_foreign" FOREIGN KEY ("id_barang") REFERENCES "tm_barang_bibit" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tt_saldo_barang_id_gudang_foreign" FOREIGN KEY ("id_gudang") REFERENCES "tm_gudang" (
    "id"
  ) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "tt_saldo_barang_item_unique" ON "tt_saldo_barang"("id_gudang", "id_barang", "id_botol");

CREATE INDEX IF NOT EXISTS "tt_saldo_barang_id_barang_foreign" ON "tt_saldo_barang"("id_barang");

CREATE INDEX IF NOT EXISTS "tt_saldo_barang_tanggal_index" ON "tt_saldo_barang"("tanggal");

CREATE TABLE IF NOT EXISTS "tt_stok_gudang" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "id_gudang" INTEGER NOT NULL,
  "id_barang" INTEGER NOT NULL,
  "id_botol" INTEGER DEFAULT NULL,
  "stok_ml" REAL NOT NULL DEFAULT '0.00',
  "stok_reserved_ml" REAL NOT NULL DEFAULT '0.00',
  "minimum_stok_ml" REAL NOT NULL DEFAULT '0.00',
  "last_update" TEXT NULL DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL,
  CONSTRAINT "tt_stok_gudang_id_gudang_foreign" FOREIGN KEY ("id_gudang") REFERENCES "tm_gudang" (
    "id"
  ) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "tt_stok_gudang_gudang_barang_botol_unique" ON "tt_stok_gudang"("id_gudang", "id_barang", "id_botol");

CREATE INDEX IF NOT EXISTS "tt_stok_gudang_id_barang_foreign" ON "tt_stok_gudang"("id_barang");

CREATE TABLE IF NOT EXISTS "tt_toko_closing" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tanggal_tutup" DATE NOT NULL,
  "saldo_awal" REAL NOT NULL DEFAULT '0.00',
  "saldo_akhir" REAL NOT NULL DEFAULT '0.00',
  "total_penjualan" REAL NOT NULL DEFAULT '0.00',
  "total_pembelian" REAL NOT NULL DEFAULT '0.00',
  "keterangan" TEXT,
  "created_by" TEXT DEFAULT NULL,
  "created_at" TEXT NULL DEFAULT NULL,
  "updated_at" TEXT NULL DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "tt_toko_closing_tanggal_tutup_unique" ON "tt_toko_closing"("tanggal_tutup");
