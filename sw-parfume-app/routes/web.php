<?php

use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\Business\BarangBibitController;
use App\Http\Controllers\Admin\Business\DashboardController;
use App\Http\Controllers\Admin\Business\FinanceController;
use App\Http\Controllers\Admin\Business\InventoryController;
use App\Http\Controllers\Admin\Business\MasterController;
use App\Http\Controllers\Admin\Business\ReportController;
use App\Http\Controllers\Admin\Business\TransactionController;
use App\Http\Controllers\Admin\Business\UtilityController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [AuthenticatedSessionController::class, 'create'])
    ->middleware('guest')
    ->name('home');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])
        ->middleware(['request.signature', 'sql.injection.guard', 'xss.guard', 'throttle:5,1']);
});

Route::middleware(['auth', 'menu.access'])->prefix('admin')->group(function () {

    Route::get('/data-users', function () {
        return redirect()->route('users.index');
    });

    Route::resource('users', UserController::class)
        ->except(['create', 'show', 'edit']);
    Route::get('/users-access', [UserController::class, 'access'])
        ->name('users.access');
    Route::put('/users/{user}/access', [UserController::class, 'updateAccess'])
        ->name('users.access.update');

    // Upload endpoint (backend validation + audit)
    Route::post('/upload/image', [\App\Http\Controllers\UploadController::class, 'image'])
        ->middleware(['request.signature', 'sql.injection.guard', 'xss.guard', 'throttle:10,1'])
        ->name('upload.image');
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
        ->middleware(['sql.injection.guard', 'xss.guard', 'throttle:20,1'])
        ->name('logout');

    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::get('/master/{resource}', [MasterController::class, 'index'])->name('business.master.index');
    Route::post('/master/{resource}', [MasterController::class, 'store'])->name('business.master.store');
    Route::put('/master/{resource}/{id}', [MasterController::class, 'update'])->name('business.master.update');
    Route::delete('/master/{resource}/{id}', [MasterController::class, 'destroy'])->name('business.master.destroy');

    Route::get('/barang-bibit', [BarangBibitController::class, 'index'])->name('business.barang.index');
    Route::post('/barang-bibit', [BarangBibitController::class, 'store'])->name('business.barang.store');
    Route::put('/barang-bibit/{barang}', [BarangBibitController::class, 'update'])->name('business.barang.update');
    Route::delete('/barang-bibit/{barang}', [BarangBibitController::class, 'destroy'])->name('business.barang.destroy');

    Route::get('/stok-gudang', [InventoryController::class, 'stock'])->name('business.stock.index');
    Route::get('/stok-menipis', [InventoryController::class, 'lowStock'])->name('business.stock.low');
    Route::get('/mutasi-stok', [InventoryController::class, 'mutations'])->name('business.mutation.index');
    Route::post('/mutasi-stok', [InventoryController::class, 'storeMutation'])->name('business.mutation.store');

    Route::get('/pembelian', [TransactionController::class, 'pembelian'])->name('business.pembelian.index');
    Route::post('/pembelian', [TransactionController::class, 'storePembelian'])->name('business.pembelian.store');
    Route::get('/penjualan/{type}', [TransactionController::class, 'penjualan'])->name('business.penjualan.index');
    Route::post('/penjualan', [TransactionController::class, 'storePenjualan'])->name('business.penjualan.store');

    Route::get('/riwayat-pembelian', [TransactionController::class, 'riwayatPembelian'])->name('business.riwayat.pembelian');
    Route::get('/riwayat-penjualan/{type}', [TransactionController::class, 'riwayatPenjualan'])->name('business.riwayat.penjualan');

    Route::get('/hutang', [FinanceController::class, 'hutang'])->name('business.hutang.index');
    Route::post('/hutang/{hutang}/bayar', [FinanceController::class, 'payHutang'])->name('business.hutang.pay');
    Route::get('/piutang', [FinanceController::class, 'piutang'])->name('business.piutang.index');
    Route::post('/piutang/{piutang}/bayar', [FinanceController::class, 'payPiutang'])->name('business.piutang.pay');
    Route::get('/piutang-supplier', [FinanceController::class, 'piutangSupplier'])->name('business.piutang-supplier.index');
    Route::post('/piutang-supplier', [FinanceController::class, 'storePiutangSupplier'])->name('business.piutang-supplier.store');
    Route::post('/piutang-supplier/{piutangSupplier}/bayar', [FinanceController::class, 'payPiutangSupplier'])->name('business.piutang-supplier.pay');

    Route::get('/kas', [\App\Http\Controllers\Admin\Business\KasController::class, 'index'])->name('business.kas.index');
    Route::post('/kas', [\App\Http\Controllers\Admin\Business\KasController::class, 'store'])->name('business.kas.store');

    Route::get('/laporan/{type}', [ReportController::class, 'show'])->name('business.report.show');

    Route::get('/utility', [UtilityController::class, 'index'])->name('business.utility.index');
    Route::post('/utility/tutup-toko', [UtilityController::class, 'close'])->name('business.utility.close');


});
