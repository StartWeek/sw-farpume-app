<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE `tm_users` MODIFY `role` ENUM('superadmin', 'owner', 'admin', 'manager', 'kepala_toko', 'kasir') NOT NULL DEFAULT 'admin'");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE `tm_users` MODIFY `role` ENUM('superadmin', 'owner', 'admin', 'manager', 'kepala_toko') NOT NULL DEFAULT 'admin'");
    }
};
