<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DatabaseBootstrapTest extends TestCase
{
    public function test_sqlite_migrations_create_the_business_baseline_before_altering_tables(): void
    {
        $this->assertSame('sqlite', config('database.default'));
        $this->assertSame(0, Artisan::call('migrate', ['--force' => true]));

        foreach (['tm_users', 'tm_gudang', 'tm_supplier', 'tt_penjualan_detail', 'tp_app_settings'] as $table) {
            $this->assertTrue(Schema::hasTable($table), $table.' must exist after migration.');
        }

        $this->assertTrue(Schema::hasColumn('tt_penjualan_detail', 'id_gudang'));
        $this->assertTrue(Schema::hasColumn('tp_app_settings', 'sidebar_color'));
        $this->assertTrue(Schema::hasColumn('tt_pembelian', 'payment_details'));
        $this->assertTrue(Schema::hasColumn('tt_penjualan', 'payment_details'));
        $this->assertSame(0, Artisan::call('migrate', ['--force' => true]));

        (require database_path('migrations/2026_07_28_000000_restore_sqlite_business_baseline.php'))->up();
        $this->assertTrue(Schema::hasColumn('tt_penjualan', 'payment_details'));

        $this->assertSame(0, Artisan::call('db:seed', ['--force' => true]));
        $this->assertTrue(DB::table('tm_users')->exists());
        $this->assertTrue(DB::table('tm_gudang')->exists());
    }

    public function test_sqlite_baseline_repairs_skipped_migrations_and_preserves_existing_data(): void
    {
        Schema::create('cache', function (Blueprint $table): void {
            $table->string('key')->primary();
            $table->text('value');
            $table->integer('expiration');
        });
        DB::table('cache')->insert(['key' => 'existing', 'value' => 'preserved', 'expiration' => 0]);

        $this->assertSame(0, Artisan::call('migrate', [
            '--path' => [
                'database/migrations/2026_07_28_000002_add_supplier_gudang_columns.php',
                'database/migrations/2026_10_31_000001_create_transaction_validations_table.php',
                'database/migrations/2026_11_01_000001_add_transaction_payment_details.php',
            ],
            '--force' => true,
        ]));
        $this->assertFalse(Schema::hasTable('tt_penjualan_detail'));

        $this->assertSame(0, Artisan::call('migrate', ['--force' => true]));
        $this->assertSame('preserved', DB::table('cache')->where('key', 'existing')->value('value'));
        $this->assertTrue(Schema::hasColumn('tm_supplier', 'tipe_gudang'));
        $this->assertTrue(Schema::hasColumn('tm_supplier', 'id_gudang'));
        $this->assertTrue(Schema::hasColumn('tt_penjualan_detail', 'id_gudang'));
        $this->assertTrue(Schema::hasColumn('tt_pembelian', 'payment_details'));
        $this->assertTrue(Schema::hasColumn('tt_penjualan', 'payment_details'));
        $this->assertSame(0, Artisan::call('migrate', ['--force' => true]));
    }
}
