<?php

namespace Tests\Feature;

use App\Models\Business\BarangBibit;
use App\Models\Business\Brand;
use App\Models\Business\Gudang;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BarangBibitMasterTest extends TestCase
{
    use RefreshDatabase;

    public function test_barang_bibit_can_be_bound_to_a_warehouse(): void
    {
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $user = User::query()->create([
            'username' => 'barang-bibit-admin',
            'name' => 'Barang Bibit Admin',
            'password' => 'secret',
            'role' => 'superadmin',
        ]);

        $brand = Brand::query()->create([
            'kode_brand' => 'BRD-BB-001',
            'nama_brand' => 'Brand Test',
            'status' => 'AKTIF',
        ]);

        $gudang = Gudang::query()->create([
            'kode_gudang' => 'GDG-BB-001',
            'nama_gudang' => 'Gudang Bibit',
            'tipe_gudang' => 'BIBIT',
            'status' => 'AKTIF',
        ]);

        $this->actingAs($user)
            ->post('/admin/barang-bibit', [
                'nama_barang' => 'Lavender Test',
                'id_brand' => $brand->id,
                'id_gudang' => $gudang->id,
                'id_botol' => null,
                'jenis_barang' => 'BIBIT',
                'harga_beli_per_ml' => 120,
                'harga_jual_retail_per_ml' => 150,
                'harga_jual_grosir_per_ml' => 140,
                'minimum_stok_ml' => 100,
                'status' => 'AKTIF',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('tm_barang_bibit', [
            'nama_barang' => 'LAVENDER TEST',
            'id_gudang' => $gudang->id,
        ]);
    }
}
