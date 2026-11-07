<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            return;
        }

        DB::unprepared(file_get_contents(database_path('schema/sqlite-business-baseline.sql')));

        foreach ([
            '2026_07_28_000002_add_supplier_gudang_columns',
            '2026_11_01_000001_add_transaction_payment_details',
        ] as $migration) {
            if (DB::table('migrations')->where('migration', $migration)->exists()) {
                (require database_path('migrations/'.$migration.'.php'))->up();
            }
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            throw new RuntimeException('Baseline SQLite tidak dapat di-rollback karena dapat berisi data lama. Gunakan backup database untuk pemulihan.');
        }
    }
};
