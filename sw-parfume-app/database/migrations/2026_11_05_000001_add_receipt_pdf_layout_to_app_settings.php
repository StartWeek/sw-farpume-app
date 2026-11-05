<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tp_app_settings', function (Blueprint $table): void {
            $table->json('receipt_pdf_layout')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('tp_app_settings', function (Blueprint $table): void {
            $table->dropColumn('receipt_pdf_layout');
        });
    }
};
