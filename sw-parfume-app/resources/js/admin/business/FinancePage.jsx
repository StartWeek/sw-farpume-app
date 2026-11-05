import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useState } from "react";
import { router } from "@inertiajs/react";
import Button from "@/components/common/Button";
import { IconFileTypePdf } from "@tabler/icons-react";
import { CurrencyInput, Field, Input, PageHeader, Select, SimpleTable, Textarea, money, todayDate, useFlashMessages } from "./_components";
import { TransactionDialog } from "./TransactionDialogs";
import useTransactionSubmissionOptions from "./useTransactionSubmissionOptions";
import { PaymentAmountEntry, PaymentHistory, PaymentSummary } from "./PaymentDetails";

export default function FinancePage({ type, rows = [], refs = {} }) {
    useFlashMessages();
    const [errors, setErrors] = useState({});
    const submissionOptions = useTransactionSubmissionOptions();
    const isDebt = type === "hutang";
    const isSupplierReceivable = type === "piutang-supplier";
    const [busy, setBusy] = useState(false);
    const [financeOpen, setFinanceOpen] = useState(false);
    const [active, setActive] = useState(null);
    const [amount, setAmount] = useState("");
    const [form, setForm] = useState({
        tanggal: todayDate(),
        id_supplier: "",
        total_hutang: "",
        total_piutang: "",
        jatuh_tempo: todayDate(),
        keterangan: "",
    });
    const title = isDebt ? "Hutang Supplier" : isSupplierReceivable ? "Piutang Supplier" : "Piutang Customer";
    const activeRemaining = Number(active ? isDebt ? active.sisa_hutang : active.sisa_piutang : 0);
    const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

    const pay = (event) => {
        event.preventDefault();
        if (busy) return;
        if (Number(amount) <= 0 || !Number.isFinite(Number(amount))) { setErrors({ jumlah_bayar: "Jumlah pembayaran harus lebih dari nol." }); return; }
        if (Number(amount) > activeRemaining) { setErrors({ jumlah_bayar: "Pembayaran melebihi sisa tagihan." }); return; }
        const url = `/admin/${type}/${active.id}/bayar`;
        router.post(url, { jumlah_bayar: amount }, submissionOptions(url, { preserveScroll: true, onError: setErrors, onStart: () => setBusy(true), onFinish: () => setBusy(false), onSuccess: () => { setActive(null); setAmount(""); } }));
    };

    const resetForm = () => setForm({ tanggal: todayDate(), id_supplier: "", total_hutang: "", total_piutang: "", jatuh_tempo: todayDate(), keterangan: "" });

    const storeSupplierFinance = (event) => {
        event.preventDefault();
        if (busy) return;
        const url = isDebt ? "/admin/hutang" : "/admin/piutang-supplier";
        router.post(url, form, submissionOptions(url, {
            preserveScroll: true,
            onError: setErrors,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
            onSuccess: () => { resetForm(); setFinanceOpen(false); },
        }));
    };

    return (
        <ProtectedLayout title={title}>
            <div className="space-y-5">
                <PageHeader title={title} subtitle="Catat pembayaran dan pantau sisa tagihan tempo." />
                {isSupplierReceivable && <div className="flex justify-end"><Button onClick={() => { setErrors({}); setFinanceOpen(true); }}>Tambah Piutang Supplier</Button></div>}
                {isSupplierReceivable && financeOpen ? (
                    <TransactionDialog title="Piutang Supplier Baru" description="Ajukan piutang supplier untuk diperiksa sebelum masuk laporan." onClose={() => { if (!busy) setFinanceOpen(false); }}>
                        <form onSubmit={storeSupplierFinance} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Tanggal">
                                    <Input type="date" value={form.tanggal} onChange={(event) => set("tanggal", event.target.value)} />
                                </Field>
                                <Field label="Supplier">
                                    <Select value={form.id_supplier} onChange={(event) => set("id_supplier", event.target.value)}>
                                        <option value="">Pilih supplier</option>
                                        {(refs.supplier || []).map((row) => <option key={row.id} value={row.id}>{row.nama_supplier}</option>)}
                                    </Select>
                                </Field>
                                <Field label={isDebt ? "Total Hutang" : "Total Piutang"}>
                                    <CurrencyInput
                                        value={isDebt ? form.total_hutang : form.total_piutang}
                                        onChange={(event) => set(isDebt ? "total_hutang" : "total_piutang", event.target.value)}
                                    />
                                </Field>
                                <Field label="Jatuh Tempo">
                                    <Input type="date" value={form.jatuh_tempo} onChange={(event) => set("jatuh_tempo", event.target.value)} />
                                </Field>
                            </div>
                            <Field label="Keterangan">
                                <Textarea value={form.keterangan} onChange={(event) => set("keterangan", event.target.value)} />
                            </Field>
                            {Object.entries(errors).filter(([key]) => ["tanggal", "id_supplier", "total_hutang", "total_piutang", "jatuh_tempo", "keterangan", "submission_key"].includes(key)).map(([key, error]) => <p key={key} role="alert" className="text-xs text-red-600">{error}</p>)}
                            <div className="flex justify-end">
                                <Button type="submit" loading={busy}>Ajukan Validasi</Button>
                            </div>
                        </form>
                    </TransactionDialog>
                ) : null}
                {active ? (
                    <TransactionDialog title="Pembayaran Tagihan" onClose={() => { if (!busy) setActive(null); }} width="max-w-lg">
                        <form onSubmit={pay} className="space-y-5">
                            <div className="text-[13px] font-medium text-muted">
                                Pembayaran untuk <b className="font-bold text-main">{isDebt || isSupplierReceivable ? active.supplier?.nama_supplier : active.customer?.nama_customer}</b>
                                <div className="mt-0.5">{active.no_hutang || active.no_piutang_supplier || active.no_piutang}</div>
                            </div>
                            <PaymentAmountEntry key={active.id} amount={amount} onChange={setAmount} remaining={activeRemaining} error={errors.jumlah_bayar} disabled={busy} />
                            <PaymentSummary total={isDebt ? active.total_hutang : active.total_piutang} paid={active.total_bayar} remaining={activeRemaining} amount={amount} />
                            <PaymentHistory history={active.payment_history} />
                            {Object.entries(errors).filter(([key]) => key !== "jumlah_bayar").map(([key, error]) => <p key={key} role="alert" className="text-xs text-red-600">{error}</p>)}
                            <div className="flex gap-2">
                                <Button variant="outline" disabled={busy} onClick={() => setActive(null)}>Batal</Button>
                                <Button type="submit" loading={busy} disabled={Number(amount || 0) <= 0 || Number(amount) > activeRemaining}>Ajukan Pembayaran</Button>
                            </div>
                        </form>
                    </TransactionDialog>
                ) : null}
                <SimpleTable
                    rows={rows}
                    columns={isDebt ? [
                        { key: "no_hutang", label: "No Hutang" },
                        { key: "supplier", label: "Supplier", render: (row) => row.supplier?.nama_supplier || "-" },
                        { key: "total_hutang", label: "Total", render: (row) => money(row.total_hutang) },
                        { key: "total_bayar", label: "Terbayar", render: (row) => money(row.total_bayar) },
                        { key: "sisa_hutang", label: "Sisa", render: (row) => money(row.sisa_hutang) },
                        { key: "status_hutang", label: "Status" },
                    ] : isSupplierReceivable ? [
                        { key: "no_piutang_supplier", label: "No Piutang" },
                        { key: "supplier", label: "Supplier", render: (row) => row.supplier?.nama_supplier || "-" },
                        { key: "total_piutang", label: "Total", render: (row) => money(row.total_piutang) },
                        { key: "total_bayar", label: "Terbayar", render: (row) => money(row.total_bayar) },
                        { key: "sisa_piutang", label: "Sisa", render: (row) => money(row.sisa_piutang) },
                        { key: "status_piutang", label: "Status" },
                    ] : [
                        { key: "no_piutang", label: "No Piutang" },
                        { key: "customer", label: "Customer", render: (row) => row.customer?.nama_customer || "-" },
                        { key: "total_piutang", label: "Total", render: (row) => money(row.total_piutang) },
                        { key: "total_bayar", label: "Terbayar", render: (row) => money(row.total_bayar) },
                        { key: "sisa_piutang", label: "Sisa", render: (row) => money(row.sisa_piutang) },
                        { key: "status_piutang", label: "Status" },
                    ]}
                    renderActions={(row) => (
                        <>
                            <Button size="sm" variant="outline" disabled={!!row.payment_history?.pending?.length || Number(isDebt ? row.sisa_hutang : row.sisa_piutang) <= 0} onClick={() => { setErrors({}); setAmount(""); setActive(row); }}>{row.payment_history?.pending?.length ? "Menunggu Validasi" : "Bayar"}</Button>
                            <a href={`/admin/keuangan-nota/${type}/${row.id}/${!isDebt && !isSupplierReceivable ? "slip" : "pdf"}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-stroke px-3 py-2 text-sm font-bold text-main"><IconFileTypePdf size={16} />{!isDebt && !isSupplierReceivable ? "Cetak Slip" : "Bukti PDF"}</a>
                        </>
                    )}
                />
            </div>
        </ProtectedLayout>
    );
}
