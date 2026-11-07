<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tt_validasi_transaksi', function (Blueprint $table): void {
            $table->id();
            $table->uuid('submission_key')->unique();
            $table->string('payload_hash', 64);
            $table->string('type', 50);
            $table->string('status', 20)->default('PENDING');
            $table->date('operational_date');
            $table->json('payload');
            $table->json('snapshot');
            $table->unsignedBigInteger('submitted_by_id');
            $table->string('submitted_by_name');
            $table->unsignedBigInteger('reviewed_by_id')->nullable();
            $table->string('reviewed_by_name')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->json('result')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'type', 'created_at']);
            $table->index(['operational_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tt_validasi_transaksi');
    }
};
