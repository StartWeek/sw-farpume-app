<?php

namespace App\Services\Business;

use App\Models\Business\BarangBibit;
use App\Models\Business\Botol;
use App\Models\Business\BotolKosong;
use App\Models\Business\Customer;
use App\Models\Business\Gudang;
use App\Models\Business\Hutang;
use App\Models\Business\Piutang;
use App\Models\Business\PiutangSupplier;
use App\Models\Business\Sales;
use App\Models\Business\Supplier;
use App\Models\Business\StokGudang;
use App\Models\Business\SystemDate;
use App\Models\Business\TransactionValidation;
use App\Models\Business\TransaksiBotolKosong;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class TransactionValidationService
{
    public const SUBMITTED_MESSAGE = 'Pengajuan transaksi diterima. Periksa statusnya di menu Validasi.';

    public const TYPES = [
        'pembelian' => ['label' => 'Pembelian Supplier', 'access' => 'pembelian'],
        'penjualan-retail' => ['label' => 'Penjualan Retail', 'access' => 'penjualan-retail'],
        'penjualan-sales' => ['label' => 'Penjualan Sales', 'access' => 'penjualan-grosir'],
        'penjualan-botol' => ['label' => 'Penjualan Botol Kosong', 'access' => 'penjualan-retail'],
        'mutasi-stok' => ['label' => 'Mutasi Stok Isi', 'access' => 'mutasi-stok'],
        'mutasi-botol' => ['label' => 'Mutasi Botol Kosong', 'access' => 'mutasi-stok'],
        'hancur-stock' => ['label' => 'Hancur Stok Isi', 'access' => 'hancur-stock'],
        'hancur-botol' => ['label' => 'Hancur Botol Kosong', 'access' => 'hancur-stock'],
        'hutang-supplier' => ['label' => 'Hutang Supplier', 'access' => 'hutang'],
        'piutang-supplier' => ['label' => 'Piutang Supplier', 'access' => 'piutang-supplier'],
        'bayar-hutang' => ['label' => 'Pembayaran Hutang', 'access' => 'hutang'],
        'bayar-piutang' => ['label' => 'Pembayaran Piutang Customer', 'access' => 'piutang'],
        'bayar-piutang-supplier' => ['label' => 'Pembayaran Piutang Supplier', 'access' => 'piutang-supplier'],
        'kas' => ['label' => 'Kas Manual', 'access' => 'kas'],
    ];

    public function __construct(private readonly BusinessService $business) {}

    public function allowedTypes(User $user): array
    {
        if (in_array($user->role, ['superadmin', 'owner'], true) || ! is_array($user->akses_menu) || $user->akses_menu === []) {
            return array_keys(self::TYPES);
        }

        return array_keys(array_filter(self::TYPES, fn (array $type) => in_array($type['access'], $user->akses_menu, true)));
    }

    public function submit(string $type, array $payload, User $user, ?string $key = null): TransactionValidation
    {
        $this->authorize($user, $type);
        $key ??= request()->header('Idempotency-Key');
        Validator::make(['submission_key' => $key], ['submission_key' => ['required', 'uuid']], [
            'submission_key.required' => 'Kunci pengajuan tidak tersedia. Muat ulang halaman lalu ajukan kembali.',
        ])->validate();
        unset($payload['created_by'], $payload['tanggal']);
        $hash = hash('sha256', json_encode([$type, $this->canonicalPayload($payload)], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($type, $payload, $user, $key, $hash): TransactionValidation {
            $system = $this->lockSystem();
            $existing = TransactionValidation::query()->where('submission_key', $key)->first();
            if ($existing) {
                if ($existing->submitted_by_id !== $user->id) {
                    throw new AuthorizationException('Kunci pengajuan dimiliki pengguna lain.');
                }
                if ($existing->payload_hash !== $hash) {
                    throw ValidationException::withMessages(['submission_key' => 'Pengajuan sebelumnya sudah diterima dengan data berbeda. Periksa menu Validasi sebelum membuat transaksi baru.']);
                }

                return $existing;
            }

            $payload['created_by'] = $user->name;
            $payload['tanggal'] = $system->tanggal_system->toDateString();
            [$payload, $snapshot] = $this->prepare($type, $payload);

            return TransactionValidation::query()->create([
                'submission_key' => $key, 'payload_hash' => $hash, 'type' => $type, 'status' => 'PENDING',
                'operational_date' => $system->tanggal_system, 'payload' => $payload, 'snapshot' => $snapshot,
                'submitted_by_id' => $user->id, 'submitted_by_name' => $user->name,
            ]);
        }, 3);
    }

    public function approve(int $id, User $user): TransactionValidation
    {
        return DB::transaction(function () use ($id, $user): TransactionValidation {
            $system = $this->lockSystem();
            $request = TransactionValidation::query()->lockForUpdate()->findOrFail($id);
            $this->authorize($user, $request->type);
            $this->ensurePending($request);
            if (! $request->operational_date->isSameDay($system->tanggal_system)) {
                throw ValidationException::withMessages(['validation' => 'Tanggal operasional pengajuan sudah berubah. Tolak dan buat pengajuan baru pada tanggal operasional aktif.']);
            }
            $payload = $request->payload;
            try {
                [, $current] = $this->prepare($request->type, $payload);
            } catch (ModelNotFoundException) {
                throw ValidationException::withMessages(['validation' => 'Data referensi transaksi sudah tidak tersedia. Tolak pengajuan ini dan buat pengajuan baru dengan data yang valid.']);
            }
            if (($current['posting_signature'] ?? null) !== ($request->snapshot['posting_signature'] ?? null)) {
                throw ValidationException::withMessages(['validation' => 'Konversi atau nilai transaksi berubah sejak diajukan. Tolak dan ajukan ulang agar detailnya sesuai.']);
            }
            $payload['no_transaksi'] ??= $request->number;
            $posted = $this->post($request->type, $payload);
            $result = $posted instanceof Model ? [
                'id' => $posted->getKey(),
                'details' => $posted->only(['total_pembelian', 'total_penjualan', 'jumlah_bayar', 'payment_details', 'status_pembayaran', 'total_hutang', 'sisa_hutang', 'total_piutang', 'sisa_piutang', 'total_bayar', 'status_hutang', 'status_piutang', 'stok_awal', 'stok_akhir', 'saldo_akhir']),
                'number' => $posted->no_pembelian ?? $posted->no_penjualan ?? $posted->no_hutang ?? $posted->no_piutang_supplier ?? $posted->no_piutang ?? $posted->no_transaksi,
            ] : null;
            $request->update([
                'status' => 'APPROVED', 'reviewed_by_id' => $user->id, 'reviewed_by_name' => $user->name,
                'reviewed_at' => now(), 'result' => $result,
            ]);

            return $request->refresh();
        }, 3);
    }

    public function reject(int $id, User $user, string $reason): TransactionValidation
    {
        $reason = trim($reason);
        Validator::make(['reason' => $reason], ['reason' => ['required', 'string', 'max:1000']])->validate();

        return DB::transaction(function () use ($id, $user, $reason): TransactionValidation {
            $this->lockSystem();
            $request = TransactionValidation::query()->lockForUpdate()->findOrFail($id);
            $this->authorize($user, $request->type);
            $this->ensurePending($request);
            $request->update([
                'status' => 'REJECTED', 'rejection_reason' => $reason,
                'reviewed_by_id' => $user->id, 'reviewed_by_name' => $user->name, 'reviewed_at' => now(),
            ]);

            return $request->refresh();
        }, 3);
    }

    private function authorize(User $user, string $type): void
    {
        if (! in_array($type, $this->allowedTypes($user), true)) {
            throw new AuthorizationException('Anda tidak memiliki akses untuk memvalidasi jenis transaksi ini.');
        }
    }

    private function lockSystem(): SystemDate
    {
        return SystemDate::query()->lockForUpdate()->firstOrCreate(['id' => 1], ['tanggal_system' => today()->toDateString()]);
    }

    private function ensurePending(TransactionValidation $request): void
    {
        if ($request->status !== 'PENDING') {
            throw ValidationException::withMessages(['validation' => 'Pengajuan ini sudah diproses. Muat ulang daftar validasi.']);
        }
    }

    private function prepare(string $type, array $payload): array
    {
        $trade = $type === 'pembelian' || str_starts_with($type, 'penjualan-');
        if ($trade) {
            $locations = [];
            foreach ($payload['items'] as $item) {
                $bottle = ($item['tipe_item'] ?? 'BIBIT') === 'BOTOL';
                $record = $bottle ? BotolKosong::query()->findOrFail($item['item_id']) : BarangBibit::query()->findOrFail($item['item_id']);
                $locations[] = $this->itemWarehouse($record, $bottle);
            }
            if (count(array_unique($locations)) !== 1) throw ValidationException::withMessages(['items' => 'Barang berasal dari gudang berbeda. Buat transaksi terpisah.']);
            $resolved = $locations[0];
            if (!empty($payload['id_gudang']) && (int) $payload['id_gudang'] !== $resolved) throw ValidationException::withMessages(['items' => 'Gudang barang telah berubah. Periksa master dan ajukan ulang transaksi.']);
            $payload['id_gudang'] = $resolved;
        } elseif (in_array($type, ['mutasi-stok', 'hancur-stock', 'mutasi-botol', 'hancur-botol'], true)) {
            $bottle = in_array($type, ['mutasi-botol', 'hancur-botol'], true);
            $record = $bottle ? BotolKosong::query()->findOrFail($payload['id_barang']) : BarangBibit::query()->findOrFail($payload['id_barang']);
            $resolved = $this->itemWarehouse($record, $bottle);
            if (!empty($payload['id_gudang']) && (int) $payload['id_gudang'] !== $resolved) throw ValidationException::withMessages(['items' => 'Gudang barang telah berubah. Periksa master dan ajukan ulang transaksi.']);
            $payload['id_gudang'] = $resolved;
        }

        $snapshot = [
            'label' => self::TYPES[$type]['label'],
            'party' => $payload['pihak'] ?? '-',
            'warehouse' => ! empty($payload['id_gudang']) ? Gudang::query()->findOrFail($payload['id_gudang'])->nama_gudang : null,
            'payment_method' => $payload['metode_pembayaran'] ?? null,
            'sales' => ! empty($payload['id_sales']) ? Sales::query()->findOrFail($payload['id_sales'])->nama_sales : null,
            'discount' => (float) ($payload['discount'] ?? 0),
            'down_payment' => (float) ($payload['jumlah_bayar'] ?? 0),
            'due_date' => $payload['jatuh_tempo'] ?? null,
            'notes' => $payload['keterangan'] ?? null,
            'direction' => $payload['tipe_mutasi'] ?? $payload['jenis_transaksi'] ?? null,
            'amount' => null, 'items' => [],
        ];
        if (! empty($payload['id_supplier'])) {
            $snapshot['party'] = Supplier::query()->findOrFail($payload['id_supplier'])->nama_supplier;
        } elseif (! empty($payload['id_customer'])) {
            $snapshot['party'] = Customer::query()->findOrFail($payload['id_customer'])->nama_customer;
        } elseif (! empty($payload['manual_customer_name'])) {
            $snapshot['party'] = $payload['manual_customer_name'];
        }

        if ($type === 'pembelian' || str_starts_with($type, 'penjualan-')) {
            foreach ($payload['items'] as $item) {
                if (($item['tipe_item'] ?? 'BIBIT') === 'BOTOL') {
                    $bottle = BotolKosong::query()->findOrFail($item['item_id'] ?? $item['id_botol']);
                    if ((int) $bottle->id_gudang !== (int) $payload['id_gudang']) {
                        throw ValidationException::withMessages(['items' => 'Botol kosong tidak berada di gudang yang dipilih.']);
                    }
                }
            }
            $preview = $this->business->previewTransaction($payload, $type === 'pembelian');
            $payload = $preview['payload'];
            $snapshot = [...$snapshot, ...$preview['snapshot']];
            if ($type !== 'pembelian') $this->ensureStockAvailable((int) $payload['id_gudang'], $snapshot['items']);
        } elseif (str_starts_with($type, 'bayar-')) {
            $record = $this->paymentRecord($type, (int) $payload['record_id']);
            $snapshot['amount'] = (float) $payload['jumlah_bayar'];
            $snapshot['reference'] = $record->no_hutang ?? $record->no_piutang_supplier ?? $record->no_piutang;
            $snapshot['party'] = $type === 'bayar-piutang' ? $record->customer?->nama_customer ?? '-' : $record->supplier?->nama_supplier ?? '-';
            $remaining = (float) ($type === 'bayar-hutang' ? $record->sisa_hutang : $record->sisa_piutang);
            $snapshot['remaining_before'] = $remaining;
            if ($snapshot['amount'] > $remaining) {
                throw ValidationException::withMessages(['jumlah_bayar' => 'Jumlah pembayaran melebihi sisa hutang/piutang saat ini.']);
            }
        } elseif (in_array($type, ['mutasi-stok', 'hancur-stock', 'mutasi-botol', 'hancur-botol'], true)) {
            $bottle = in_array($type, ['mutasi-botol', 'hancur-botol'], true);
            if (! $bottle) {
                if ($payload['tipe_mutasi'] === 'MASUK') {
                    unset($payload['qty_ml']);
                } else {
                    unset($payload['jumlah_botol']);
                }
            }
            $item = $bottle ? BotolKosong::query()->findOrFail($payload['id_barang']) : BarangBibit::query()->findOrFail($payload['id_barang']);
            if ($bottle && (int) $item->id_gudang !== (int) $payload['id_gudang']) {
                throw ValidationException::withMessages(['id_barang' => 'Botol kosong tidak berada di gudang yang dipilih.']);
            }
            $qty = (float) ($payload['qty_ml'] ?? $payload['jumlah_botol'] ?? 0);
            $baseQty = $qty;
            if (! $bottle && ! isset($payload['qty_ml']) && $item->jenis_barang !== 'ABSOLUTE') {
                $capacity = ! empty($payload['id_botol'])
                    ? (float) Botol::query()->findOrFail($payload['id_botol'])->varian_ml
                    : (float) $item->botol?->varian_ml;
                if ($capacity <= 0) {
                    throw ValidationException::withMessages(['id_botol' => 'Pilih varian botol terlebih dahulu.']);
                }
                $baseQty *= $capacity;
            }
            $snapshot['items'] = [[
                'code' => $bottle ? $item->kode_botol : $item->kode_barang,
                'name' => $bottle ? $item->nama_botol : $item->nama_barang,
                'qty' => $qty,
                'unit' => isset($payload['qty_ml']) ? 'ML' : ($bottle || $item->jenis_barang !== 'ABSOLUTE' ? 'BOTOL' : 'ML'),
                'base_qty' => $baseQty, 'base_unit' => $bottle ? 'BOTOL' : 'ML',
            ]];
            $snapshot['posting_signature'] = hash('sha256', json_encode([$baseQty, $payload['id_botol'] ?? null], JSON_THROW_ON_ERROR));
            if ($payload['tipe_mutasi'] === 'KELUAR') {
                $this->ensureStockAvailable((int) $payload['id_gudang'], [[
                    'name' => $bottle ? $item->nama_botol : $item->nama_barang, 'item_id' => $item->id,
                    'base_qty' => $baseQty, 'base_unit' => $bottle ? 'BOTOL' : 'ML',
                    'variant_id' => $payload['id_botol'] ?? null,
                ]], true);
            }

        } else {
            $snapshot['amount'] = (float) ($payload['jumlah'] ?? $payload['total_hutang'] ?? $payload['total_piutang'] ?? 0);
        }

        return [$payload, $snapshot];
    }

    private function paymentRecord(string $type, int $id): Model
    {
        return match ($type) {
            'bayar-hutang' => Hutang::query()->with('supplier')->lockForUpdate()->findOrFail($id),
            'bayar-piutang' => Piutang::query()->with('customer')->lockForUpdate()->findOrFail($id),
            'bayar-piutang-supplier' => PiutangSupplier::query()->with('supplier')->lockForUpdate()->findOrFail($id),
        };
    }

    private function itemWarehouse(Model $item, bool $bottle): int
    {
        $query = Gudang::query()->where('status', 'AKTIF')->where('tipe_gudang', $bottle ? 'BOTOL' : 'BIBIT');
        if ($item->id_gudang) {
            $id = (clone $query)->whereKey($item->id_gudang)->value('id');
        } else {
            $ids = (clone $query)->pluck('id');
            if ($ids->count() !== 1 && !$bottle) {
                $locations = StokGudang::query()->where('id_barang', $item->id)->where('stok_ml', '>', 0)->distinct()->pluck('id_gudang');
                $ids = $ids->intersect($locations);
            }
            $id = $ids->count() === 1 ? $ids->first() : null;
        }
        if (!$id) throw ValidationException::withMessages(['items' => 'Gudang otomatis untuk '.($item->nama_barang ?? $item->nama_botol).' belum tersedia. Tetapkan gudang aktif di master barang.']);
        return (int) $id;
    }

    private function ensureStockAvailable(int $warehouse, array $items, bool $exactVariant = false): void
    {
        $stocks = StokGudang::query()->where('id_gudang', $warehouse)->orderBy('id')->get();
        $balances = $stocks->mapWithKeys(fn ($row) => [$row->id => (float) $row->stok_ml])->all();
        $bottles = [];
        foreach ($items as $item) {
            $requested = (float) $item['base_qty'];
            if ($item['base_unit'] === 'BOTOL') {
                $id = $item['item_id'];
                $bottles[$id] ??= (float) BotolKosong::query()->whereKey($id)->where('id_gudang', $warehouse)->value('stock');
                $available = $bottles[$id];
                $bottles[$id] = round($bottles[$id] - $requested, 2);
            } else {
                $matching = $stocks->filter(fn ($row) => (int) $row->id_barang === (int) $item['item_id'] && ((!$exactVariant && empty($item['variant_id'])) || (int) $row->id_botol === (int) ($item['variant_id'] ?? 0)));
                $available = $matching->sum(fn ($row) => $balances[$row->id]);
                $remaining = $requested;
                foreach ($matching as $row) {
                    $take = min($remaining, $balances[$row->id]);
                    $balances[$row->id] = round($balances[$row->id] - $take, 2); $remaining -= $take;
                }
            }
            if ($requested - $available > 0.00000001) {
                $format = fn ($value) => preg_replace('/,00$/', '', number_format($value, 2, ',', '.'));
                throw ValidationException::withMessages(['items' => 'Stok '.$item['name'].' tidak cukup. Tersedia '.$format($available).' '.$item['base_unit'].', diminta '.$format($requested).' '.$item['base_unit'].'.']);
            }
        }
    }

    private function post(string $type, array $payload): ?Model
    {
        return match ($type) {
            'pembelian' => $this->business->createPembelian($payload),
            'penjualan-retail', 'penjualan-sales', 'penjualan-botol' => $this->business->createPenjualan($payload),
            'mutasi-stok', 'hancur-stock' => $this->business->createStockMutation($payload),
            'mutasi-botol', 'hancur-botol' => $this->postBottleMutation($payload, $type === 'hancur-botol' ? 'DESTROY' : 'ADJUSTMENT'),
            'hutang-supplier' => $this->business->createHutangSupplier($payload),
            'piutang-supplier' => $this->business->createPiutangSupplier($payload),
            'bayar-hutang' => $this->business->payHutang($this->paymentRecord($type, $payload['record_id']), (float) $payload['jumlah_bayar'], $payload['created_by']),
            'bayar-piutang' => $this->business->payPiutang($this->paymentRecord($type, $payload['record_id']), (float) $payload['jumlah_bayar'], $payload['created_by']),
            'bayar-piutang-supplier' => $this->business->payPiutangSupplier($this->paymentRecord($type, $payload['record_id']), (float) $payload['jumlah_bayar']),
            'kas' => $this->business->createManualCash($payload),
        };
    }

    private function postBottleMutation(array $payload, string $source): Model
    {
        $bottle = BotolKosong::query()->lockForUpdate()->findOrFail($payload['id_barang']);
        $before = (float) $bottle->stock;
        $this->business->adjustBotolKosongStock($payload);

        return TransaksiBotolKosong::query()->create([
            'tanggal' => $payload['tanggal'], 'id_gudang' => $payload['id_gudang'], 'id_botol_kosong' => $bottle->id,
            'tipe_mutasi' => $payload['tipe_mutasi'], 'qty_botol' => $payload['jumlah_botol'],
            'stok_awal' => $before, 'stok_akhir' => (float) $bottle->fresh()->stock,
            'sumber_transaksi' => $source, 'no_transaksi' => $payload['no_transaksi'],
            'keterangan' => $payload['keterangan'] ?? null, 'created_by' => $payload['created_by'],
        ]);
    }

    private function canonicalPayload(array $payload): array
    {
        if (! array_is_list($payload)) {
            ksort($payload);
        }
        foreach ($payload as &$value) {
            if (is_array($value)) {
                $value = $this->canonicalPayload($value);
            }
        }

        return $payload;
    }
}
