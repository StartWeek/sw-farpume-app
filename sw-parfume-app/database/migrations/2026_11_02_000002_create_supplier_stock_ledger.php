<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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
        // Preserve only the existing opening quantity; never guess its supplier.
        $date = DB::table('tp_system')->where('id', 1)->value('tanggal_system') ?? today()->toDateString();
        $openingDate = \Illuminate\Support\Carbon::parse($date)->subDay()->toDateString();
        $insert = function ($row, string $type) use ($openingDate): void {
            $bottle = $type === 'BOTOL';
            $quantity = (float) ($bottle ? $row->stock : $row->stok_ml);
            if ($quantity <= 0) return;
            $lot = DB::table('tt_stok_supplier')->insertGetId([
                'item_type' => $type, 'item_id' => $bottle ? $row->id : $row->id_barang,
                'id_gudang' => $row->id_gudang, 'id_supplier' => null,
                'id_botol' => $bottle ? null : $row->id_botol,
                'supplier_name' => 'Saldo awal — supplier belum diketahui',
                'kode_barang' => $bottle ? $row->kode_botol : $row->kode_barang,
                'nama_barang' => $bottle ? $row->nama_botol : $row->nama_barang,
                'unit' => $bottle ? 'PCS' : 'ML', 'tanggal' => $openingDate,
                'reference' => 'OPENING', 'qty_received' => $quantity, 'qty_remaining' => $quantity,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('tt_mutasi_stok_supplier')->insert([
                'stock_lot_id' => $lot, 'tanggal' => $openingDate, 'direction' => 'MASUK',
                'quantity' => $quantity, 'balance_before' => 0, 'balance_after' => $quantity,
                'reference' => 'OPENING', 'source' => 'OPENING', 'created_at' => now(), 'updated_at' => now(),
            ]);
        };
        DB::table('tt_stok_gudang as s')->join('tm_barang_bibit as b', 'b.id', '=', 's.id_barang')
            ->select('s.*', 'b.kode_barang', 'b.nama_barang')->orderBy('s.id')->get()
            ->each(fn ($row) => $insert($row, 'BIBIT'));
        DB::table('tm_botol_kosong')->whereNotNull('id_gudang')->orderBy('id')->get()
            ->each(fn ($row) => $insert($row, 'BOTOL'));
    }

    public function down(): void
    {
        Schema::dropIfExists('tt_mutasi_stok_supplier');
        Schema::dropIfExists('tt_stok_supplier');
    }
};
