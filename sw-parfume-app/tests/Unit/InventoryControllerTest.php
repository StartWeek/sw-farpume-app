<?php

namespace Tests\Unit;

use App\Http\Controllers\Admin\Business\InventoryController;
use App\Services\Business\BusinessService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class InventoryControllerTest extends TestCase
{
    public function test_destroy_stock_page_exposes_stock_balance_for_selected_item(): void
    {
        Schema::create('tm_gudang', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_gudang');
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });
        Schema::create('tm_barang_bibit', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_barang');
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });
        Schema::create('tm_brand', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_brand');
            $table->timestamps();
        });
        Schema::create('tm_botol', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_botol');
            $table->decimal('varian_ml', 10, 2)->default(0);
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });
        Schema::create('tm_botol_kosong', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_botol');
            $table->unsignedBigInteger('id_gudang')->nullable();
            $table->decimal('stock', 10, 2)->default(0);
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });
        Schema::create('tt_stok_gudang', function (Blueprint $table): void {
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

        DB::table('tm_gudang')->insert(['id' => 1, 'nama_gudang' => 'Gudang Utama']);
        DB::table('tm_barang_bibit')->insert(['id' => 2, 'nama_barang' => 'Barang Test']);
        DB::table('tt_stok_gudang')->insert([
            'id_gudang' => 1,
            'id_barang' => 2,
            'id_botol' => 7,
            'stok_ml' => 250.50,
            'stok_reserved_ml' => 0,
            'minimum_stok_ml' => 50,
        ]);

        $business = $this->createMock(BusinessService::class);
        $controller = new InventoryController($business);
        $request = Request::create('/admin/hancur-stock', 'GET');

        $response = $controller->destroyStock($request);
        $content = $response->toResponse($request)->getContent();

        $this->assertStringContainsString('destroy-stock', $content);
        $this->assertStringContainsString('stokGudangList', $content);
        $this->assertStringContainsString('250.50', $content);
        $this->assertStringContainsString('id_botol', $content);
    }

    public function test_store_destroy_stock_calls_business_service_for_botol_kosong(): void
    {
        Schema::create('tm_gudang', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_gudang');
            $table->string('tipe_gudang')->default('BIBIT');
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });
        Schema::create('tm_botol_kosong', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_botol');
            $table->unsignedBigInteger('id_gudang')->nullable();
            $table->decimal('stock', 10, 2)->default(0);
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });

        DB::table('tm_gudang')->insert(['id' => 10, 'nama_gudang' => 'Gudang Botol', 'tipe_gudang' => 'BOTOL']);
        DB::table('tm_botol_kosong')->insert(['id' => 20, 'nama_botol' => 'Botol Kosong Test', 'id_gudang' => 10, 'stock' => 15]);

        $business = $this->createMock(BusinessService::class);
        $controller = new InventoryController($business);

        $business->expects($this->once())
            ->method('adjustBotolKosongStock')
            ->with($this->callback(function (array $payload): bool {
                return $payload['tipe_mutasi'] === 'KELUAR'
                    && (int) $payload['id_gudang'] === 10
                    && (int) $payload['id_barang'] === 20
                    && (int) $payload['jumlah_botol'] === 3;
            }));

        $request = Request::create('/admin/hancur-stock', 'POST', [
            'id_gudang' => '10',
            'id_barang' => '20',
            'jumlah_botol' => '3',
            'keterangan' => 'rusak',
        ]);

        $response = $controller->storeDestroyStock($request);

        $this->assertInstanceOf(RedirectResponse::class, $response);
    }

    public function test_store_destroy_stock_calls_business_service_for_bibit_stock(): void
    {
        Schema::create('tm_gudang', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_gudang');
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });
        Schema::create('tm_barang_bibit', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_barang');
            $table->string('status')->default('AKTIF');
            $table->timestamps();
        });

        DB::table('tm_gudang')->insert(['id' => 1, 'nama_gudang' => 'Gudang Utama']);
        DB::table('tm_barang_bibit')->insert(['id' => 2, 'nama_barang' => 'Barang Test']);

        $business = $this->createMock(BusinessService::class);
        $controller = new InventoryController($business);

        $business->expects($this->once())
            ->method('createStockMutation')
            ->with($this->callback(function (array $payload): bool {
                return $payload['tipe_mutasi'] === 'KELUAR'
                    && (int) $payload['id_gudang'] === 1
                    && (int) $payload['id_barang'] === 2
                    && (float) $payload['qty_ml'] === 150.0;
            }));

        $request = Request::create('/admin/hancur-stock', 'POST', [
            'id_gudang' => '1',
            'id_barang' => '2',
            'qty_ml' => '150',
            'keterangan' => 'rusak',
        ]);

        $response = $controller->storeDestroyStock($request);

        $this->assertInstanceOf(RedirectResponse::class, $response);
    }
}
