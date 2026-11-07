<?php

namespace App\Services\Business;

use App\Models\Business\TransactionValidation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class PaymentHistoryService
{
    public function attach(LengthAwarePaginator $rows, string $type, ?string $relation = null): LengthAwarePaginator
    {
        $records = collect($rows->items())
            ->map(fn ($row) => $relation ? $row->{$relation} : $row)
            ->filter()
            ->unique('id');

        if ($records->isEmpty()) {
            return $rows;
        }

        $entries = TransactionValidation::query()
            ->where('type', $type)
            ->whereIn('status', ['APPROVED', 'PENDING'])
            ->whereIn('payload->record_id', $records->pluck('id')->all())
            ->orderBy('reviewed_at')
            ->orderBy('id')
            ->get()
            ->groupBy(fn (TransactionValidation $entry) => (string) $entry->payload['record_id']);

        $sourceRelation = match ($type) {
            'bayar-hutang' => 'pembelian',
            'bayar-piutang' => 'penjualan',
            default => null,
        };
        if ($sourceRelation) {
            (new Collection($records->all()))->loadMissing($sourceRelation);
        }
        foreach ($records as $record) {
            $source = $sourceRelation ? $record->{$sourceRelation} : null;
            $total = (float) ($type === 'bayar-hutang' ? $record->total_hutang : $record->total_piutang);
            $initialPaid = (float) ($source?->jumlah_bayar ?? 0);
            $payments = [];
            $pending = [];
            if ($initialPaid > 0) {
                $payments[] = [
                    'number' => $source->no_pembelian ?? $source->no_penjualan,
                    'date' => $source->tanggal?->format('Y-m-d'),
                    'label' => 'Pembayaran awal / DP',
                    'amount' => $initialPaid,
                    'remaining' => max(0, $total - $initialPaid),
                ];
            }
            foreach ($entries->get((string) $record->id, collect()) as $entry) {
                $payment = [
                    'number' => $entry->number,
                    'date' => $entry->operational_date->format('Y-m-d'),
                    'label' => 'Pembayaran',
                    'amount' => (float) $entry->snapshot['amount'],
                    'remaining' => data_get($entry->result, $type === 'bayar-hutang' ? 'details.sisa_hutang' : 'details.sisa_piutang'),
                ];
                if ($entry->status === 'APPROVED') {
                    $payments[] = $payment;
                } else {
                    $pending[] = $payment;
                }
            }
            $record->setAttribute('payment_history', [
                'payments' => $payments,
                'pending' => $pending,
                'untracked_paid' => max(0, round((float) $record->total_bayar - array_sum(array_column($payments, 'amount')), 2)),
            ]);
        }

        return $rows;
    }
}
