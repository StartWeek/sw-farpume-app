<?php

namespace App\Models\Business;

use Illuminate\Database\Eloquent\Model;

class TransactionValidation extends Model
{
    protected $table = 'tt_validasi_transaksi';

    protected $fillable = [
        'submission_key', 'payload_hash', 'type', 'status', 'operational_date', 'payload', 'snapshot',
        'submitted_by_id', 'submitted_by_name', 'reviewed_by_id', 'reviewed_by_name',
        'reviewed_at', 'rejection_reason', 'result',
    ];

    protected $hidden = ['submission_key', 'payload_hash', 'payload'];

    protected $appends = ['number', 'pdf_url', 'receipt_url'];

    protected $casts = [
        'payload' => 'array', 'snapshot' => 'array', 'result' => 'array',
        'operational_date' => 'date:Y-m-d', 'reviewed_at' => 'datetime',
        'submitted_by_id' => 'integer', 'reviewed_by_id' => 'integer',
    ];

    public function getReceiptUrlAttribute(): string
    {
        return str_starts_with($this->type, 'penjualan-') || $this->type === 'bayar-piutang'
            ? route('business.validation.slip', $this->id, false)
            : $this->pdf_url;
    }

    public function getPdfUrlAttribute(): string
    {
        return route('business.validation.pdf', $this->id, false);
    }

    public function getNumberAttribute(): string
    {
        return 'VLD-'.str_pad((string) $this->id, 6, '0', STR_PAD_LEFT);
    }
}
