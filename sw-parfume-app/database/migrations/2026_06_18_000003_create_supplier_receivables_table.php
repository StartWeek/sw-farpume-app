<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tt_piutang_supplier', function (Blueprint $table) {
            $table->id();
            $table->string('no_piutang_supplier')->unique();
            $table->date('tanggal');
            $table->foreignId('id_supplier')->constrained('tm_supplier')->cascadeOnUpdate()->restrictOnDelete();
            $table->decimal('total_piutang', 15, 2);
            $table->decimal('total_bayar', 15, 2)->default(0);
            $table->decimal('sisa_piutang', 15, 2);
            $table->string('status_piutang')->default('OPEN');
            $table->date('jatuh_tempo')->nullable();
            $table->text('keterangan')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tt_piutang_supplier');
    }
};
