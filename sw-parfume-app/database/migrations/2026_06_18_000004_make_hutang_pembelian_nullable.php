<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('tt_hutang')) {
            return;
        }

        Schema::table('tt_hutang', function (Blueprint $table) {
            if (!Schema::hasColumn('tt_hutang', 'keterangan')) {
                $table->text('keterangan')->nullable()->after('jatuh_tempo');
            }

            if (!Schema::hasColumn('tt_hutang', 'created_by')) {
                $table->string('created_by')->nullable()->after('keterangan');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            Schema::table('tt_hutang', function (Blueprint $table) {
                $table->dropForeign(['id_pembelian']);
            });

            DB::statement('ALTER TABLE tt_hutang MODIFY id_pembelian BIGINT UNSIGNED NULL');

            Schema::table('tt_hutang', function (Blueprint $table) {
                $table->foreign('id_pembelian')->references('id')->on('tt_pembelian')->cascadeOnUpdate()->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('tt_hutang')) {
            return;
        }

        Schema::table('tt_hutang', function (Blueprint $table) {
            if (Schema::hasColumn('tt_hutang', 'created_by')) {
                $table->dropColumn('created_by');
            }

            if (Schema::hasColumn('tt_hutang', 'keterangan')) {
                $table->dropColumn('keterangan');
            }
        });
    }
};
