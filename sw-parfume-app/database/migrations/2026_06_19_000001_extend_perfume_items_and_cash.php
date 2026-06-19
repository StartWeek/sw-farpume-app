<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tm_botol', function (Blueprint $table): void {
            $table->id();
            $table->string('kode_botol')->unique();
            $table->unsignedInteger('varian_ml');
            $table->string('nama_botol');
            $table->unsignedInteger('isi_per_dus')->default(1);
            $table->decimal('harga_beli_per_botol', 15, 2)->default(0);
            $table->decimal('harga_jual_per_botol', 15, 2)->default(0);
            $table->decimal('harga_jual_per_dus', 15, 2)->default(0);
            $table->decimal('stock_botol', 15, 2)->default(0);
            $table->enum('status', ['AKTIF', 'NONAKTIF'])->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('tt_kas_mutasi', function (Blueprint $table): void {
            $table->id();
            $table->date('tanggal');
            $table->string('no_transaksi')->index();
            $table->string('jenis_transaksi');
            $table->string('sumber_transaksi');
            $table->string('pihak')->nullable();
            $table->decimal('kas_masuk', 15, 2)->default(0);
            $table->decimal('kas_keluar', 15, 2)->default(0);
            $table->decimal('saldo_akhir', 15, 2)->default(0);
            $table->text('keterangan')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });

        Schema::table('tm_barang_bibit', function (Blueprint $table): void {
            $table->string('jenis_barang')->default('BIBIT')->after('nama_barang');
        });

        Schema::table('tt_pembelian', function (Blueprint $table): void {
            $table->decimal('total_qty_botol', 15, 2)->default(0)->after('total_qty_ml');
            $table->decimal('jumlah_bayar', 15, 2)->default(0)->after('total_pembelian');
        });

        Schema::table('tt_penjualan', function (Blueprint $table): void {
            $table->decimal('total_qty_botol', 15, 2)->default(0)->after('total_qty_ml');
            $table->decimal('jumlah_bayar', 15, 2)->default(0)->after('total_penjualan');
        });

        Schema::table('tt_pembelian_detail', function (Blueprint $table): void {
            $table->unsignedBigInteger('id_barang')->nullable()->change();
            $table->string('tipe_item')->default('BIBIT')->after('id_pembelian');
            $table->unsignedBigInteger('item_id')->nullable()->after('tipe_item');
            $table->string('nama_item')->nullable()->after('item_id');
            $table->decimal('konversi_qty_dasar', 15, 2)->nullable()->after('qty_ml');
            $table->string('satuan_dasar')->default('ML')->after('konversi_qty_dasar');
            $table->decimal('harga', 15, 2)->nullable()->after('satuan_dasar');
        });

        Schema::table('tt_penjualan_detail', function (Blueprint $table): void {
            $table->unsignedBigInteger('id_barang')->nullable()->change();
            $table->string('tipe_item')->default('BIBIT')->after('id_penjualan');
            $table->unsignedBigInteger('item_id')->nullable()->after('tipe_item');
            $table->string('nama_item')->nullable()->after('item_id');
            $table->decimal('qty_input', 15, 2)->default(0)->after('id_barang');
            $table->string('satuan_input')->default('ML')->after('qty_input');
            $table->decimal('konversi_qty_dasar', 15, 2)->nullable()->after('qty_ml');
            $table->string('satuan_dasar')->default('ML')->after('konversi_qty_dasar');
            $table->decimal('harga', 15, 2)->nullable()->after('satuan_dasar');
        });
    }

    public function down(): void
    {
        Schema::table('tt_penjualan_detail', function (Blueprint $table): void {
            $table->dropColumn(['tipe_item', 'item_id', 'nama_item', 'qty_input', 'satuan_input', 'konversi_qty_dasar', 'satuan_dasar', 'harga']);
            $table->unsignedBigInteger('id_barang')->nullable(false)->change();
        });

        Schema::table('tt_pembelian_detail', function (Blueprint $table): void {
            $table->dropColumn(['tipe_item', 'item_id', 'nama_item', 'konversi_qty_dasar', 'satuan_dasar', 'harga']);
            $table->unsignedBigInteger('id_barang')->nullable(false)->change();
        });

        Schema::table('tt_penjualan', function (Blueprint $table): void {
            $table->dropColumn(['total_qty_botol', 'jumlah_bayar']);
        });

        Schema::table('tt_pembelian', function (Blueprint $table): void {
            $table->dropColumn(['total_qty_botol', 'jumlah_bayar']);
        });

        Schema::table('tm_barang_bibit', function (Blueprint $table): void {
            $table->dropColumn('jenis_barang');
        });

        Schema::dropIfExists('tt_kas_mutasi');
        Schema::dropIfExists('tm_botol');
    }
};
