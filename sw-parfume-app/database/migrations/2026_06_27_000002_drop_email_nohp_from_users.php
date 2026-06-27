<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tm_users', function (Blueprint $table): void {
            $table->dropColumn(['email', 'no_hp']);
        });
    }

    public function down(): void
    {
        Schema::table('tm_users', function (Blueprint $table): void {
            $table->string('email')->nullable();
            $table->string('no_hp')->nullable();
        });
    }
};
