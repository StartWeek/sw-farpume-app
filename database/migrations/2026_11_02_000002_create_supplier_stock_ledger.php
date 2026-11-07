<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tt_stok_supplier', function (Blueprint $table): void {
            $table->id();
            $table->string('item_type', 10);
            $table->unsignedBigInteger('item_id');
            $table->unsignedBigInteger('id_gudang');
            $table->unsignedBigInteger('id_supplier')->nullable();
            $table->unsignedBigInteger('id_botol')->nullable();
            $table->string('supplier_name');
            $table->string('kode_barang');
            $table->string('nama_barang');
            $table->string('unit', 5);
            $table->date('tanggal');
            $table->string('reference');
            $table->decimal('qty_received', 18, 2);
            $table->decimal('qty_remaining', 18, 2);
            $table->timestamps();
            $table->index(['item_type', 'item_id', 'id_gudang', 'id_botol'], 'supplier_stock_lookup');
            $table->index(['id_supplier', 'id_gudang']);
        });
        Schema::create('tt_mutasi_stok_supplier', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('stock_lot_id')->constrained('tt_stok_supplier')->restrictOnDelete();
            $table->date('tanggal');
            $table->string('direction', 10);
            $table->decimal('quantity', 18, 2);
            $table->decimal('balance_before', 18, 2);
            $table->decimal('balance_after', 18, 2);
            $table->string('reference');
            $table->string('source');
            $table->string('created_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['tanggal', 'direction']);
            $table->index('reference');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tt_mutasi_stok_supplier');
        Schema::dropIfExists('tt_stok_supplier');
    }
};
