import React, { useEffect, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import Button from "@/components/common/Button";
import toast from "react-hot-toast";
import { Card, Field, PageHeader, Select, SimpleTable, Textarea, formatBusinessDate, money, number } from "./_components";
import { withPdfProof } from "./useTransactionSubmissionOptions";
import { TransactionDialog } from "./TransactionDialogs";
import { PaymentBreakdown } from "./PaymentDetails";

const statuses = {
    PENDING: { label: "Menunggu", color: "bg-amber-50 text-amber-800" },
    APPROVED: { label: "Disetujui", color: "bg-green-50 text-green-800" },
    REJECTED: { label: "Ditolak", color: "bg-red-50 text-red-700" },
};

function StatusBadge({ status }) {
    const value = statuses[status];
    return <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${value.color}`}>{value.label}</span>;
}

export default function ValidationPage({ rows = [], filters = {}, counts = {}, types = [] }) {
    const { errors = {} } = usePage().props;
    const [selected, setSelected] = useState(null);
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [actionErrors, setActionErrors] = useState({});
    const [checkedIds, setCheckedIds] = useState([]);
    const [confirmBulk, setConfirmBulk] = useState(false);
    const [bulkResult, setBulkResult] = useState(null);
    const pageRows = Array.isArray(rows) ? rows : rows.data || [];
    const pendingRows = pageRows.filter((row) => row.status === "PENDING");
    const checkedRows = pendingRows.filter((row) => checkedIds.includes(row.id));
    const allChecked = pendingRows.length > 0 && checkedRows.length === pendingRows.length;
    const selectionScope = JSON.stringify([filters, pageRows.map((row) => [row.id, row.status])]);
    useEffect(() => {
        setCheckedIds([]);
        setConfirmBulk(false);
    }, [selectionScope]);
    const snapshot = selected?.snapshot || {};

    const filter = (values) => {
        setCheckedIds([]);
        setBulkResult(null);
        router.get("/admin/validasi-transaksi", { ...filters, ...values, page: 1 }, { preserveScroll: true, preserveState: true });
    };
    const approveChecked = () => {
        if (busy || !checkedRows.length) return;
        setBusy(true);
        setActionErrors({});
        setBulkResult(null);
        router.post("/admin/validasi-transaksi/setujui-terpilih", { ids: checkedRows.map((row) => row.id) }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const result = page.props.flash.bulkValidationResult;
                setBulkResult(result);
                const message = `Validasi selesai: ${result.approved.length} transaksi disetujui, ${result.failed.length} gagal.`;
                if (result.failed.length > 0) {
                    toast.error(`${message} Lihat rincian kegagalan di halaman.`, { duration: 8000 });
                } else {
                    toast.success(message, { duration: 6000 });
                }
                setCheckedIds([]);
                setConfirmBulk(false);
            },
            onError: (values) => {
                setActionErrors(values);
                toast.error(Object.values(values).join("\n"), { duration: 8000 });
            },
            onFinish: () => setBusy(false),
        });
    };
    const open = (row) => { setSelected(row); setRejecting(false); setReason(""); setActionErrors({}); };
    const close = () => { if (!busy) setSelected(null); };
    const process = (action) => {
        if (busy || !selected || selected.status !== "PENDING") return;
        setActionErrors({});
        const options = {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onSuccess: () => setSelected(null),
            onError: (values) => setActionErrors(values),
            onFinish: () => setBusy(false),
        };
        router.post(`/admin/validasi-transaksi/${selected.id}/${action}`, action === "tolak" ? { reason: reason.trim() } : {}, action === "setujui" ? withPdfProof(options, selected.type.startsWith("penjualan-") || selected.type === "bayar-piutang") : options);
    };

    return (
        <ProtectedLayout title="Validasi Transaksi">
            <div className="space-y-5">
                <PageHeader title="Validasi Transaksi" subtitle="Periksa pengajuan sebelum stok, kas, hutang/piutang, dan laporan diperbarui. Pengajuan ditolak tidak mengubah saldo." />
                <div className="grid gap-3 sm:grid-cols-3">
                    {Object.entries(statuses).map(([status, value]) => (
                        <button key={status} type="button" onClick={() => filter({ status })} aria-pressed={filters.status === status} className={`rounded-xl border bg-card p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${filters.status === status ? "border-primary ring-1 ring-primary" : "border-stroke hover:border-primary"}`}>
                            <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${value.color}`}>{value.label}</span>
                            <span className="mt-2 block text-2xl font-extrabold tabular-nums text-main">{number(counts[status] || 0)}</span>
                        </button>
                    ))}
                </div>
                <Card>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Jenis Transaksi"><Select value={filters.type || ""} onChange={(event) => filter({ type: event.target.value })}><option value="">Semua jenis transaksi</option>{types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</Select></Field>
                        <Field label="Status"><Select value={filters.status || "PENDING"} onChange={(event) => filter({ status: event.target.value })}><option value="ALL">Semua status</option>{Object.entries(statuses).map(([status, value]) => <option key={status} value={status}>{value.label}</option>)}</Select></Field>
                    </div>
                </Card>
                {errors.validation && !selected && <p role="alert" className="text-sm text-red-600">{errors.validation}</p>}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex min-h-11 items-center gap-2 text-sm text-main">
                        <input type="checkbox" checked={allChecked} disabled={busy || !pendingRows.length} onChange={(event) => setCheckedIds(event.target.checked ? pendingRows.map((row) => row.id) : [])} className="h-4 w-4 accent-primary" />
                        Pilih semua pengajuan Menunggu di halaman ini
                    </label>
                    <Button disabled={busy || !checkedRows.length} onClick={() => { setActionErrors({}); setConfirmBulk(true); }}>Setujui Terpilih ({checkedRows.length})</Button>
                </div>
                {bulkResult && <Card>
                    <div role="status" className="text-sm font-bold text-main">{bulkResult.approved.length} disetujui, {bulkResult.failed.length} gagal.</div>
                    {bulkResult.approved.length > 0 && <p className="mt-2 break-words text-sm text-main">Disetujui: {bulkResult.approved.map((row) => row.number).join(", ")}</p>}
                    {bulkResult.failed.length > 0 && <ul role="alert" className="mt-2 space-y-2 text-sm text-red-700">{bulkResult.failed.map((row) => <li key={row.id}><strong>{row.number}:</strong> {row.reason}</li>)}</ul>}
                </Card>}
                <SimpleTable rows={rows} columns={[
                    { key: "selection", label: "Pilih", render: (row) => row.status === "PENDING" ? <input type="checkbox" aria-label={`Pilih ${row.number}`} checked={checkedIds.includes(row.id)} disabled={busy} onChange={(event) => setCheckedIds((previous) => event.target.checked ? [...previous, row.id] : previous.filter((id) => id !== row.id))} className="h-4 w-4 accent-primary" /> : null },
                    { key: "number", label: "Pengajuan", render: (row) => <div><p className="font-bold">{row.number}</p><p className="mt-1 text-xs text-muted">{formatBusinessDate(row.operational_date)}</p></div> },
                    { key: "type", label: "Jenis", render: (row) => row.snapshot.label },
                    { key: "party", label: "Customer / Supplier", render: (row) => <div><p className="break-words">{row.snapshot.party}</p>{row.snapshot.warehouse && <p className="mt-1 text-xs text-muted">{row.snapshot.warehouse}</p>}</div> },
                    { key: "amount", label: "Nilai / Jumlah", render: (row) => <span className="font-bold tabular-nums">{row.snapshot.amount !== null ? money(row.snapshot.amount) : row.snapshot.items.map((item) => `${number(item.qty)} ${item.unit}`).join(", ")}</span> },
                    { key: "submitted_by_name", label: "Pengaju" },
                    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
                ]} renderActions={(row) => <Button size="sm" variant="outline" onClick={() => open(row)}>{row.status === "PENDING" ? "Periksa" : "Lihat Detail"}</Button>} />
            </div>
            {confirmBulk && <TransactionDialog title="Konfirmasi Persetujuan Terpilih" onClose={() => { if (!busy) setConfirmBulk(false); }} width="max-w-2xl">
                <div className="space-y-4">
                    <p className="text-sm text-main">Setujui {checkedRows.length} pengajuan? Stok dan saldo akan diperbarui. Pengajuan diproses dari yang paling awal; yang gagal tidak menghalangi lainnya.</p>
                    <ul className="max-h-60 overflow-y-auto space-y-1 text-sm text-main">{checkedRows.map((row) => <li key={row.id}>{row.number} — {row.snapshot.label}</li>)}</ul>
                    {Object.entries(actionErrors).map(([key, message]) => <p key={key} role="alert" className="text-sm text-red-600">{message}</p>)}
                    <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setConfirmBulk(false)}>Batal</Button><Button loading={busy} onClick={approveChecked}>Konfirmasi Persetujuan</Button></div>
                </div>
            </TransactionDialog>}
            {selected && (
                <TransactionDialog title={`Validasi ${selected.number}`} onClose={close} width="max-w-2xl">
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-extrabold text-main">{snapshot.label}</h3><p className="mt-1 text-sm text-muted">{formatBusinessDate(selected.operational_date)} · Diajukan oleh {selected.submitted_by_name}</p></div><StatusBadge status={selected.status} /></div>
                        <dl className="grid gap-4 border-y border-stroke py-4 text-sm sm:grid-cols-2">
                            <div><dt className="text-xs text-muted">Customer / Supplier / Pihak</dt><dd className="mt-1 break-words font-bold text-main">{snapshot.party}</dd></div>
                            {snapshot.warehouse && <div><dt className="text-xs text-muted">Gudang</dt><dd className="mt-1 font-bold text-main">{snapshot.warehouse}</dd></div>}
                            {snapshot.payment_method && <div><dt className="text-xs text-muted">Metode Bayar</dt><dd className="mt-1 font-bold text-main">{snapshot.payment_method === "SPLIT" ? "Cash + Transfer" : snapshot.payment_method}<PaymentBreakdown details={snapshot.payment_details} /></dd></div>}
                            {snapshot.direction && <div><dt className="text-xs text-muted">Arah Transaksi</dt><dd className="mt-1 font-bold text-main">{snapshot.direction}</dd></div>}
                            {snapshot.reference && <div><dt className="text-xs text-muted">Tagihan Asal</dt><dd className="mt-1 font-bold text-main">{snapshot.reference}</dd></div>}
                            {snapshot.due_date && <div><dt className="text-xs text-muted">Jatuh Tempo</dt><dd className="mt-1 font-bold text-main">{formatBusinessDate(snapshot.due_date)}</dd></div>}
                            {snapshot.payment_method === "DP" && <div><dt className="text-xs text-muted">Uang Muka</dt><dd className="mt-1 font-bold tabular-nums text-main">{money(snapshot.down_payment)}</dd></div>}
                        </dl>
                        {!!snapshot.items?.length && <ul className="divide-y divide-stroke">{snapshot.items.map((item, index) => {
                            const isLiquid = item.base_unit === "ML";
                            const isFilledBottle = isLiquid && item.unit === "BOTOL";
                            const bottleCapacity = isFilledBottle && Number(item.qty) > 0
                                ? Number(item.base_qty) / Number(item.qty)
                                : null;
                            return <li key={index} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                                <div className="min-w-0">
                                    <p className="font-mono text-xs text-muted">Kode / Barcode: {item.code || "-"}</p>
                                    <p className="break-words font-bold text-main">{item.name}</p>
                                    <p className="mt-1 text-xs text-muted">Jumlah: {number(item.qty)} {isFilledBottle ? "botol isi" : item.unit}</p>
                                    {bottleCapacity !== null && <p className="mt-1 text-xs text-muted">Isi per botol: {number(bottleCapacity)} ML</p>}
                                    {isLiquid && <p className="mt-1 text-xs text-muted">Total cairan: {number(item.base_qty)} ML</p>}
                                    {item.price != null && <p className="mt-1 text-xs text-muted">Harga per {item.price_unit}: {money(item.price)}</p>}
                                </div>
                                {item.subtotal != null && <div className="text-right"><p className="text-xs text-muted">Subtotal</p><span className="font-bold tabular-nums text-main">{money(item.subtotal)}</span></div>}
                            </li>;
                        })}</ul>}
                        {snapshot.amount !== null && <div className="space-y-2 rounded-lg bg-page p-4 text-sm">{snapshot.discount > 0 && <div className="flex justify-between gap-3 text-muted"><span>Diskon Transaksi</span><span className="tabular-nums">{money(snapshot.discount)}</span></div>}<div className="flex justify-between gap-3 font-extrabold text-main"><span>Nilai Transaksi</span><span className="tabular-nums">{money(snapshot.amount)}</span></div></div>}
                        {snapshot.notes && <div><p className="text-xs text-muted">Keterangan</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-main">{snapshot.notes}</p></div>}
                        {selected.reviewed_by_name && <p className="text-xs text-muted">Diproses oleh {selected.reviewed_by_name} · {formatBusinessDate(selected.reviewed_at)}{selected.result?.number ? ` · ${selected.result.number}` : ""}</p>}
                        {(selected.receipt_url || selected.pdf_url) && <a href={selected.receipt_url || selected.pdf_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-stroke px-4 py-2 text-sm font-bold text-main hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">{selected.type.startsWith("penjualan-") || selected.type === "bayar-piutang" ? "Cetak Slip" : "Bukti PDF"}</a>}
                        {selected.rejection_reason && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800"><p className="font-bold">Alasan Penolakan</p><p className="mt-1 whitespace-pre-wrap break-words">{selected.rejection_reason}</p></div>}
                        {Object.keys(actionErrors).length > 0 && <div role="alert" className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">{Object.entries(actionErrors).map(([key, message]) => <p key={key}>{message}</p>)}</div>}
                        {selected.status === "PENDING" && rejecting ? (
                            <form onSubmit={(event) => { event.preventDefault(); process("tolak"); }} className="space-y-4 border-t border-stroke pt-4">
                                <Field label="Alasan Penolakan"><Textarea required autoFocus maxLength={1000} value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="Jelaskan apa yang perlu diperbaiki…" /></Field>
                                <div className="flex flex-wrap justify-end gap-2"><Button size="sm" className="min-h-10 rounded-xl" variant="outline" disabled={busy} onClick={() => setRejecting(false)}>Kembali</Button><Button size="sm" className="min-h-10 rounded-xl" type="submit" variant="danger" loading={busy} disabled={!reason.trim()}>Konfirmasi Penolakan</Button></div>
                            </form>
                        ) : (
                            <div className="flex flex-wrap justify-end gap-2 border-t border-stroke pt-4"><Button size="sm" className="min-h-10 rounded-xl" variant="outline" disabled={busy} onClick={close}>Tutup</Button>{selected.status === "PENDING" && <><Button size="sm" className="min-h-10 rounded-xl" variant="danger" disabled={busy} onClick={() => setRejecting(true)}>Tolak</Button><Button size="sm" className="min-h-10 rounded-xl" loading={busy} onClick={() => process("setujui")}>Setujui &amp; Proses</Button></>}</div>
                        )}
                    </div>
                </TransactionDialog>
            )}
        </ProtectedLayout>
    );
}
