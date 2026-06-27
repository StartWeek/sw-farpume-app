<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Barang bibit is entered directly and no longer depends on master wangi.
        if (Schema::hasColumn('tm_barang_bibit', 'id_wangi')) {
            Schema::table('tm_barang_bibit', function (Blueprint $table): void {
                $table->dropUnique(['id_wangi', 'id_brand']);
                $table->dropConstrainedForeignId('id_wangi');
            });
        }

        // Add pic_name to supplier (if not exists)
        if (!Schema::hasColumn('tm_supplier', 'pic_name')) {
            Schema::table('tm_supplier', function (Blueprint $table): void {
                $table->string('pic_name')->nullable()->after('nama_supplier');
            });
        }

        DB::table('tm_customer')->where('tipe_customer', 'GROSIR')->update(['tipe_customer' => 'SALES']);
        DB::table('tm_customer')->where('tipe_customer', 'TOKO')->update(['tipe_customer' => 'RETAIL']);

        // Remove TOKO and GROSIR from customer tipe_customer enum
        Schema::table('tm_customer', function (Blueprint $table): void {
            $table->enum('tipe_customer', ['RETAIL', 'SALES'])->default('RETAIL')->change();
        });

        // Add discount to penjualan and pembelian
        if (!Schema::hasColumn('tt_penjualan', 'discount')) {
            Schema::table('tt_penjualan', function (Blueprint $table): void {
                $table->decimal('discount', 15, 2)->default(0)->after('jumlah_bayar');
            });
        }

        if (!Schema::hasColumn('tt_pembelian', 'discount')) {
            Schema::table('tt_pembelian', function (Blueprint $table): void {
                $table->decimal('discount', 15, 2)->default(0)->after('jumlah_bayar');
            });
        }

        // Add discount to penjualan_detail and pembelian_detail
        if (!Schema::hasColumn('tt_penjualan_detail', 'discount')) {
            Schema::table('tt_penjualan_detail', function (Blueprint $table): void {
                $table->decimal('discount', 15, 2)->default(0)->after('laba_kotor');
            });
        }

        if (!Schema::hasColumn('tt_pembelian_detail', 'discount')) {
            Schema::table('tt_pembelian_detail', function (Blueprint $table): void {
                $table->decimal('discount', 15, 2)->default(0)->after('subtotal');
            });
        }

        // Add manual_customer_name to penjualan for occasional customers
        if (!Schema::hasColumn('tt_penjualan', 'manual_customer_name')) {
            Schema::table('tt_penjualan', function (Blueprint $table): void {
                $table->string('manual_customer_name')->nullable()->after('id_customer');
            });
        }

        // Make id_customer nullable in penjualan
        Schema::table('tt_penjualan', function (Blueprint $table): void {
            $table->foreignId('id_customer')->nullable()->change();
        });

        // Add closing store functionality table
        Schema::create('tt_toko_closing', function (Blueprint $table): void {
            $table->id();
            $table->date('tanggal_tutup')->unique();
            $table->decimal('saldo_awal', 15, 2)->default(0);
            $table->decimal('saldo_akhir', 15, 2)->default(0);
            $table->decimal('total_penjualan', 15, 2)->default(0);
            $table->decimal('total_pembelian', 15, 2)->default(0);
            $table->text('keterangan')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tt_toko_closing');

        Schema::table('tt_penjualan', function (Blueprint $table): void {
            $table->dropColumn(['discount', 'manual_customer_name']);
            $table->foreignId('id_customer')->nullable(false)->change();
        });

        Schema::table('tt_pembelian', function (Blueprint $table): void {
            $table->dropColumn('discount');
        });

        Schema::table('tt_penjualan_detail', function (Blueprint $table): void {
            $table->dropColumn('discount');
        });

        Schema::table('tt_pembelian_detail', function (Blueprint $table): void {
            $table->dropColumn('discount');
        });

        Schema::table('tm_customer', function (Blueprint $table): void {
            $table->enum('tipe_customer', ['RETAIL', 'GROSIR', 'TOKO'])->default('RETAIL')->change();
        });

        Schema::table('tm_supplier', function (Blueprint $table): void {
            $table->dropColumn('pic_name');
        });

        // Restored as nullable because new rows created after this migration have no wangi.
        Schema::table('tm_barang_bibit', function (Blueprint $table): void {
            $table->foreignId('id_wangi')->nullable()->after('kode_barang')->constrained('tm_wangi')->cascadeOnUpdate()->restrictOnDelete();
            $table->unique(['id_wangi', 'id_brand']);
        });
    }
};
