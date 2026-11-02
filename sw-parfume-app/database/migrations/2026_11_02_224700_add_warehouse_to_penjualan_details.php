<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tt_penjualan_detail', function (Blueprint $table): void {
            $table->foreignId('id_gudang')->nullable()->constrained('tm_gudang')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tt_penjualan_detail', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('id_gudang');
        });
    }
};
