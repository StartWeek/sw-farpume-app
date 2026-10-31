<?php

namespace App\Services\Business;

use Illuminate\Validation\ValidationException;

class TransactionPayment
{
    public static function resolve(array $payload, float $total): array
    {
        $method = $payload['metode_pembayaran'];
        $total = round($total, 2);
        $input = round((float) ($payload['jumlah_bayar'] ?? $total), 2);
        $details = null;

        if ($method === 'DP' && (! is_finite($input) || $input <= 0 || $input > $total || ! isset($payload['jumlah_bayar']))) {
            throw ValidationException::withMessages(['jumlah_bayar' => 'DP harus lebih dari nol dan tidak melebihi total tagihan.']);
        }
        if ($method === 'SPLIT') {
            $cash = round((float) ($payload['cash_amount'] ?? 0), 2);
            $transfer = round((float) ($payload['transfer_amount'] ?? 0), 2);
            if (! is_finite($cash) || ! is_finite($transfer) || $cash <= 0 || $transfer <= 0 || $transfer >= $total) {
                throw ValidationException::withMessages(['cash_amount' => 'Split wajib memiliki nominal cash dan transfer lebih dari nol; transfer harus kurang dari total tagihan.']);
            }
            if (round($cash + $transfer, 2) < $total) {
                throw ValidationException::withMessages(['cash_amount' => 'Total cash dan transfer belum melunasi tagihan. Gunakan DP untuk pembayaran sebagian.']);
            }
            $details = ['cash_received' => $cash, 'cash' => round($total - $transfer, 2), 'transfer' => $transfer, 'change' => round($cash + $transfer - $total, 2)];
        } elseif (in_array($method, ['CASH', 'TRANSFER'], true) && isset($payload['jumlah_bayar'])) {
            if (! is_finite($input) || $input < $total) {
                throw ValidationException::withMessages(['jumlah_bayar' => 'Cash dan Transfer wajib lunas. Gunakan DP untuk pembayaran sebagian.']);
            }
            if ($method === 'TRANSFER' && $input !== $total) {
                throw ValidationException::withMessages(['jumlah_bayar' => 'Nominal transfer harus sama dengan total tagihan.']);
            }
            $details = [
                'cash_received' => $method === 'CASH' ? $input : 0,
                'cash' => $method === 'CASH' ? $total : 0,
                'transfer' => $method === 'TRANSFER' ? $total : 0,
                'change' => $method === 'CASH' ? round($input - $total, 2) : 0,
            ];
        }

        $paid = match ($method) {
            'CASH', 'TRANSFER', 'SPLIT' => $total,
            'TEMPO' => 0.0,
            'DP' => $input,
            default => throw ValidationException::withMessages(['metode_pembayaran' => 'Metode pembayaran tidak valid.']),
        };
        $remaining = max(0, $total - $paid);

        return [
            'paid' => $paid,
            'remaining' => $remaining,
            'stored_method' => $method === 'DP' ? 'TEMPO' : $method,
            'status' => $remaining <= 0 ? 'LUNAS' : ($paid > 0 ? 'SEBAGIAN' : 'BELUM_LUNAS'),
            'details' => $details,
        ];
    }
}
