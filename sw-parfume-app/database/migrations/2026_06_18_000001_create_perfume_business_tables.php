<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tm_wangi', function (Blueprint $table) {
            $table->id();
            $table->string('kode_wangi')->unique();
            $table->string('nama_wangi');
            $table->string('kategori_aroma')->nullable();
            $table->enum('status', ['AKTIF', 'NONAKTIF'])->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('tm_brand', function (Blueprint $table) {
            $table->id();
            $table->string('kode_brand')->unique();
            $table->string('nama_brand');
            $table->string('negara_asal')->nullable();
            $table->text('keterangan')->nullable();
            $table->enum('status', ['AKTIF', 'NONAKTIF'])->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('tm_gudang', function (Blueprint $table) {
            $table->id();
            $table->string('kode_gudang')->unique();
            $table->string('nama_gudang');
            $table->text('alamat')->nullable();
            $table->enum('status', ['AKTIF', 'NONAKTIF'])->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('tm_supplier', function (Blueprint $table) {
            $table->id();
            $table->string('kode_supplier')->unique();
            $table->string('nama_supplier');
            $table->string('no_hp')->nullable();
            $table->text('alamat')->nullable();
            $table->text('keterangan')->nullable();
            $table->enum('status', ['AKTIF', 'NONAKTIF'])->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('tm_customer', function (Blueprint $table) {
            $table->id();
            $table->string('kode_customer')->unique();
            $table->string('nama_customer');
            $table->enum('tipe_customer', ['RETAIL', 'GROSIR', 'TOKO'])->default('RETAIL');
            $table->string('no_hp')->nullable();
            $table->text('alamat')->nullable();
            $table->decimal('limit_piutang', 15, 2)->default(0);
            $table->enum('status', ['AKTIF', 'NONAKTIF'])->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('tm_sales', function (Blueprint $table) {
            $table->id();
            $table->string('kode_sales')->unique();
            $table->string('nama_sales');
            $table->string('no_hp')->nullable();
            $table->text('alamat')->nullable();
            $table->enum('status', ['AKTIF', 'NONAKTIF'])->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('tm_barang_bibit', function (Blueprint $table) {
            $table->id();
            $table->string('kode_barang')->unique();
            $table->foreignId('id_wangi')->constrained('tm_wangi')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('id_brand')->constrained('tm_brand')->cascadeOnUpdate()->restrictOnDelete();
            $table->string('nama_barang');
            $table->decimal('harga_beli_per_ml', 15, 2)->default(0);
            $table->decimal('harga_jual_retail_per_ml', 15, 2)->default(0);
            $table->decimal('harga_jual_grosir_per_ml', 15, 2)->default(0);
            $table->decimal('minimum_stok_ml', 15, 2)->default(0);
            $table->string('satuan_dasar')->default('ML');
            $table->enum('status', ['AKTIF', 'NONAKTIF'])->default('AKTIF');
            $table->timestamps();

            $table->unique(['id_wangi', 'id_brand']);
        });

        Schema::create('tt_stok_gudang', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_gudang')->constrained('tm_gudang')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('id_barang')->constrained('tm_barang_bibit')->cascadeOnUpdate()->restrictOnDelete();
            $table->decimal('stok_ml', 15, 2)->default(0);
            $table->decimal('stok_reserved_ml', 15, 2)->default(0);
            $table->decimal('minimum_stok_ml', 15, 2)->default(0);
            $table->timestamp('last_update')->nullable();
            $table->timestamps();

            $table->unique(['id_gudang', 'id_barang']);
        });

        Schema::create('tt_mutasi_stok', function (Blueprint $table) {
            $table->id();
            $table->date('tanggal');
            $table->string('tipe_mutasi');
            $table->string('sumber_transaksi');
            $table->string('no_transaksi');
            $table->foreignId('id_gudang')->constrained('tm_gudang')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('id_barang')->constrained('tm_barang_bibit')->cascadeOnUpdate()->restrictOnDelete();
            $table->decimal('qty_ml', 15, 2);
            $table->decimal('stok_sebelum_ml', 15, 2);
            $table->decimal('stok_sesudah_ml', 15, 2);
            $table->text('keterangan')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('tt_pembelian', function (Blueprint $table) {
            $table->id();
            $table->string('no_pembelian')->unique();
            $table->date('tanggal');
            $table->foreignId('id_supplier')->constrained('tm_supplier')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('id_gudang')->constrained('tm_gudang')->cascadeOnUpdate()->restrictOnDelete();
            $table->decimal('total_qty_ml', 15, 2)->default(0);
            $table->decimal('total_pembelian', 15, 2)->default(0);
            $table->enum('metode_pembayaran', ['CASH', 'TRANSFER', 'TEMPO']);
            $table->string('status_pembayaran');
            $table->date('jatuh_tempo')->nullable();
            $table->text('keterangan')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('tt_pembelian_detail', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_pembelian')->constrained('tt_pembelian')->cascadeOnUpdate()->cascadeOnDelete();
            $table->foreignId('id_barang')->constrained('tm_barang_bibit')->cascadeOnUpdate()->restrictOnDelete();
            $table->decimal('qty_input', 15, 2);
            $table->string('satuan_input');
            $table->decimal('qty_ml', 15, 2);
            $table->decimal('harga_beli_per_ml', 15, 2);
            $table->decimal('subtotal', 15, 2);
            $table->timestamps();
        });

        Schema::create('tt_penjualan', function (Blueprint $table) {
            $table->id();
            $table->string('no_penjualan')->unique();
            $table->date('tanggal');
            $table->foreignId('id_customer')->constrained('tm_customer')->cascadeOnUpdate()->restrictOnDelete();
            $table->enum('tipe_penjualan', ['RETAIL', 'GROSIR']);
            $table->foreignId('id_sales')->nullable()->constrained('tm_sales')->cascadeOnUpdate()->nullOnDelete();
            $table->foreignId('id_gudang')->constrained('tm_gudang')->cascadeOnUpdate()->restrictOnDelete();
            $table->decimal('total_qty_ml', 15, 2)->default(0);
            $table->decimal('total_penjualan', 15, 2)->default(0);
            $table->decimal('total_modal', 15, 2)->default(0);
            $table->decimal('laba_kotor', 15, 2)->default(0);
            $table->enum('metode_pembayaran', ['CASH', 'TRANSFER', 'TEMPO']);
            $table->string('status_pembayaran');
            $table->date('jatuh_tempo')->nullable();
            $table->text('keterangan')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('tt_penjualan_detail', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_penjualan')->constrained('tt_penjualan')->cascadeOnUpdate()->cascadeOnDelete();
            $table->foreignId('id_barang')->constrained('tm_barang_bibit')->cascadeOnUpdate()->restrictOnDelete();
            $table->decimal('qty_ml', 15, 2);
            $table->decimal('harga_beli_per_ml', 15, 2);
            $table->decimal('harga_jual_per_ml', 15, 2);
            $table->decimal('subtotal_modal', 15, 2);
            $table->decimal('subtotal_jual', 15, 2);
            $table->decimal('laba_kotor', 15, 2);
            $table->timestamps();
        });

        Schema::create('tt_hutang', function (Blueprint $table) {
            $table->id();
            $table->string('no_hutang')->unique();
            $table->date('tanggal');
            $table->foreignId('id_supplier')->constrained('tm_supplier')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('id_pembelian')->nullable()->constrained('tt_pembelian')->cascadeOnUpdate()->nullOnDelete();
            $table->decimal('total_hutang', 15, 2);
            $table->decimal('total_bayar', 15, 2)->default(0);
            $table->decimal('sisa_hutang', 15, 2);
            $table->string('status_hutang')->default('OPEN');
            $table->date('jatuh_tempo')->nullable();
            $table->text('keterangan')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('tt_piutang', function (Blueprint $table) {
            $table->id();
            $table->string('no_piutang')->unique();
            $table->date('tanggal');
            $table->foreignId('id_customer')->constrained('tm_customer')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('id_penjualan')->constrained('tt_penjualan')->cascadeOnUpdate()->cascadeOnDelete();
            $table->decimal('total_piutang', 15, 2);
            $table->decimal('total_bayar', 15, 2)->default(0);
            $table->decimal('sisa_piutang', 15, 2);
            $table->string('status_piutang')->default('OPEN');
            $table->date('jatuh_tempo')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach ([
            'tt_piutang',
            'tt_hutang',
            'tt_penjualan_detail',
            'tt_penjualan',
            'tt_pembelian_detail',
            'tt_pembelian',
            'tt_mutasi_stok',
            'tt_stok_gudang',
            'tm_barang_bibit',
            'tm_sales',
            'tm_customer',
            'tm_supplier',
            'tm_gudang',
            'tm_brand',
            'tm_wangi',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
