<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tm_users', function (Blueprint $table) {
            $table->json('akses_menu')->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('tm_users', function (Blueprint $table) {
            $table->dropColumn('akses_menu');
        });
    }
};
