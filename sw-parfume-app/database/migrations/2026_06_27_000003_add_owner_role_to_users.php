<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE `tm_users` MODIFY `role` ENUM('owner', 'superadmin', 'admin', 'manager', 'kepala_toko') NOT NULL DEFAULT 'admin'");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE `tm_users` MODIFY `role` ENUM('superadmin', 'admin', 'manager', 'kepala_toko') NOT NULL DEFAULT 'admin'");
    }
};
