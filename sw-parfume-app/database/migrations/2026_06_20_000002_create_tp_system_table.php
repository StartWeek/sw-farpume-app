<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('tp_system')) {
            Schema::create('tp_system', function (Blueprint $table): void {
                $table->id();
                $table->date('tanggal_system');
                $table->timestamps();
            });
        }

        DB::table('tp_system')->insertOrIgnore([
            'id' => 1,
            'tanggal_system' => now()->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('tp_system');
    }
};
