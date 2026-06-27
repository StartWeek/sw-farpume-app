<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $isSqlite = DB::connection()->getDriverName() === 'sqlite';

        Schema::table('tt_stok_gudang', function (Blueprint $table) use ($isSqlite): void {
            if (! $isSqlite) {
                $table->dropForeign('tt_stok_gudang_id_gudang_foreign');
                $table->dropUnique('tt_stok_gudang_id_gudang_id_barang_unique');
            } else {
                // SQLite: drop old unique via raw SQL
                DB::statement('DROP INDEX IF EXISTS tt_stok_gudang_id_gudang_id_barang_unique');
            }
        });

        Schema::table('tt_stok_gudang', function (Blueprint $table) use ($isSqlite): void {
            $table->unsignedBigInteger('id_botol')->default(0)->after('id_barang');
            $table->unique(['id_gudang', 'id_barang', 'id_botol'], 'tt_stok_gudang_gudang_barang_botol_unique');

            if (! $isSqlite) {
                $table->foreign('id_gudang')->references('id')->on('tm_gudang')->cascadeOnDelete();
            }
        });

        // Update existing NULL botol to 0 (MySQL compatibility)
        if (! $isSqlite) {
            DB::statement('UPDATE tt_stok_gudang SET id_botol = 0 WHERE id_botol IS NULL');
        }

        Schema::table('tt_mutasi_stok', function (Blueprint $table): void {
            $table->unsignedBigInteger('id_botol')->default(0)->after('id_barang');
        });
    }

    public function down(): void
    {
        $isSqlite = DB::connection()->getDriverName() === 'sqlite';

        Schema::table('tt_mutasi_stok', function (Blueprint $table): void {
            $table->dropColumn('id_botol');
        });

        Schema::table('tt_stok_gudang', function (Blueprint $table) use ($isSqlite): void {
            if (! $isSqlite) {
                $table->dropForeign('tt_stok_gudang_id_gudang_foreign');
            }
            $table->dropUnique('tt_stok_gudang_gudang_barang_botol_unique');
            $table->dropColumn('id_botol');
            $table->unique(['id_gudang', 'id_barang'], 'tt_stok_gudang_id_gudang_id_barang_unique');

            if (! $isSqlite) {
                $table->foreign('id_gudang')->references('id')->on('tm_gudang')->cascadeOnDelete();
            }
        });
    }
};
