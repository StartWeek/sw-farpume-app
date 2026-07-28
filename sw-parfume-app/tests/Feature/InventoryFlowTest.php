<?php

namespace Tests\Feature;

use App\Models\Business\BarangBibit;
use App\Models\Business\Botol;
use App\Models\Business\Brand;
use App\Models\Business\Gudang;
use App\Models\Business\Wangi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class InventoryFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_stock_mutation_becomes_visible_on_inventory_page_after_submit(): void
    {
        Schema::create('tm_users', function ($table): void {
            $table->id();
            $table->string('username')->unique();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('password');
            $table->string('role')->default('superadmin');
            $table->json('akses_menu')->nullable();
            $table->timestamps();
        });

        Schema::create('tp_system', function ($table): void {
            $table->id();
            $table->date('tanggal_system');
            $table->timestamps();
        });

        Schema::create('tp_app_settings', function ($table): void {
            $table->id();
            $table->string('app_name')->nullable();
            $table->string('primary_color')->nullable();
            $table->string('light_theme')->nullable();
            $table->string('dark_theme')->nullable();
            $table->boolean('is_dark_mode')->default(false);
            $table->string('store_name')->nullable();
            $table->string('store_address')->nullable();
            $table->string('store_phone')->nullable();
            $table->string('receipt_footer')->nullable();
            $table->string('receipt_template')->nullable();
            $table->string('payment_receipt_template')->nullable();
            $table->timestamps();
        });

        Schema::create('tm_gudang', function ($table): void {
            $table->id();
            $table->string('kode_gudang')->nullable();
            $table->string('nama_gudang');
            $table->string('tipe_gudang')->default('BIBIT');
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('tm_wangi', function ($table): void {
            $table->id();
            $table->string('kode_wangi')->nullable();
            $table->string('nama_wangi');
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('tm_brand', function ($table): void {
            $table->id();
            $table->string('kode_brand')->nullable();
            $table->string('nama_brand');
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('tm_botol', function ($table): void {
            $table->id();
            $table->string('kode_botol')->nullable();
            $table->string('nama_botol');
            $table->decimal('varian_ml', 10, 2)->default(0);
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('tm_botol_kosong', function ($table): void {
            $table->id();
            $table->string('kode_botol')->nullable();
            $table->unsignedBigInteger('id_gudang')->nullable();
            $table->string('nama_botol');
            $table->decimal('harga_beli', 15, 2)->default(0);
            $table->decimal('harga_jual', 15, 2)->default(0);
            $table->decimal('stock', 15, 2)->default(0);
            $table->string('satuan')->default('PCS');
            $table->string('status')->default('AKTIF');
            $table->text('keterangan')->nullable();
            $table->timestamps();
        });

        Schema::create('tm_barang_bibit', function ($table): void {
            $table->id();
            $table->string('kode_barang')->nullable();
            $table->unsignedBigInteger('id_wangi')->nullable();
            $table->unsignedBigInteger('id_brand')->nullable();
            $table->unsignedBigInteger('id_botol')->nullable();
            $table->string('nama_barang');
            $table->decimal('minimum_stok_ml', 10, 2)->default(0);
            $table->string('jenis_barang')->default('BIBIT');
            $table->string('satuan_dasar')->default('ML');
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('tt_stok_gudang', function ($table): void {
            $table->id();
            $table->unsignedBigInteger('id_gudang');
            $table->unsignedBigInteger('id_barang');
            $table->unsignedBigInteger('id_botol')->nullable();
            $table->decimal('stok_ml', 15, 2)->default(0);
            $table->decimal('stok_reserved_ml', 15, 2)->default(0);
            $table->decimal('minimum_stok_ml', 15, 2)->default(0);
            $table->timestamp('last_update')->nullable();
            $table->timestamps();
        });

        Schema::create('tt_mutasi_stok', function ($table): void {
            $table->id();
            $table->date('tanggal');
            $table->string('tipe_mutasi');
            $table->string('sumber_transaksi')->nullable();
            $table->string('no_transaksi')->nullable();
            $table->unsignedBigInteger('id_gudang');
            $table->unsignedBigInteger('id_barang');
            $table->unsignedBigInteger('id_botol')->nullable();
            $table->decimal('qty_ml', 15, 2)->default(0);
            $table->decimal('stok_sebelum_ml', 15, 2)->default(0);
            $table->decimal('stok_sesudah_ml', 15, 2)->default(0);
            $table->text('keterangan')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('tt_barang_bibit', function ($table): void {
            $table->id();
            $table->date('tanggal');
            $table->unsignedBigInteger('id_gudang');
            $table->unsignedBigInteger('id_barang');
            $table->unsignedBigInteger('id_botol')->nullable();
            $table->string('tipe_mutasi');
            $table->decimal('qty_ml', 15, 2)->default(0);
            $table->decimal('stok_awal_ml', 15, 2)->default(0);
            $table->decimal('stok_akhir_ml', 15, 2)->default(0);
            $table->string('sumber_transaksi')->nullable();
            $table->string('no_transaksi')->nullable();
            $table->text('keterangan')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('tt_saldo_barang', function ($table): void {
            $table->id();
            $table->date('tanggal');
            $table->unsignedBigInteger('id_gudang');
            $table->unsignedBigInteger('id_barang');
            $table->unsignedBigInteger('id_botol')->nullable();
            $table->decimal('stok_awal_ml', 15, 2)->default(0);
            $table->decimal('masuk_ml', 15, 2)->default(0);
            $table->decimal('keluar_ml', 15, 2)->default(0);
            $table->decimal('stok_akhir_ml', 15, 2)->default(0);
            $table->decimal('minimum_stok_ml', 15, 2)->default(0);
            $table->integer('total_mutasi')->default(0);
            $table->date('terakhir_mutasi')->nullable();
            $table->timestamps();
        });

        Schema::create('th_saldo_barang', function ($table): void {
            $table->id();
            $table->date('tanggal');
            $table->unsignedBigInteger('id_gudang');
            $table->unsignedBigInteger('id_barang');
            $table->unsignedBigInteger('id_botol')->nullable();
            $table->decimal('stok_awal_ml', 15, 2)->default(0);
            $table->decimal('masuk_ml', 15, 2)->default(0);
            $table->decimal('keluar_ml', 15, 2)->default(0);
            $table->decimal('stok_akhir_ml', 15, 2)->default(0);
            $table->decimal('minimum_stok_ml', 15, 2)->default(0);
            $table->integer('total_mutasi')->default(0);
            $table->date('terakhir_mutasi')->nullable();
            $table->timestamps();
        });

        $user = User::query()->create([
            'username' => 'inventory-user',
            'name' => 'Inventory User',
            'password' => 'secret',
            'role' => 'superadmin',
        ]);

        $gudang = Gudang::query()->create([
            'kode_gudang' => 'GDG-INV-001',
            'nama_gudang' => 'Gudang Inventory',
            'tipe_gudang' => 'BIBIT',
            'status' => 'AKTIF',
        ]);

        $wangi = Wangi::query()->create([
            'kode_wangi' => 'WNG-INV-001',
            'nama_wangi' => 'Inventory Wangi',
            'status' => 'AKTIF',
        ]);

        $brand = Brand::query()->create([
            'kode_brand' => 'BRD-INV-001',
            'nama_brand' => 'Inventory Brand',
            'status' => 'AKTIF',
        ]);

        $botol = Botol::query()->create([
            'kode_botol' => 'BTL-INV-001',
            'varian_ml' => 100,
            'nama_botol' => 'Botol Inventory',
            'status' => 'AKTIF',
        ]);

        $barang = BarangBibit::query()->create([
            'kode_barang' => 'BRG-INV-001',
            'id_wangi' => $wangi->id,
            'id_brand' => $brand->id,
            'id_botol' => $botol->id,
            'nama_barang' => 'Barang Inventory',
            'minimum_stok_ml' => 10,
            'satuan_dasar' => 'ML',
            'status' => 'AKTIF',
        ]);

        $this->actingAs($user)
            ->from('/admin/stok-gudang')
            ->post('/admin/mutasi-stok', [
                'id_gudang' => (string) $gudang->id,
                'id_barang' => (string) $barang->id,
                'id_botol' => (string) $botol->id,
                'tipe_mutasi' => 'MASUK',
                'jumlah_botol' => '2',
                'keterangan' => 'Tambah stok uji',
            ])
            ->assertRedirect();

        $this->actingAs($user)
            ->get('/admin/stok-gudang')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/business/InventoryPage', false)
                ->where('mode', 'stock')
                ->has('rows.data', 1)
                ->where('rows.data.0.stok_ml', '200.00')
            );
    }
}
