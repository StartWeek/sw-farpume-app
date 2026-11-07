<?php

namespace Tests\Feature;

use App\Models\Business\Botol;
use App\Models\Business\BarangBibit;
use App\Models\Business\Brand;
use App\Models\Business\Gudang;
use App\Models\Business\StokGudang;
use App\Models\Business\Supplier;
use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BottlePurchaseStockTest extends TestCase
{
    use RefreshDatabase;

    public function test_supplier_bottle_purchase_updates_master_bottle_stock(): void
    {
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $user = User::query()->create([
            'username' => 'bottle-purchase-admin',
            'name' => 'Bottle Purchase Admin',
            'password' => 'secret',
            'role' => 'superadmin',
        ]);
        $supplier = Supplier::query()->create([
            'kode_supplier' => 'SUP-BTL-001',
            'nama_supplier' => 'Supplier Botol',
            'status' => 'AKTIF',
        ]);
        $gudang = Gudang::query()->create([
            'kode_gudang' => 'GDG-BTL-001',
            'nama_gudang' => 'Gudang Botol',
            'status' => 'AKTIF',
        ]);
        $botol = Botol::query()->create([
            'kode_botol' => 'BTL-STOCK-001',
            'nama_botol' => 'Botol 30 ML',
            'varian_ml' => 30,
            'isi_per_dus' => 12,
            'harga_beli_per_botol' => 1000,
            'stock_botol' => 5,
            'status' => 'AKTIF',
        ]);

        $this->actingAs($user)
            ->post('/admin/pembelian', [
                'id_supplier' => $supplier->id,
                'id_gudang' => $gudang->id,
                'metode_pembayaran' => 'CASH',
                'items' => [[
                    'tipe_item' => 'BOTOL',
                    'item_id' => $botol->id,
                    'qty_input' => 3,
                    'satuan_input' => 'DUS',
                    'harga' => 12000,
                ]],
            ])
            ->assertRedirect(route('business.pembelian.index'));

        $this->assertDatabaseHas('tm_botol', [
            'id' => $botol->id,
            'stock_botol' => 41,
        ]);

        $this->get('/admin/master/botol')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('rows.data.0.id', $botol->id)
                ->where('rows.data.0.stock_botol', '41.00')
            );
    }

    public function test_bibit_bottle_and_absolute_liter_purchase_are_separated_from_empty_bottle_stock(): void
    {
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $user = User::query()->create([
            'username' => 'liquid-purchase-admin',
            'name' => 'Liquid Purchase Admin',
            'password' => 'secret',
            'role' => 'superadmin',
        ]);
        $supplier = Supplier::query()->create([
            'kode_supplier' => 'SUP-LIQ-001',
            'nama_supplier' => 'Supplier Cairan',
            'status' => 'AKTIF',
        ]);
        $gudang = Gudang::query()->create([
            'kode_gudang' => 'GDG-LIQ-001',
            'nama_gudang' => 'Gudang Cairan',
            'status' => 'AKTIF',
        ]);
        $brand = Brand::query()->create([
            'kode_brand' => 'BRD-LIQ-001',
            'nama_brand' => 'Brand Cairan',
            'status' => 'AKTIF',
        ]);
        $botol = Botol::query()->create([
            'kode_botol' => 'BTL-LIQ-001',
            'nama_botol' => 'Botol Stok 100 ML',
            'varian_ml' => 100,
            'isi_per_dus' => 12,
            'stock_botol' => 20,
            'status' => 'AKTIF',
        ]);
        $lavender = BarangBibit::query()->create([
            'kode_barang' => 'BRG-LAV-001',
            'id_brand' => $brand->id,
            'id_botol' => $botol->id,
            'nama_barang' => 'Lavender',
            'jenis_barang' => 'BIBIT',
            'harga_beli_per_ml' => 100,
            'status' => 'AKTIF',
        ]);
        $absolute = BarangBibit::query()->create([
            'kode_barang' => 'BRG-ABS-001',
            'id_brand' => $brand->id,
            'id_botol' => $botol->id,
            'nama_barang' => 'Absolute Lavender',
            'jenis_barang' => 'ABSOLUTE',
            'harga_beli_per_ml' => 200,
            'status' => 'AKTIF',
        ]);

        $this->actingAs($user)
            ->post('/admin/pembelian', [
                'id_supplier' => $supplier->id,
                'id_gudang' => $gudang->id,
                'metode_pembayaran' => 'CASH',
                'items' => [
                    [
                        'tipe_item' => 'BIBIT',
                        'item_id' => $lavender->id,
                        'qty_input' => 3,
                        'satuan_input' => 'BOTOL',
                        'harga' => 100,
                    ],
                    [
                        'tipe_item' => 'ABSOLUTE',
                        'item_id' => $absolute->id,
                        'qty_input' => 1,
                        'satuan_input' => 'LITER',
                        'harga' => 200,
                    ],
                ],
            ])
            ->assertRedirect(route('business.pembelian.index'))
            ->assertSessionHasNoErrors();

        $lavenderStock = StokGudang::query()->with('barang.botol')
            ->where('id_barang', $lavender->id)
            ->firstOrFail();
        $absoluteStock = StokGudang::query()->with('barang.botol')
            ->where('id_barang', $absolute->id)
            ->firstOrFail();

        $this->assertSame('300.00', $lavenderStock->stok_ml);
        $this->assertSame(3, $lavenderStock->stok_botol_isi);
        $this->assertSame('1000.00', $absoluteStock->stok_ml);
        $this->assertSame(10, $absoluteStock->stok_botol_isi);
        $this->assertSame('7.00', $botol->refresh()->stock_botol);
    }
}
