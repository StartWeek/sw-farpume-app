<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tt_pembelian_detail', function (Blueprint $table): void {
            $table->unsignedBigInteger('id_botol')->nullable()->after('id_barang');
        });

        Schema::table('tt_penjualan_detail', function (Blueprint $table): void {
            $table->unsignedBigInteger('id_botol')->nullable()->after('id_barang');
        });
    }

    public function down(): void
    {
        Schema::table('tt_pembelian_detail', function (Blueprint $table): void {
            $table->dropColumn('id_botol');
        });

        Schema::table('tt_penjualan_detail', function (Blueprint $table): void {
            $table->dropColumn('id_botol');
        });
    }
};
