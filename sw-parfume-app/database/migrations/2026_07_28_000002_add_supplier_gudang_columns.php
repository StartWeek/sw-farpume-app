<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tm_supplier')) {
            return;
        }

        if (! Schema::hasColumn('tm_supplier', 'tipe_gudang')) {
            Schema::table('tm_supplier', function (Blueprint $table): void {
                $table->string('tipe_gudang')->nullable()->after('nama_supplier');
            });
        }

        if (! Schema::hasColumn('tm_supplier', 'id_gudang')) {
            Schema::table('tm_supplier', function (Blueprint $table): void {
                $table->foreignId('id_gudang')->nullable()->after('tipe_gudang')->constrained('tm_gudang')->cascadeOnUpdate()->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('tm_supplier')) {
            return;
        }

        if (Schema::hasColumn('tm_supplier', 'id_gudang')) {
            Schema::table('tm_supplier', function (Blueprint $table): void {
                $table->dropForeign(['id_gudang']);
                $table->dropColumn('id_gudang');
            });
        }

        if (Schema::hasColumn('tm_supplier', 'tipe_gudang')) {
            Schema::table('tm_supplier', function (Blueprint $table): void {
                $table->dropColumn('tipe_gudang');
            });
        }
    }
};
