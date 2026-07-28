<?php

namespace Tests\Feature;

use App\Models\Business\Supplier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SupplierWarehouseColumnsTest extends TestCase
{
    use RefreshDatabase;

    public function test_supplier_table_has_gudang_fields(): void
    {
        $this->assertTrue(Schema::hasColumn('tm_supplier', 'id_gudang'));
        $this->assertTrue(Schema::hasColumn('tm_supplier', 'tipe_gudang'));
    }

    public function test_supplier_create_persists_tipe_gudang(): void
    {
        $supplier = Supplier::query()->create([
            'kode_supplier' => 'SUP-TEST-001',
            'nama_supplier' => 'Supplier Test',
            'tipe_gudang' => 'BOTOL',
            'status' => 'AKTIF',
        ]);

        $this->assertSame('BOTOL', $supplier->fresh()->tipe_gudang);
    }
}
