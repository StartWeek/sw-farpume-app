<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tm_barang_bibit', function (Blueprint $table) {
            $table->decimal('harga_beli_per_botol', 15, 2)->nullable()->default(0)->after('harga_jual_grosir_per_ml');
            $table->decimal('harga_jual_per_botol', 15, 2)->nullable()->default(0)->after('harga_beli_per_botol');
        });
    }

    public function down(): void
    {
        Schema::table('tm_barang_bibit', function (Blueprint $table) {
            $table->dropColumn(['harga_beli_per_botol', 'harga_jual_per_botol']);
        });
    }
};
