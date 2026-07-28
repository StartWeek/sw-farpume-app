/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `th_saldo_barang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `th_saldo_barang` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tanggal` date NOT NULL,
  `id_gudang` bigint unsigned NOT NULL,
  `id_barang` bigint unsigned NOT NULL,
  `id_botol` bigint unsigned NOT NULL DEFAULT '0',
  `stok_awal_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `masuk_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `keluar_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `stok_akhir_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `minimum_stok_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_mutasi` int unsigned NOT NULL DEFAULT '0',
  `terakhir_mutasi` date DEFAULT NULL,
  `closed_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `th_saldo_barang_day_item_unique` (`tanggal`,`id_gudang`,`id_barang`,`id_botol`),
  KEY `th_saldo_barang_id_barang_foreign` (`id_barang`),
  KEY `th_saldo_barang_item_index` (`id_gudang`,`id_barang`,`id_botol`),
  CONSTRAINT `th_saldo_barang_id_barang_foreign` FOREIGN KEY (`id_barang`) REFERENCES `tm_barang_bibit` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `th_saldo_barang_id_gudang_foreign` FOREIGN KEY (`id_gudang`) REFERENCES `tm_gudang` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tm_barang_bibit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tm_barang_bibit` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kode_barang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_brand` bigint unsigned NOT NULL,
  `id_gudang` bigint unsigned DEFAULT NULL,
  `id_botol` bigint unsigned DEFAULT NULL,
  `nama_barang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis_barang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BIBIT',
  `harga_beli_per_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `harga_jual_retail_per_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `harga_jual_grosir_per_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `harga_beli_per_botol` decimal(15,2) DEFAULT '0.00',
  `harga_jual_per_botol` decimal(15,2) DEFAULT '0.00',
  `minimum_stok_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `satuan_dasar` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ML',
  `status` enum('AKTIF','NONAKTIF') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AKTIF',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tm_barang_bibit_kode_barang_unique` (`kode_barang`),
  KEY `tm_barang_bibit_id_brand_foreign` (`id_brand`),
  KEY `tm_barang_bibit_id_botol_foreign` (`id_botol`),
  KEY `tm_barang_bibit_id_gudang_foreign` (`id_gudang`),
  CONSTRAINT `tm_barang_bibit_id_botol_foreign` FOREIGN KEY (`id_botol`) REFERENCES `tm_botol` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tm_barang_bibit_id_brand_foreign` FOREIGN KEY (`id_brand`) REFERENCES `tm_brand` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tm_barang_bibit_id_gudang_foreign` FOREIGN KEY (`id_gudang`) REFERENCES `tm_gudang` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tm_botol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tm_botol` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kode_botol` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `varian_ml` int unsigned NOT NULL,
  `nama_botol` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isi_per_dus` int unsigned NOT NULL DEFAULT '1',
  `harga_beli_per_botol` decimal(15,2) NOT NULL DEFAULT '0.00',
  `harga_jual_per_botol` decimal(15,2) NOT NULL DEFAULT '0.00',
  `harga_jual_per_dus` decimal(15,2) NOT NULL DEFAULT '0.00',
  `stock_botol` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` enum('AKTIF','NONAKTIF') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AKTIF',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tm_botol_kode_botol_unique` (`kode_botol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tm_botol_kosong`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tm_botol_kosong` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kode_botol` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_gudang` bigint unsigned DEFAULT NULL,
  `nama_botol` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `harga_beli` decimal(15,2) NOT NULL DEFAULT '0.00',
  `harga_jual` decimal(15,2) NOT NULL DEFAULT '0.00',
  `stock` decimal(15,2) NOT NULL DEFAULT '0.00',
  `satuan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BOTOL',
  `status` enum('AKTIF','NONAKTIF') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AKTIF',
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tm_botol_kosong_kode_botol_unique` (`kode_botol`),
  KEY `tm_botol_kosong_id_gudang_foreign` (`id_gudang`),
  CONSTRAINT `tm_botol_kosong_id_gudang_foreign` FOREIGN KEY (`id_gudang`) REFERENCES `tm_gudang` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tm_brand`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tm_brand` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kode_brand` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_brand` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `negara_asal` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `status` enum('AKTIF','NONAKTIF') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AKTIF',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tm_brand_kode_brand_unique` (`kode_brand`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tm_customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tm_customer` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kode_customer` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_customer` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_customer` enum('RETAIL','SALES') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'RETAIL',
  `no_hp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alamat` text COLLATE utf8mb4_unicode_ci,
  `limit_piutang` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` enum('AKTIF','NONAKTIF') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AKTIF',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tm_customer_kode_customer_unique` (`kode_customer`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tm_gudang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tm_gudang` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kode_gudang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_gudang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_gudang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BIBIT',
  `alamat` text COLLATE utf8mb4_unicode_ci,
  `status` enum('AKTIF','NONAKTIF') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AKTIF',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tm_gudang_kode_gudang_unique` (`kode_gudang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tm_sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tm_sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kode_sales` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_sales` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_hp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alamat` text COLLATE utf8mb4_unicode_ci,
  `status` enum('AKTIF','NONAKTIF') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AKTIF',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tm_sales_kode_sales_unique` (`kode_sales`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tm_supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tm_supplier` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kode_supplier` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_supplier` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pic_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `no_hp` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alamat` text COLLATE utf8mb4_unicode_ci,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `status` enum('AKTIF','NONAKTIF') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AKTIF',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tm_supplier_kode_supplier_unique` (`kode_supplier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tm_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tm_users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('superadmin','owner','admin','manager','kepala_toko','kasir') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'admin',
  `akses_menu` json DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tm_users_username_unique` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tp_app_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tp_app_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `logo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `login_logo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `app_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Paris Parfum Admin',
  `primary_color` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'amber',
  `light_theme` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'slate',
  `dark_theme` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'navy',
  `is_dark_mode` tinyint(1) NOT NULL DEFAULT '0',
  `store_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PARIS PARFUM',
  `store_address` text COLLATE utf8mb4_unicode_ci,
  `store_phone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receipt_footer` text COLLATE utf8mb4_unicode_ci,
  `receipt_template` longtext COLLATE utf8mb4_unicode_ci,
  `payment_receipt_template` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tp_system`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tp_system` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tanggal_system` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_barang_bibit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_barang_bibit` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tanggal` date NOT NULL,
  `id_gudang` bigint unsigned NOT NULL,
  `id_barang` bigint unsigned NOT NULL,
  `id_botol` bigint unsigned DEFAULT NULL,
  `tipe_mutasi` enum('MASUK','KELUAR') COLLATE utf8mb4_unicode_ci NOT NULL,
  `qty_ml` decimal(15,2) NOT NULL,
  `stok_awal_ml` decimal(15,2) NOT NULL,
  `stok_akhir_ml` decimal(15,2) NOT NULL,
  `sumber_transaksi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_transaksi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tt_barang_bibit_id_barang_foreign` (`id_barang`),
  KEY `tt_barang_bibit_id_botol_foreign` (`id_botol`),
  KEY `tt_barang_bibit_report_idx` (`id_gudang`,`id_barang`,`id_botol`,`tanggal`),
  KEY `tt_barang_bibit_tanggal_index` (`tanggal`),
  CONSTRAINT `tt_barang_bibit_id_barang_foreign` FOREIGN KEY (`id_barang`) REFERENCES `tm_barang_bibit` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `tt_barang_bibit_id_botol_foreign` FOREIGN KEY (`id_botol`) REFERENCES `tm_botol` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tt_barang_bibit_id_gudang_foreign` FOREIGN KEY (`id_gudang`) REFERENCES `tm_gudang` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_botol_kosong`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_botol_kosong` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tanggal` date NOT NULL,
  `id_gudang` bigint unsigned NOT NULL,
  `id_botol_kosong` bigint unsigned NOT NULL,
  `tipe_mutasi` enum('MASUK','KELUAR') COLLATE utf8mb4_unicode_ci NOT NULL,
  `qty_botol` decimal(15,2) NOT NULL,
  `stok_awal` decimal(15,2) NOT NULL,
  `stok_akhir` decimal(15,2) NOT NULL,
  `sumber_transaksi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_transaksi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tt_botol_kosong_id_botol_kosong_foreign` (`id_botol_kosong`),
  KEY `tt_botol_kosong_report_idx` (`id_gudang`,`id_botol_kosong`,`tanggal`),
  KEY `tt_botol_kosong_tanggal_index` (`tanggal`),
  CONSTRAINT `tt_botol_kosong_id_botol_kosong_foreign` FOREIGN KEY (`id_botol_kosong`) REFERENCES `tm_botol_kosong` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `tt_botol_kosong_id_gudang_foreign` FOREIGN KEY (`id_gudang`) REFERENCES `tm_gudang` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_hutang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_hutang` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `no_hutang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal` date NOT NULL,
  `id_supplier` bigint unsigned NOT NULL,
  `id_pembelian` bigint unsigned DEFAULT NULL,
  `total_hutang` decimal(15,2) NOT NULL,
  `total_bayar` decimal(15,2) NOT NULL DEFAULT '0.00',
  `sisa_hutang` decimal(15,2) NOT NULL,
  `status_hutang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `jatuh_tempo` date DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tt_hutang_no_hutang_unique` (`no_hutang`),
  KEY `tt_hutang_id_supplier_foreign` (`id_supplier`),
  KEY `tt_hutang_id_pembelian_foreign` (`id_pembelian`),
  CONSTRAINT `tt_hutang_id_pembelian_foreign` FOREIGN KEY (`id_pembelian`) REFERENCES `tt_pembelian` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `tt_hutang_id_supplier_foreign` FOREIGN KEY (`id_supplier`) REFERENCES `tm_supplier` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_kas_mutasi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_kas_mutasi` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tanggal` date NOT NULL,
  `no_transaksi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis_transaksi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sumber_transaksi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pihak` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `kas_masuk` decimal(15,2) NOT NULL DEFAULT '0.00',
  `kas_keluar` decimal(15,2) NOT NULL DEFAULT '0.00',
  `saldo_akhir` decimal(15,2) NOT NULL DEFAULT '0.00',
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tt_kas_mutasi_no_transaksi_index` (`no_transaksi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_mutasi_stok`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_mutasi_stok` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tanggal` date NOT NULL,
  `tipe_mutasi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sumber_transaksi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_transaksi` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_gudang` bigint unsigned NOT NULL,
  `id_barang` bigint unsigned NOT NULL,
  `id_botol` bigint unsigned DEFAULT NULL,
  `qty_ml` decimal(15,2) NOT NULL,
  `stok_sebelum_ml` decimal(15,2) NOT NULL,
  `stok_sesudah_ml` decimal(15,2) NOT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tt_mutasi_stok_id_gudang_foreign` (`id_gudang`),
  KEY `tt_mutasi_stok_id_barang_foreign` (`id_barang`),
  CONSTRAINT `tt_mutasi_stok_id_barang_foreign` FOREIGN KEY (`id_barang`) REFERENCES `tm_barang_bibit` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tt_mutasi_stok_id_gudang_foreign` FOREIGN KEY (`id_gudang`) REFERENCES `tm_gudang` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_pembelian`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_pembelian` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `no_pembelian` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal` date NOT NULL,
  `id_supplier` bigint unsigned NOT NULL,
  `id_gudang` bigint unsigned NOT NULL,
  `total_qty_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_qty_botol` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_pembelian` decimal(15,2) NOT NULL DEFAULT '0.00',
  `jumlah_bayar` decimal(15,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `metode_pembayaran` enum('CASH','TRANSFER','TEMPO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_pembayaran` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jatuh_tempo` date DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tt_pembelian_no_pembelian_unique` (`no_pembelian`),
  KEY `tt_pembelian_id_supplier_foreign` (`id_supplier`),
  KEY `tt_pembelian_id_gudang_foreign` (`id_gudang`),
  CONSTRAINT `tt_pembelian_id_gudang_foreign` FOREIGN KEY (`id_gudang`) REFERENCES `tm_gudang` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tt_pembelian_id_supplier_foreign` FOREIGN KEY (`id_supplier`) REFERENCES `tm_supplier` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_pembelian_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_pembelian_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_pembelian` bigint unsigned NOT NULL,
  `tipe_item` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BIBIT',
  `item_id` bigint unsigned DEFAULT NULL,
  `nama_item` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_barang` bigint unsigned DEFAULT NULL,
  `id_botol` bigint unsigned DEFAULT NULL,
  `qty_input` decimal(15,2) NOT NULL,
  `satuan_input` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qty_ml` decimal(15,2) NOT NULL,
  `konversi_qty_dasar` decimal(15,2) DEFAULT NULL,
  `satuan_dasar` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ML',
  `harga` decimal(15,2) DEFAULT NULL,
  `harga_beli_per_ml` decimal(15,2) NOT NULL,
  `subtotal` decimal(15,2) NOT NULL,
  `discount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tt_pembelian_detail_id_pembelian_foreign` (`id_pembelian`),
  KEY `tt_pembelian_detail_id_barang_foreign` (`id_barang`),
  CONSTRAINT `tt_pembelian_detail_id_barang_foreign` FOREIGN KEY (`id_barang`) REFERENCES `tm_barang_bibit` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tt_pembelian_detail_id_pembelian_foreign` FOREIGN KEY (`id_pembelian`) REFERENCES `tt_pembelian` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_penjualan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_penjualan` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `no_penjualan` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal` date NOT NULL,
  `id_customer` bigint unsigned DEFAULT NULL,
  `manual_customer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipe_penjualan` enum('RETAIL','GROSIR','BOTOL_KOSONG') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_sales` bigint unsigned DEFAULT NULL,
  `id_gudang` bigint unsigned NOT NULL,
  `total_qty_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_qty_botol` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_penjualan` decimal(15,2) NOT NULL DEFAULT '0.00',
  `jumlah_bayar` decimal(15,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_modal` decimal(15,2) NOT NULL DEFAULT '0.00',
  `laba_kotor` decimal(15,2) NOT NULL DEFAULT '0.00',
  `metode_pembayaran` enum('CASH','TRANSFER','TEMPO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_pembayaran` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jatuh_tempo` date DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tt_penjualan_no_penjualan_unique` (`no_penjualan`),
  KEY `tt_penjualan_id_customer_foreign` (`id_customer`),
  KEY `tt_penjualan_id_sales_foreign` (`id_sales`),
  KEY `tt_penjualan_id_gudang_foreign` (`id_gudang`),
  CONSTRAINT `tt_penjualan_id_customer_foreign` FOREIGN KEY (`id_customer`) REFERENCES `tm_customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tt_penjualan_id_gudang_foreign` FOREIGN KEY (`id_gudang`) REFERENCES `tm_gudang` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tt_penjualan_id_sales_foreign` FOREIGN KEY (`id_sales`) REFERENCES `tm_sales` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_penjualan_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_penjualan_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_penjualan` bigint unsigned NOT NULL,
  `tipe_item` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BIBIT',
  `item_id` bigint unsigned DEFAULT NULL,
  `nama_item` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_barang` bigint unsigned DEFAULT NULL,
  `id_botol` bigint unsigned DEFAULT NULL,
  `qty_input` decimal(15,2) NOT NULL DEFAULT '0.00',
  `satuan_input` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ML',
  `qty_ml` decimal(15,2) NOT NULL,
  `konversi_qty_dasar` decimal(15,2) DEFAULT NULL,
  `satuan_dasar` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ML',
  `harga` decimal(15,2) DEFAULT NULL,
  `harga_beli_per_ml` decimal(15,2) NOT NULL,
  `harga_jual_per_ml` decimal(15,2) NOT NULL,
  `subtotal_modal` decimal(15,2) NOT NULL,
  `subtotal_jual` decimal(15,2) NOT NULL,
  `laba_kotor` decimal(15,2) NOT NULL,
  `discount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tt_penjualan_detail_id_penjualan_foreign` (`id_penjualan`),
  KEY `tt_penjualan_detail_id_barang_foreign` (`id_barang`),
  CONSTRAINT `tt_penjualan_detail_id_barang_foreign` FOREIGN KEY (`id_barang`) REFERENCES `tm_barang_bibit` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tt_penjualan_detail_id_penjualan_foreign` FOREIGN KEY (`id_penjualan`) REFERENCES `tt_penjualan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_piutang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_piutang` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `no_piutang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal` date NOT NULL,
  `id_customer` bigint unsigned NOT NULL,
  `id_penjualan` bigint unsigned NOT NULL,
  `total_piutang` decimal(15,2) NOT NULL,
  `total_bayar` decimal(15,2) NOT NULL DEFAULT '0.00',
  `sisa_piutang` decimal(15,2) NOT NULL,
  `status_piutang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `jatuh_tempo` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tt_piutang_no_piutang_unique` (`no_piutang`),
  KEY `tt_piutang_id_customer_foreign` (`id_customer`),
  KEY `tt_piutang_id_penjualan_foreign` (`id_penjualan`),
  CONSTRAINT `tt_piutang_id_customer_foreign` FOREIGN KEY (`id_customer`) REFERENCES `tm_customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tt_piutang_id_penjualan_foreign` FOREIGN KEY (`id_penjualan`) REFERENCES `tt_penjualan` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_piutang_supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_piutang_supplier` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `no_piutang_supplier` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal` date NOT NULL,
  `id_supplier` bigint unsigned NOT NULL,
  `total_piutang` decimal(15,2) NOT NULL,
  `total_bayar` decimal(15,2) NOT NULL DEFAULT '0.00',
  `sisa_piutang` decimal(15,2) NOT NULL,
  `status_piutang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `jatuh_tempo` date DEFAULT NULL,
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tt_piutang_supplier_no_piutang_supplier_unique` (`no_piutang_supplier`),
  KEY `tt_piutang_supplier_id_supplier_foreign` (`id_supplier`),
  CONSTRAINT `tt_piutang_supplier_id_supplier_foreign` FOREIGN KEY (`id_supplier`) REFERENCES `tm_supplier` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_saldo_barang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_saldo_barang` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tanggal` date NOT NULL,
  `id_gudang` bigint unsigned NOT NULL,
  `id_barang` bigint unsigned NOT NULL,
  `id_botol` bigint unsigned NOT NULL DEFAULT '0',
  `stok_awal_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `masuk_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `keluar_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `stok_akhir_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `minimum_stok_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_mutasi` int unsigned NOT NULL DEFAULT '0',
  `terakhir_mutasi` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tt_saldo_barang_item_unique` (`id_gudang`,`id_barang`,`id_botol`),
  KEY `tt_saldo_barang_id_barang_foreign` (`id_barang`),
  KEY `tt_saldo_barang_tanggal_index` (`tanggal`),
  CONSTRAINT `tt_saldo_barang_id_barang_foreign` FOREIGN KEY (`id_barang`) REFERENCES `tm_barang_bibit` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tt_saldo_barang_id_gudang_foreign` FOREIGN KEY (`id_gudang`) REFERENCES `tm_gudang` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_stok_gudang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_stok_gudang` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_gudang` bigint unsigned NOT NULL,
  `id_barang` bigint unsigned NOT NULL,
  `id_botol` bigint unsigned DEFAULT NULL,
  `stok_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `stok_reserved_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `minimum_stok_ml` decimal(15,2) NOT NULL DEFAULT '0.00',
  `last_update` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tt_stok_gudang_gudang_barang_botol_unique` (`id_gudang`,`id_barang`,`id_botol`),
  KEY `tt_stok_gudang_id_barang_foreign` (`id_barang`),
  CONSTRAINT `tt_stok_gudang_id_gudang_foreign` FOREIGN KEY (`id_gudang`) REFERENCES `tm_gudang` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tt_toko_closing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tt_toko_closing` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tanggal_tutup` date NOT NULL,
  `saldo_awal` decimal(15,2) NOT NULL DEFAULT '0.00',
  `saldo_akhir` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_penjualan` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_pembelian` decimal(15,2) NOT NULL DEFAULT '0.00',
  `keterangan` text COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tt_toko_closing_tanggal_tutup_unique` (`tanggal_tutup`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (1,'0001_01_01_000000_create_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (2,'0001_01_01_000001_create_cache_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (3,'0001_01_01_000002_create_jobs_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (4,'2026_06_18_000001_create_perfume_business_tables',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (5,'2026_06_18_000002_add_access_menu_to_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (6,'2026_06_18_000003_create_supplier_receivables_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (7,'2026_06_18_000004_make_hutang_pembelian_nullable',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (8,'2026_06_19_000001_extend_perfume_items_and_cash',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (9,'2026_06_20_000001_update_business_tables',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (10,'2026_06_20_000002_create_tp_system_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (11,'2026_06_22_000001_add_botol_to_barang_bibit',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (12,'2026_06_24_000001_add_bottle_pricing_to_barang_bibit',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (13,'2026_06_27_000001_create_tp_app_settings_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (14,'2026_06_27_000002_drop_email_nohp_from_users',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (15,'2026_06_27_000003_add_owner_role_to_users',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (16,'2026_06_27_000003_add_receipt_templates_to_tp_app_settings',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (17,'2026_06_27_000004_add_kasir_role',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (18,'2026_06_27_000005_create_tm_botol_kosong_table',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (19,'2026_06_27_000006_add_gudang_to_tm_botol_kosong_table',3);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (20,'2026_06_27_142044_add_id_botol_to_transaction_details',4);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (21,'2026_06_27_144030_add_id_botol_to_stok_gudang_and_mutasi',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (22,'2026_06_27_150000_add_tipe_gudang_to_tm_gudang',6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (23,'2026_06_28_000001_create_barang_balance_tables',7);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (24,'2026_06_28_000002_backfill_active_barang_balances',7);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (25,'2026_07_05_000001_create_tt_botol_kosong_table',8);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (26,'2026_07_05_000002_backfill_tt_botol_kosong',9);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (27,'2026_07_05_000003_create_tt_barang_bibit_table',10);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (28,'2026_07_05_000001_drop_kapasitas_from_tm_botol_kosong',11);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (29,'2026_07_28_000001_add_gudang_to_barang_bibit',11);
