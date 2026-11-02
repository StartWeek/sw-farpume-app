<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tm_barang_supplier', function (Blueprint $table): void {
            $table->foreignId('id_barang')->constrained('tm_barang_bibit')->cascadeOnDelete();
            $table->foreignId('id_supplier')->constrained('tm_supplier')->cascadeOnDelete();
            $table->primary(['id_barang', 'id_supplier']);
            $table->index('id_supplier');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tm_barang_supplier');
    }
};
