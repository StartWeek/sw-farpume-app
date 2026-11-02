<?php

namespace Tests\Feature;

use App\Http\Controllers\Admin\Business\BarangBibitController;
use App\Models\Business\BarangBibit;
use App\Services\Business\BusinessService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class BarangSupplierTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Schema::create('tm_brand', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_brand');
        });
        Schema::create('tm_supplier', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_supplier');
            $table->string('status')->default('AKTIF');
        });
        Schema::create('tm_barang_bibit', function (Blueprint $table): void {
            $table->id();
            $table->string('kode_barang')->unique();
            $table->string('nama_barang');
            $table->string('jenis_barang');
            $table->string('satuan_dasar');
            $table->unsignedBigInteger('id_brand');
            $table->unsignedBigInteger('id_botol')->nullable();
            $table->timestamps();
        });
        Schema::create('tt_stok_gudang', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('id_barang');
            $table->decimal('stok_ml', 15, 2)->default(0);
        });
        (require database_path('migrations/2026_11_02_000001_create_barang_supplier_table.php'))->up();
        DB::table('tm_brand')->insert(['id' => 1, 'nama_brand' => 'Brand']);
        DB::table('tm_supplier')->insert([
            ['id' => 1, 'nama_supplier' => 'Supplier A', 'status' => 'AKTIF'],
            ['id' => 2, 'nama_supplier' => 'Supplier B', 'status' => 'AKTIF'],
            ['id' => 3, 'nama_supplier' => 'Supplier Lama', 'status' => 'NONAKTIF'],
        ]);
    }

    public function test_create_update_and_clear_multiple_suppliers_without_changing_other_items(): void
    {
        $business = new BusinessService;
        $payload = ['nama_barang' => 'BACARAT', 'id_brand' => 1, 'jenis_barang' => 'BIBIT', 'supplier_ids' => [1, 2]];
        $barang = $business->createBarang($payload);
        $absolute = $business->createBarang([...$payload, 'nama_barang' => 'Absolute', 'jenis_barang' => 'ABSOLUTE', 'supplier_ids' => [2]]);
        $this->assertEqualsCanonicalizing([1, 2], $barang->suppliers()->pluck('tm_supplier.id')->all());
        $business->updateBarang($barang, [...$payload, 'supplier_ids' => [2]]);
        $this->assertSame([2], $barang->suppliers()->pluck('tm_supplier.id')->all());
        $business->updateBarang($barang, [...$payload, 'supplier_ids' => []]);
        $this->assertSame(0, $barang->suppliers()->count());
        $this->assertSame([2], $absolute->suppliers()->pluck('tm_supplier.id')->all());
        $this->assertSame(2, BarangBibit::query()->count());
    }

    public function test_master_rejects_duplicate_missing_and_inactive_supplier_ids(): void
    {
        $controller = new BarangBibitController(new BusinessService);
        $allRules = (new \ReflectionClass($controller))->getMethod('rules')->invoke($controller);
        $rules = array_intersect_key($allRules, array_flip(['supplier_ids', 'supplier_ids.*']));
        foreach ([[1, 2], []] as $ids) {
            $this->assertTrue(validator(['supplier_ids' => $ids], $rules)->passes());
        }
        foreach ([[1, 1], [999], [3], ['invalid']] as $ids) {
            $this->assertFalse(validator(['supplier_ids' => $ids], $rules)->passes());
        }
    }
}
