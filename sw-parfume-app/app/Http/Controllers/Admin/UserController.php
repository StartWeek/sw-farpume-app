<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        $search = trim((string) request('search', ''));
        $perPage = (int) request('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 10;

        $users = User::query()
            ->select(['id', 'username', 'name', 'email', 'no_hp', 'role', 'akses_menu', 'created_at'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($innerQuery) use ($search) {
                    $innerQuery->where('username', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('role', 'like', "%{$search}%");
                });
            })
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        $users->setCollection(
            $users->getCollection()->map(function (User $user) {
                return $user;
            })
        );


        return Inertia::render('admin/datamaster/users/index', [
            'users' => $users,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
            ],
            'accessOptions' => $this->accessOptions(),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        User::create([
            'username' => $validated['username'],
            'name' => $validated['name'],
            'email' => $this->encrypt->doEncrypt($this->internalEmail($validated['username'])),
            'no_hp' => null,
            'role' => $validated['role'],
            'akses_menu' => $this->defaultAccessForRole($validated['role']),
            'password' => Hash::make($validated['password']),
        ]);

        return redirect()
            ->route('users.index')
            ->with('success', 'User berhasil ditambahkan.');
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->validated();

        $payload = [
            'username' => $validated['username'],
            'name' => $validated['name'],
            'role' => $validated['role'],
        ];

        if (empty($user->email)) {
            $payload['email'] = $this->encrypt->doEncrypt($this->internalEmail($validated['username']));
        }

        if (empty($user->akses_menu)) {
            $payload['akses_menu'] = $this->defaultAccessForRole($validated['role']);
        }

        if (!empty($validated['password'])) {
            $payload['password'] = Hash::make($validated['password']);
        }

        $user->update($payload);

        return redirect()
            ->route('users.index')
            ->with('success', 'User berhasil diperbarui.');
    }

    public function access(): Response
    {
        return Inertia::render('admin/datamaster/users/access', [
            'users' => User::query()
                ->select(['id', 'username', 'name', 'role', 'akses_menu'])
                ->where('role', '!=', 'superadmin')
                ->orderBy('name')
                ->get(),
            'accessOptions' => $this->accessOptions(),
        ]);
    }

    public function updateAccess(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'akses_menu' => ['array'],
            'akses_menu.*' => ['string'],
        ]);

        $allowedKeys = collect($this->accessOptions())->pluck('key')->all();
        $access = collect($validated['akses_menu'] ?? [])
            ->intersect($allowedKeys)
            ->values()
            ->all();

        $user->update(['akses_menu' => $access]);

        return back()->with('success', "Hak akses {$user->username} berhasil diperbarui.");
    }

    public function destroy(User $user): RedirectResponse
    {
        User::query()->whereKey($user->id)->delete();

        return redirect()
            ->route('users.index')
            ->with('success', 'User berhasil dihapus.');
    }

    private function internalEmail(string $username): string
    {
        return strtolower($username) . '@erp-parfum.local';
    }

    private function defaultAccessForRole(string $role): array
    {
        if ($role === 'superadmin') {
            return collect($this->accessOptions())->pluck('key')->all();
        }

        return match ($role) {
            'manager', 'kepala_toko' => [
                'dashboard',
                'master-wangi',
                'master-brand',
                'barang-bibit',
                'master-gudang',
                'master-supplier',
                'master-customer',
                'master-sales',
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
                'laporan-laba-kotor',
            ],
            default => [
                'dashboard',
                'master-customer',
                'master-sales',
                'stok-gudang',
                'penjualan-retail',
                'penjualan-grosir',
                'piutang',
                'laporan-penjualan',
                'laporan-piutang',
            ],
        };
    }

    private function accessOptions(): array
    {
        return [
            ['key' => 'dashboard', 'label' => 'Dasbor', 'group' => 'Utama'],
            ['key' => 'master-wangi', 'label' => 'Wangi', 'group' => 'Master Data'],
            ['key' => 'master-brand', 'label' => 'Brand', 'group' => 'Master Data'],
            ['key' => 'barang-bibit', 'label' => 'Barang Bibit', 'group' => 'Master Data'],
            ['key' => 'master-gudang', 'label' => 'Gudang', 'group' => 'Master Data'],
            ['key' => 'master-supplier', 'label' => 'Supplier', 'group' => 'Master Data'],
            ['key' => 'master-customer', 'label' => 'Customer', 'group' => 'Master Data'],
            ['key' => 'master-sales', 'label' => 'Sales', 'group' => 'Master Data'],
            ['key' => 'master-botol', 'label' => 'Botol', 'group' => 'Master Data'],
            ['key' => 'users', 'label' => 'Users', 'group' => 'Master Data'],
            ['key' => 'user-access', 'label' => 'Hak Akses User', 'group' => 'Master Data'],
            ['key' => 'stok-gudang', 'label' => 'Stok Gudang', 'group' => 'Inventory'],
            ['key' => 'mutasi-stok', 'label' => 'Mutasi Stok', 'group' => 'Inventory'],
            ['key' => 'stok-menipis', 'label' => 'Stok Menipis', 'group' => 'Inventory'],
            ['key' => 'pembelian', 'label' => 'Pembelian', 'group' => 'Transaksi'],
            ['key' => 'penjualan-retail', 'label' => 'Penjualan Retail', 'group' => 'Transaksi'],
            ['key' => 'penjualan-grosir', 'label' => 'Penjualan Sales', 'group' => 'Transaksi'],
            ['key' => 'hutang', 'label' => 'Hutang Supplier', 'group' => 'Transaksi'],
            ['key' => 'piutang', 'label' => 'Piutang Customer', 'group' => 'Transaksi'],
            ['key' => 'piutang-supplier', 'label' => 'Piutang Supplier', 'group' => 'Transaksi'],
            ['key' => 'laporan-pembelian', 'label' => 'Laporan Pembelian', 'group' => 'Laporan'],
            ['key' => 'laporan-penjualan', 'label' => 'Laporan Penjualan', 'group' => 'Laporan'],
            ['key' => 'laporan-stok', 'label' => 'Laporan Stok', 'group' => 'Laporan'],
            ['key' => 'laporan-mutasi-stok', 'label' => 'Laporan Mutasi Stok', 'group' => 'Laporan'],
            ['key' => 'laporan-barang-summary', 'label' => 'Laporan Barang Summary', 'group' => 'Laporan'],
            ['key' => 'laporan-hutang', 'label' => 'Laporan Hutang Supplier', 'group' => 'Laporan'],
            ['key' => 'laporan-piutang', 'label' => 'Laporan Piutang Customer', 'group' => 'Laporan'],
            ['key' => 'laporan-piutang-supplier', 'label' => 'Laporan Piutang Supplier', 'group' => 'Laporan'],
            ['key' => 'laporan-kas', 'label' => 'Laporan Kas', 'group' => 'Laporan'],
            ['key' => 'laporan-laba-kotor', 'label' => 'Laporan Laba Kotor', 'group' => 'Laporan'],
        ];
    }
}
