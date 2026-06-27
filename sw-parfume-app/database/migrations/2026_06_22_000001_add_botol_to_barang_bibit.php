<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tm_barang_bibit', function (Blueprint $table): void {
            $table->foreignId('id_botol')
                ->nullable()
                ->after('id_brand')
                ->constrained('tm_botol')
                ->cascadeOnUpdate()
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tm_barang_bibit', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('id_botol');
        });
    }
};
