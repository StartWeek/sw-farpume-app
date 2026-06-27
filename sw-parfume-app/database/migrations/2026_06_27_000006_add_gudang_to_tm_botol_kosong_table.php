<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tm_botol_kosong') && ! Schema::hasColumn('tm_botol_kosong', 'id_gudang')) {
            Schema::table('tm_botol_kosong', function (Blueprint $table): void {
                $table->foreignId('id_gudang')->nullable()->after('kode_botol')->constrained('tm_gudang')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('tm_botol_kosong') && Schema::hasColumn('tm_botol_kosong', 'id_gudang')) {
            Schema::table('tm_botol_kosong', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('id_gudang');
            });
        }
    }
};
