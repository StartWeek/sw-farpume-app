<?php

namespace Tests\Feature;

use App\Http\Controllers\Admin\Business\BarangBibitController;
use App\Http\Controllers\Admin\Business\MasterController;
use App\Models\Business\BarangBibit;
use App\Models\Business\Brand;
use App\Services\Business\BusinessService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MasterStatusTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('tm_brand', function (Blueprint $table): void {
            $table->id();
            $table->string('kode_brand')->unique();
            $table->string('nama_brand');
            $table->string('status');
            $table->timestamps();
        });
    }

    public function test_all_master_forms_and_rules_exclude_status(): void
    {
        $controller = new MasterController(new BusinessService);
        $reflection = new \ReflectionClass($controller);

        foreach (array_keys(BusinessService::MASTERS) as $resource) {
            $fields = $reflection->getMethod('fields')->invoke($controller, $resource);
            $rules = $reflection->getMethod('rules')->invoke($controller, $resource);

            $this->assertNotContains('status', array_column($fields, 'name'), $resource);
            $this->assertArrayNotHasKey('status', $rules, $resource);
        }

        $barang = new BarangBibitController(new BusinessService);
        $rules = (new \ReflectionClass($barang))->getMethod('rules')->invoke($barang);
        $this->assertArrayNotHasKey('status', $rules);
    }

    public function test_new_master_is_active_without_a_status_input(): void
    {
        $controller = new MasterController(new BusinessService);
        $controller->store(Request::create('/admin/master/brand', 'POST', [
            'nama_brand' => 'Brand Baru',
        ]), 'brand');

        $this->assertDatabaseHas('tm_brand', ['nama_brand' => 'BRAND BARU', 'status' => 'AKTIF']);
    }

    public function test_client_cannot_create_or_change_master_status(): void
    {
        $controller = new MasterController(new BusinessService);
        $controller->store(Request::create('/admin/master/brand', 'POST', [
            'nama_brand' => 'Brand Baru',
            'status' => 'NONAKTIF',
        ]), 'brand');
        $brand = Brand::query()->firstOrFail();
        $this->assertSame('AKTIF', $brand->status);

        $brand->update(['status' => 'NONAKTIF']);
        $controller->update(Request::create('/admin/master/brand/'.$brand->id, 'PUT', [
            'nama_brand' => 'Brand Edit',
            'status' => 'AKTIF',
        ]), 'brand', $brand->id);

        $this->assertSame('NONAKTIF', $brand->refresh()->status);
        $this->assertSame('BRAND EDIT', $brand->nama_brand);
    }

    public function test_barang_creation_defaults_to_active_and_edit_preserves_status(): void
    {
        $brand = Brand::query()->create([
            'kode_brand' => 'BRD-0001',
            'nama_brand' => 'Brand',
            'status' => 'AKTIF',
        ]);
        $payload = [
            'nama_barang' => 'Bibit Test',
            'id_brand' => $brand->id,
            'jenis_barang' => 'BIBIT',
            'harga_beli_per_ml' => 1,
            'harga_jual_retail_per_ml' => 2,
            'harga_jual_grosir_per_ml' => 2,
            'minimum_stok_ml' => 0,
        ];
        $barang = new BarangBibit(['status' => 'NONAKTIF']);
        $business = $this->createMock(BusinessService::class);
        $business->expects($this->once())->method('createBarang')
            ->with($this->callback(fn (array $data): bool => $data['status'] === 'AKTIF'))
            ->willReturn($barang);
        $business->expects($this->once())->method('updateBarang')
            ->with($barang, $this->callback(fn (array $data): bool => ! array_key_exists('status', $data)))
            ->willReturn($barang);

        $controller = new BarangBibitController($business);
        $controller->store(Request::create('/admin/barang-bibit', 'POST', $payload));
        $controller->update(Request::create('/admin/barang-bibit/1', 'PUT', [
            ...$payload, 'status' => 'AKTIF',
        ]), $barang);
        $this->assertSame('NONAKTIF', $barang->status);
    }
}
