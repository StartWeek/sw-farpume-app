<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasMenuAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || in_array($user->role, ['superadmin', 'owner'], true)) {
            return $next($request);
        }

        if ($this->isSuperOnly($request)) {
            abort(403, 'Menu ini hanya untuk super user.');
        }

        $access = $user->akses_menu;

        if (!is_array($access) || $access === []) {
            return $next($request);
        }

        $required = $this->requiredAccess($request);

        if ($required === null || in_array($required, $access, true)) {
            return $next($request);
        }

        abort(403, 'Anda tidak memiliki akses ke menu ini.');
    }

    private function requiredAccess(Request $request): ?string
    {
        $routeName = (string) $request->route()?->getName();

        if (str_starts_with($routeName, 'users.access')) {
            return 'user-access';
        }

        if (str_starts_with($routeName, 'users.')) {
            return 'users';
        }

        return match ($routeName) {
            'dashboard' => 'dashboard',
            'business.barang.index', 'business.barang.store', 'business.barang.update', 'business.barang.destroy' => 'barang-bibit',
            'business.stock.index' => 'stok-gudang',
            'business.stock.low' => 'stok-menipis',
            'business.mutation.index', 'business.mutation.store' => 'mutasi-stok',
            'business.destroy-stock.index', 'business.destroy-stock.store' => 'hancur-stock',
            'business.pembelian.index', 'business.pembelian.store' => 'pembelian',
            'business.penjualan.store' => in_array($request->input('tipe_penjualan'), ['GROSIR', 'SALES'], true) ? 'penjualan-grosir' : 'penjualan-retail',
            'business.riwayat.pembelian' => 'riwayat-pembelian',
            'business.riwayat.penjualan' => 'riwayat-penjualan',
            'business.hutang.index', 'business.hutang.pay' => 'hutang',
            'business.piutang.index', 'business.piutang.pay' => 'piutang',
            'business.piutang-supplier.index', 'business.piutang-supplier.store', 'business.piutang-supplier.pay' => 'piutang-supplier',
            'business.utility.index', 'business.utility.close' => 'utility',
            'admin.setting-system', 'admin.setting-system.update' => 'setting-system',
            'admin.setting-nota', 'admin.setting-nota.update' => 'setting-nota',
            default => $this->resourceAccess($request),
        };
    }

    private function isSuperOnly(Request $request): bool
    {
        return in_array((string) $request->route()?->getName(), [
            'examples.components',
            'examples.subscriptions',
            'examples.async-options',
        ], true);
    }

    private function resourceAccess(Request $request): ?string
    {
        $routeName = (string) $request->route()?->getName();

        if (str_starts_with($routeName, 'business.master.')) {
            return match ($request->route('resource')) {
                'brand' => 'master-brand',
                'gudang' => 'master-gudang',
                'supplier' => 'master-supplier',
                'customer' => 'master-customer',
                'sales' => 'master-sales',
                'botol' => 'master-botol',
                default => null,
            };
        }

        if (in_array($routeName, ['business.penjualan.index', 'business.riwayat.penjualan'], true)) {
            return in_array($request->route('type'), ['grosir', 'sales'], true) ? 'penjualan-grosir' : 'penjualan-retail';
        }

        if ($routeName === 'business.report.show') {
            return match ($request->route('type')) {
                'pembelian' => 'laporan-pembelian',
                'penjualan' => 'laporan-penjualan',
                'stok' => 'laporan-stok',
                'mutasi-stok' => 'laporan-mutasi-stok',
                'barang-summary' => 'laporan-barang-summary',
                'hutang' => 'laporan-hutang',
                'piutang' => 'laporan-piutang',
                'piutang-supplier' => 'laporan-piutang-supplier',
                'laba-kotor' => 'laporan-laba-kotor',
                'kas' => 'laporan-kas',
                default => null,
            };
        }

        return null;
    }
}
