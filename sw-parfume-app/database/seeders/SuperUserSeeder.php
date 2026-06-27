<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SuperUserSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(['username' => 'sw'], [
            'name' => 'Super User',
            'password' => bcrypt('startw33k'),
            'role' => 'superadmin',
            'akses_menu' => [
                'dashboard',
                'master-wangi',
                'master-brand',
                'barang-bibit',
                'master-gudang',
                'master-supplier',
                'master-customer',
                'master-sales',
                'master-botol',
                'users',
                'user-access',
                'stok-gudang',
                'mutasi-stok',
                'stok-menipis',
                'pembelian',
                'penjualan-retail',
                'penjualan-grosir',
                'hutang',
                'piutang',
                'piutang-supplier',
                'laporan-pembelian',
                'laporan-penjualan',
                'laporan-stok',
                'laporan-mutasi-stok',
                'laporan-barang-summary',
                'laporan-hutang',
                'laporan-piutang',
                'laporan-piutang-supplier',
                'laporan-kas',
                'laporan-laba-kotor',
            ],
        ]);
    }
}
