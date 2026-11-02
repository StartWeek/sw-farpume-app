<?php

namespace Tests\Feature;

use App\Http\Controllers\Admin\Business\BarangBibitController;
use App\Services\Business\BusinessService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BarangMasterStockTest extends TestCase
{
    public function test_master_totals_stock_across_warehouses_and_variants_for_each_item(): void
    {
        Schema::create('tm_brand', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_brand');
            $table->string('status')->default('AKTIF');
        });
        Schema::create('tm_gudang', function (Blueprint $table): void {
            $table->id();
            $table->string('kode_gudang');
            $table->string('nama_gudang');
            $table->string('tipe_gudang');
            $table->string('status')->default('AKTIF');
        });
        Schema::create('tm_barang_bibit', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_barang');
            $table->string('jenis_barang');
            $table->unsignedBigInteger('id_brand')->nullable();
            $table->unsignedBigInteger('id_gudang')->nullable();
        });
        Schema::create('tm_supplier', function (Blueprint $table): void {
            $table->id();
            $table->string('kode_supplier');
            $table->string('nama_supplier');
            $table->string('status')->default('AKTIF');
        });
        (require database_path('migrations/2026_11_02_000001_create_barang_supplier_table.php'))->up();
        Schema::create('tt_stok_gudang', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('id_barang');
            $table->unsignedBigInteger('id_gudang');
            $table->unsignedBigInteger('id_botol');
            $table->decimal('stok_ml', 15, 2);
        });
        DB::table('tm_barang_bibit')->insert([
            ['id' => 1, 'nama_barang' => 'Bibit', 'jenis_barang' => 'BIBIT'],
            ['id' => 2, 'nama_barang' => 'Absolute', 'jenis_barang' => 'ABSOLUTE'],
            ['id' => 3, 'nama_barang' => 'Tanpa Stok', 'jenis_barang' => 'BIBIT'],
            ['id' => 4, 'nama_barang' => 'Stok Habis', 'jenis_barang' => 'BIBIT'],
        ]);
        DB::table('tm_gudang')->insert([
            ['id' => 1, 'kode_gudang' => 'GD-1', 'nama_gudang' => 'Cairan', 'tipe_gudang' => 'BIBIT', 'status' => 'AKTIF'],
            ['id' => 2, 'kode_gudang' => 'GD-2', 'nama_gudang' => 'Botol', 'tipe_gudang' => 'BOTOL', 'status' => 'AKTIF'],
            ['id' => 3, 'kode_gudang' => 'GD-3', 'nama_gudang' => 'Cairan Lama', 'tipe_gudang' => 'BIBIT', 'status' => 'NONAKTIF'],
        ]);
        DB::table('tt_stok_gudang')->insert([
            ['id_barang' => 1, 'id_gudang' => 1, 'id_botol' => 1, 'stok_ml' => 100],
            ['id_barang' => 1, 'id_gudang' => 1, 'id_botol' => 2, 'stok_ml' => 50.25],
            ['id_barang' => 1, 'id_gudang' => 2, 'id_botol' => 1, 'stok_ml' => 10.5],
            ['id_barang' => 2, 'id_gudang' => 1, 'id_botol' => 1, 'stok_ml' => 99],
            ['id_barang' => 4, 'id_gudang' => 1, 'id_botol' => 1, 'stok_ml' => 0],
        ]);

        $request = Request::create('/admin/barang-bibit', 'GET');
        $request->headers->set('X-Inertia', 'true');
        $response = (new BarangBibitController(new BusinessService))->index()->toResponse($request);
        $props = json_decode($response->getContent(), true, 512, JSON_THROW_ON_ERROR)['props'];
        $rows = collect($props['rows']['data'])->keyBy('id');

        $this->assertSame(160.75, (float) $rows[1]['stok_saat_ini_ml']);
        $this->assertSame(99.0, (float) $rows[2]['stok_saat_ini_ml']);
        $this->assertNull($rows[3]['stok_saat_ini_ml']);
        $this->assertSame(0.0, (float) $rows[4]['stok_saat_ini_ml']);
        $this->assertSame(4, $props['rows']['total']);
        $this->assertSame([1], array_column($props['gudang'], 'id'));

        $controller = new BarangBibitController(new BusinessService);
        $rules = (new \ReflectionClass($controller))->getMethod('rules')->invoke($controller);
        foreach ([1 => true, 2 => false, 3 => false, 999 => false] as $warehouse => $valid) {
            foreach (['BIBIT', 'ABSOLUTE'] as $type) {
                $validator = validator(
                    ['id_gudang' => $warehouse, 'jenis_barang' => $type],
                    ['id_gudang' => $rules['id_gudang'], 'jenis_barang' => $rules['jenis_barang']],
                );
                $this->assertSame($valid, $validator->passes(), $type.' warehouse '.$warehouse);
            }
        }
        $this->assertTrue(validator(['id_gudang' => null], ['id_gudang' => $rules['id_gudang']])->passes());
    }
}
