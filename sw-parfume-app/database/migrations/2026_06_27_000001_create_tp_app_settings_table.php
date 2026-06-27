<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tp_app_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('logo_path')->nullable();
            $table->string('login_logo_path')->nullable();
            $table->string('app_name')->default('Paris Parfum Admin');
            $table->string('primary_color')->default('amber');
            $table->string('light_theme')->default('slate');
            $table->string('dark_theme')->default('navy');
            $table->boolean('is_dark_mode')->default(false);
            $table->string('store_name')->default('PARIS PARFUM');
            $table->text('store_address')->nullable();
            $table->string('store_phone')->nullable();
            $table->text('receipt_footer')->nullable();
            $table->timestamps();
        });

        DB::table('tp_app_settings')->insertOrIgnore([
            'id' => 1,
            'app_name' => 'Paris Parfum Admin',
            'primary_color' => 'amber',
            'light_theme' => 'slate',
            'dark_theme' => 'navy',
            'is_dark_mode' => false,
            'store_name' => 'PARIS PARFUM',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('tp_app_settings');
    }
};
