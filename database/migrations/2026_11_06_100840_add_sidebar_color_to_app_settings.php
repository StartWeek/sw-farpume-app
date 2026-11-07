<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tp_app_settings', function (Blueprint $table): void {
            $table->string('sidebar_color', 7)->nullable()->default('#0F172A')->after('primary_color');
        });
    }

    public function down(): void
    {
        Schema::table('tp_app_settings', function (Blueprint $table): void {
            $table->dropColumn('sidebar_color');
        });
    }
};
