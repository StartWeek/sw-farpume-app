import React, { useState } from "react";
import Button from "@/components/common/Button";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { CurrencyInput, Field, money } from "./_components";
import { formatBusinessDate } from "./formatters";

export function PaymentTable({ rows, onRemove, disabled = false }) {
    if (!rows.length) return null;
    return <div className="overflow-x-auto rounded-lg border border-stroke">
        <table className="w-full text-left text-sm" aria-label="Pembayaran yang ditambahkan">
            <thead className="bg-page text-xs text-muted"><tr><th className="px-3 py-2">Metode</th><th className="px-3 py-2 text-right">Nominal</th><th className="w-12 px-2 py-2"><span className="sr-only">Aksi</span></th></tr></thead>
            <tbody className="divide-y divide-stroke">{rows.map((row, index) => <tr key={row.label}>
                <td className="px-3 py-2 text-main">{row.label}</td>
                <td className="px-3 py-2 text-right font-bold tabular-nums text-main">{money(row.amount)}</td>
                {index === 0 && <td rowSpan={rows.length} className="px-2 py-2"><Button variant="ghost" icon={IconTrash} iconOnly aria-label="Hapus pembayaran dari tabel" disabled={disabled} onClick={onRemove} /></td>}
            </tr>)}</tbody>
        </table>
    </div>;
}

export function PaymentAmountEntry({ amount, onChange, remaining, error, disabled = false, label = "Pembayaran" }) {
    const [draft, setDraft] = useState("");
    const [entryError, setEntryError] = useState("");
    const add = () => {
        const value = Number(draft);
        if (!Number.isFinite(value) || value <= 0 || value > Number(remaining)) {
            setEntryError("Nominal harus lebih dari nol dan tidak melebihi sisa tagihan.");
            return;
        }
        setEntryError("");
        onChange(draft);
    };
    return <div className="space-y-3">
        <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1"><Field label="Jumlah Bayar"><CurrencyInput disabled={disabled} value={draft} error={!!(error || entryError)} onChange={(event) => { setDraft(event.target.value); setEntryError(""); onChange(""); }} /></Field></div>
            <Button icon={IconPlus} iconOnly aria-label="Tambahkan pembayaran ke tabel" disabled={disabled} onClick={add} />
        </div>
        {(entryError || error) && <p role="alert" className="text-xs text-red-600">{entryError || error}</p>}
        <PaymentTable rows={Number(amount) > 0 ? [{ label, amount }] : []} disabled={disabled} onRemove={() => { onChange(""); setDraft(""); }} />
    </div>;
}

export function PaymentBreakdown({ details }) {
    if (!details) return null;
    return <div className="mt-2 space-y-1 text-xs text-muted">
        {Number(details.cash_received) > 0 && <p>Cash diterima: {money(details.cash_received)}</p>}
        {Number(details.transfer) > 0 && <p>Transfer: {money(details.transfer)}</p>}
        {Number(details.change) > 0 && <p className="font-bold">Kembalian: {money(details.change)}</p>}
    </div>;
}

export function PaymentSummary({ total, paid = 0, remaining = Number(total) - Number(paid), amount = 0 }) {
    const balance = Number(remaining);
    const currentPayment = Number(amount || 0);
    const afterPayment = balance - currentPayment;
    return (
        <section aria-label="Ringkasan pembayaran" className="space-y-2 border-t border-stroke pt-4 text-sm" aria-live="polite">
            <div className="flex justify-between gap-3 text-main"><span>Total Tagihan</span><span className="font-bold tabular-nums">{money(total)}</span></div>
            <div className="flex justify-between gap-3 text-muted"><span>Sudah Dibayar</span><span className="tabular-nums">{money(paid)}</span></div>
            <div className="flex justify-between gap-3 text-main"><span>Sisa Sebelum Pembayaran</span><span className="font-bold tabular-nums">{money(balance)}</span></div>
            <div className="flex justify-between gap-3 text-main"><span>Pembayaran Sekarang</span><span className="font-bold tabular-nums">{money(currentPayment)}</span></div>
            <div className="flex justify-between gap-3 rounded-lg bg-page px-3 py-3 font-extrabold text-main"><span>Sisa Setelah Pembayaran</span><span className="tabular-nums">{money(Math.max(0, afterPayment))}</span></div>
            {afterPayment < 0 && <p role="alert" className="text-xs font-bold text-red-600">Pembayaran melebihi sisa tagihan sebesar {money(-afterPayment)}.</p>}
        </section>
    );
}

export function PaymentHistory({ history }) {
    const payments = history?.payments || [];
    const pending = history?.pending || [];
    if (!payments.length && !pending.length && !(Number(history?.untracked_paid) > 0)) return null;
    return (
        <section aria-label="Riwayat pembayaran" className="space-y-3 border-t border-stroke pt-4">
            <h3 className="text-sm font-bold text-main">Riwayat Pembayaran</h3>
            {payments.length ? <div className="max-h-60 overflow-auto rounded-lg border border-stroke">
                <table className="w-full text-left text-xs">
                    <thead className="bg-page text-muted"><tr><th className="px-3 py-2">Tanggal / Referensi</th><th className="px-3 py-2 text-right">Dibayar</th><th className="px-3 py-2 text-right">Sisa</th></tr></thead>
                    <tbody className="divide-y divide-stroke">
                        {payments.map((payment) => <tr key={payment.number}>
                            <td className="px-3 py-2 text-main"><p>{formatBusinessDate(payment.date)}</p><p className="mt-1 break-all text-muted">{payment.number}</p><p className="text-muted">{payment.label}</p></td>
                            <td className="px-3 py-2 text-right font-bold tabular-nums text-main">{money(payment.amount)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-main">{payment.remaining == null ? "-" : money(payment.remaining)}</td>
                        </tr>)}
                    </tbody>
                </table>
            </div> : null}
            {Number(history?.untracked_paid) > 0 && <p className="text-xs text-muted">Pembayaran lama tanpa rincian riwayat: <strong>{money(history.untracked_paid)}</strong>. Sudah termasuk total dibayar.</p>}
            {!!pending.length && <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-700">Menunggu Validasi — Belum Dihitung</h4>
                <ul className="max-h-40 divide-y divide-stroke overflow-y-auto text-xs">
                    {pending.map((payment) => <li key={payment.number} className="flex justify-between gap-3 py-2"><span className="text-muted">{formatBusinessDate(payment.date)}<br />{payment.number}</span><strong className="tabular-nums text-main">{money(payment.amount)}</strong></li>)}
                </ul>
            </div>}
        </section>
    );
}
