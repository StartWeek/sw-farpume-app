<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tm_botol_kosong')) {
            Schema::create('tm_botol_kosong', function (Blueprint $table): void {
                $table->id();
                $table->string('kode_botol')->unique();
                $table->foreignId('id_gudang')->nullable()->constrained('tm_gudang')->nullOnDelete();
                $table->string('nama_botol');
                $table->unsignedInteger('kapasitas')->default(0);
                $table->decimal('harga_beli', 15, 2)->default(0);
                $table->decimal('harga_jual', 15, 2)->default(0);
                $table->decimal('stock', 15, 2)->default(0);
                $table->string('satuan')->default('BOTOL');
                $table->enum('status', ['AKTIF', 'NONAKTIF'])->default('AKTIF');
                $table->text('keterangan')->nullable();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('tm_botol_kosong') && ! Schema::hasColumn('tm_botol_kosong', 'id_gudang')) {
            Schema::table('tm_botol_kosong', function (Blueprint $table): void {
                $table->foreignId('id_gudang')->nullable()->after('kode_botol')->constrained('tm_gudang')->nullOnDelete();
            });
        }

        if (Schema::hasTable('tt_penjualan') && Schema::hasColumn('tt_penjualan', 'tipe_penjualan')) {
            Schema::table('tt_penjualan', function (Blueprint $table): void {
                $table->enum('tipe_penjualan', ['RETAIL', 'GROSIR', 'BOTOL_KOSONG'])->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tt_penjualan') && Schema::hasColumn('tt_penjualan', 'tipe_penjualan')) {
            Schema::table('tt_penjualan', function (Blueprint $table): void {
                $table->enum('tipe_penjualan', ['RETAIL', 'GROSIR'])->change();
            });
        }

        Schema::dropIfExists('tm_botol_kosong');
    }
};
