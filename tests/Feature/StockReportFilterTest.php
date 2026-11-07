<?php

namespace Tests\Feature;

use App\Http\Controllers\Admin\Business\ReportController;
use App\Models\Business\StokGudang;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class StockReportFilterTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('tt_stok_gudang', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('id_gudang');
            $table->unsignedBigInteger('id_barang');
            $table->unsignedBigInteger('id_botol')->nullable();
            $table->decimal('stok_ml', 15, 2);
            $table->decimal('minimum_stok_ml', 15, 2);
        });
        foreach ([0, 0.01, 99, 500, 501] as $index => $volume) {
            DB::table('tt_stok_gudang')->insert([
                'id_gudang' => $index === 4 ? 2 : 1,
                'id_barang' => $index + 1,
                'id_botol' => 1,
                'stok_ml' => $volume,
                'minimum_stok_ml' => 500,
            ]);
        }
        Schema::create('tm_gudang', function (Blueprint $table): void {
            $table->id();
            $table->string('nama_gudang');
        });
        Schema::create('tm_botol_kosong', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('id_gudang');
            $table->string('kode_botol');
            $table->string('nama_botol');
            $table->decimal('stock', 15, 2);
        });
        DB::table('tm_gudang')->insert(['id' => 1, 'nama_gudang' => 'Gudang']);
        foreach ([0, 1, 10] as $index => $quantity) {
            DB::table('tm_botol_kosong')->insert([
                'id_gudang' => 1, 'kode_botol' => 'BTK-'.$index,
                'nama_botol' => 'Botol '.$index, 'stock' => $quantity,
            ]);
        }
    }

    private function invokeController(string $method, mixed ...$arguments): mixed
    {
        $controller = new ReportController;

        return (new \ReflectionClass($controller))->getMethod($method)->invoke($controller, ...$arguments);
    }

    public function test_liquid_availability_is_based_on_zero_not_minimum_stock(): void
    {
        foreach (['' => [1, 2, 3, 4, 5], 'TERSEDIA' => [2, 3, 4, 5], 'HABIS' => [1]] as $status => $ids) {
            $query = $this->invokeController('applyStockFilters', StokGudang::query(), ['stok_status' => $status]);
            $this->assertSame($ids, $query->orderBy('id')->pluck('id')->all());
        }

        $query = $this->invokeController('applyStockFilters', StokGudang::query(), [
            'stok_status' => 'TERSEDIA', 'id_gudang' => '1', 'id_barang' => '2', 'id_botol' => '1',
        ]);
        $this->assertSame([2], $query->pluck('id')->all());
    }

    public function test_empty_bottles_follow_the_same_availability_filter(): void
    {
        foreach (['' => 3, 'TERSEDIA' => 2, 'HABIS' => 1] as $status => $count) {
            $rows = $this->invokeController('botolStockRows', ['stok_status' => $status]);
            $this->assertCount($count, $rows);
            foreach ($rows as $row) {
                if ($status === 'TERSEDIA') {
                    $this->assertGreaterThan(0, $row['stok_botol']);
                } elseif ($status === 'HABIS') {
                    $this->assertSame(0.0, $row['stok_botol']);
                }
            }
        }
        $this->assertCount(1, $this->invokeController('botolStockRows', [
            'stok_status' => 'TERSEDIA', 'id_botol' => 2, 'id_gudang' => 1,
        ]));
    }

    public function test_exports_use_readable_availability_labels(): void
    {
        foreach (['TERSEDIA' => 'Ada Stok', 'HABIS' => 'Stok Habis'] as $status => $label) {
            $filters = $this->invokeController('formatFiltersForExport', ['stok_status' => $status]);
            $this->assertSame($label, $filters['Status Stok']);
        }
    }

    public function test_removed_or_unknown_status_is_rejected_instead_of_showing_all_stock(): void
    {
        $this->expectException(ValidationException::class);
        (new ReportController)->show(Request::create('/admin/laporan/stok', 'GET', [
            'search' => 1, 'stok_status' => 'MENIPIS',
        ]), 'stok');
    }
}
