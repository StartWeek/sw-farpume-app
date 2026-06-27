<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Business\BarangBibit;
use App\Models\Business\Botol;
use App\Models\Business\Brand;
use App\Models\Business\Customer;
use App\Models\Business\Gudang;
use App\Models\Business\Sales;
use App\Models\Business\Supplier;
use App\Models\System\AppSetting;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $allAccess = [
            'dashboard',
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
            'riwayat-pembelian',
            'riwayat-penjualan',
            'utility',
            'setting-system',
            'setting-nota',
        ];

        User::query()->updateOrCreate(['username' => 'sw'], [
            'name' => 'Super User',
            'password' => bcrypt('startw33k'),
            'role' => 'superadmin',
            'akses_menu' => $allAccess,
        ]);

        User::query()->updateOrCreate(['username' => 'testuser'], [
            'name' => 'Test User',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'akses_menu' => [
                'dashboard',
                'master-customer',
                'master-sales',
                'master-botol',
                'stok-gudang',
                'penjualan-retail',
                'penjualan-grosir',
                'piutang',
                'laporan-penjualan',
                'laporan-piutang',
                'laporan-kas',
            ],
        ]);

        $brandA = Brand::query()->firstOrCreate(
            ['kode_brand' => 'BRD-0001'],
            ['nama_brand' => 'Maison A', 'negara_asal' => 'Indonesia', 'status' => 'AKTIF']
        );

        $brandB = Brand::query()->firstOrCreate(
            ['kode_brand' => 'BRD-0002'],
            ['nama_brand' => 'Aroma Lab', 'negara_asal' => 'Prancis', 'status' => 'AKTIF']
        );

        Gudang::query()->firstOrCreate(
            ['kode_gudang' => 'GDG-0001'],
            ['nama_gudang' => 'Gudang Utama', 'tipe_gudang' => 'BIBIT', 'alamat' => 'Pusat', 'status' => 'AKTIF']
        );

        Supplier::query()->firstOrCreate(
            ['kode_supplier' => 'SUP-0001'],
            ['nama_supplier' => 'Supplier Bibit Nusantara', 'no_hp' => '081200000001', 'status' => 'AKTIF']
        );

        Customer::query()->firstOrCreate(
            ['kode_customer' => 'CUS-0001'],
            ['nama_customer' => 'Customer Retail', 'tipe_customer' => 'RETAIL', 'limit_piutang' => 500000, 'status' => 'AKTIF']
        );

        Customer::query()->firstOrCreate(
            ['kode_customer' => 'CUS-0002'],
            ['nama_customer' => 'Customer Sales Wangi', 'tipe_customer' => 'SALES', 'limit_piutang' => 5000000, 'status' => 'AKTIF']
        );

        Sales::query()->firstOrCreate(
            ['kode_sales' => 'SLS-0001'],
            ['nama_sales' => 'Sales Utama', 'no_hp' => '081200000002', 'status' => 'AKTIF']
        );

        BarangBibit::query()->firstOrCreate(
            ['kode_barang' => 'BRG-0001'],
            [
                'id_brand' => $brandA->id,
                'nama_barang' => "FRESH CITRUS - {$brandA->nama_brand}",
                'jenis_barang' => 'BIBIT',
                'harga_beli_per_ml' => 1200,
                'harga_jual_retail_per_ml' => 2500,
                'harga_jual_grosir_per_ml' => 2000,
                'minimum_stok_ml' => 500,
                'satuan_dasar' => 'ML',
                'status' => 'AKTIF',
            ]
        );

        BarangBibit::query()->firstOrCreate(
            ['kode_barang' => 'BRG-0002'],
            [
                'id_brand' => $brandB->id,
                'nama_barang' => "SOFT OUD - {$brandB->nama_brand}",
                'jenis_barang' => 'BIBIT',
                'harga_beli_per_ml' => 1800,
                'harga_jual_retail_per_ml' => 3500,
                'harga_jual_grosir_per_ml' => 2900,
                'minimum_stok_ml' => 300,
                'satuan_dasar' => 'ML',
                'status' => 'AKTIF',
            ]
        );

        foreach ([
            ['kode_botol' => 'BTL-0001', 'varian_ml' => 50, 'nama_botol' => 'Botol 50ml'],
            ['kode_botol' => 'BTL-0002', 'varian_ml' => 100, 'nama_botol' => 'Botol 100ml'],
            ['kode_botol' => 'BTL-0003', 'varian_ml' => 200, 'nama_botol' => 'Botol 200ml'],
            ['kode_botol' => 'BTL-0004', 'varian_ml' => 500, 'nama_botol' => 'Botol 500ml'],
            ['kode_botol' => 'BTL-0005', 'varian_ml' => 1000, 'nama_botol' => 'Botol 1 liter'],
            ['kode_botol' => 'BTL-0006', 'varian_ml' => 5000, 'nama_botol' => 'Botol 5 liter'],
        ] as $botol) {
            Botol::query()->firstOrCreate(
                ['kode_botol' => $botol['kode_botol']],
                [
                    ...$botol,
                    'isi_per_dus' => 100,
                    'harga_beli_per_botol' => 1000,
                    'harga_jual_per_botol' => 1500,
                    'harga_jual_per_dus' => 140000,
                    'stock_botol' => 0,
                    'status' => 'AKTIF',
                ]
            );
        }

        $stockBottleId = Botol::query()->where('kode_botol', 'BTL-0002')->value('id');
        BarangBibit::query()
            ->whereIn('kode_barang', ['BRG-0001', 'BRG-0002'])
            ->whereNull('id_botol')
            ->update(['id_botol' => $stockBottleId]);

        AppSetting::query()->firstOrCreate(['id' => 1], [
            'app_name' => 'Paris Parfum Admin',
            'primary_color' => 'amber',
            'light_theme' => 'slate',
            'dark_theme' => 'navy',
            'is_dark_mode' => false,
            'store_name' => 'PARIS PARFUM',
        ]);
    }
}
