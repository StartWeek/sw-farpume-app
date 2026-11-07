<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['tt_pembelian', 'tt_penjualan'] as $name) {
            if (! Schema::hasTable($name) || Schema::hasColumn($name, 'payment_details')) {
                continue;
            }
            Schema::table($name, function (Blueprint $table): void {
                $table->string('metode_pembayaran', 20)->change();
                $table->json('payment_details')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['tt_pembelian', 'tt_penjualan'] as $name) {
            if (Schema::hasTable($name) && DB::table($name)->whereNotNull('payment_details')->exists()) {
                throw new RuntimeException('Rollback dihentikan: rincian pembayaran sudah digunakan. Gunakan migrasi forward agar data pembayaran tidak hilang.');
            }
        }
        foreach (['tt_pembelian', 'tt_penjualan'] as $name) {
            if (Schema::hasTable($name)) {
                Schema::table($name, function (Blueprint $table): void {
                    $table->dropColumn('payment_details');
                    $table->enum('metode_pembayaran', ['CASH', 'TRANSFER', 'TEMPO'])->change();
                });
            }
        }
    }
};
