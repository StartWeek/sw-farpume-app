<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tm_gudang', function (Blueprint $table) {
            $table->string('tipe_gudang')->default('BIBIT')->after('nama_gudang');
        });
    }

    public function down(): void
    {
        Schema::table('tm_gudang', function (Blueprint $table) {
            $table->dropColumn('tipe_gudang');
        });
    }
};
