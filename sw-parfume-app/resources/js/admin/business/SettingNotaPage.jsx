import { Head, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import { IconDeviceFloppy, IconReceipt2 } from "@tabler/icons-react";
import { Card, Field, Input } from "./_components";
import {
    defaultPaymentReceiptTemplate,
    defaultReceiptTemplate,
    renderReceiptTemplate,
} from "./receiptSettings";

const NOTA_TYPES = [
    { key: "transaction", label: "Pembelian & Penjualan" },
    { key: "payment", label: "Pembayaran" },
];

const pc = (v, w = 32) => {
    const t = String(v || "");
    return " ".repeat(Math.max(0, Math.floor((w - t.length) / 2))) + t;
};

export default function SettingNotaPage() {
    const { settings } = usePage().props;
    const [activeTab, setActiveTab] = useState("transaction");

    const { data, setData, put, processing } = useForm({
        store_name: settings.store_name || "",
        store_address: settings.store_address || "",
        store_phone: settings.store_phone || "",
        receipt_footer: settings.receipt_footer || "",
        receipt_template: settings.receipt_template || defaultReceiptTemplate,
        payment_receipt_template:
            settings.payment_receipt_template || defaultPaymentReceiptTemplate,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put("/admin/setting-nota");
    };

    const store = {
        store_name: data.store_name || "PARIS PARFUM",
        store_name_center: pc(data.store_name || "PARIS PARFUM"),
        store_address: data.store_address || "",
        store_address_center: pc(data.store_address),
        store_phone: data.store_phone || "",
        store_phone_center: data.store_phone ? pc(`Telp: ${data.store_phone}`) : "",
        footer: data.receipt_footer || "Terima kasih",
        footer_center: pc(data.receipt_footer || "Terima kasih"),
    };

    const transactionPreview = renderReceiptTemplate(data.receipt_template, {
        ...store,
        title: "NOTA PEMBELIAN",
        title_center: pc("NOTA PEMBELIAN"),
        number: "PBL-0014",
        date: "20/06/2026",
        party_label: "Supplier",
        party_name: "MAJU JAYA",
        warehouse: "TOKO",
        items: "Fresh Citrus - Maison A\n1 ML x 1.200\n                        Rp 1.200",
        total_qty: "1",
        total_bottle_line: "",
        subtotal_line: "",
        discount_line: "",
        grand_total: "Rp 1.200",
        payment_method: "TEMPO",
        payment_line: "Bayar      : TEMPO",
        payment_status: "BELUM_LUNAS",
        due_date: "",
        due_date_line: "",
    });

    const paymentPreview = renderReceiptTemplate(data.payment_receipt_template, {
        ...store,
        title: "NOTA BAYAR HUTANG",
        title_center: pc("NOTA BAYAR HUTANG"),
        number: "HTG-0014",
        source_number: "PBL-0014",
        date: "20/06/2026",
        party_label: "Supplier",
        party_name: "MAJU JAYA",
        items: "Fresh Citrus - Maison A\n1 ML",
        total: "Rp 1.200",
        amount: "Rp 500",
        paid: "Rp 500",
        remaining: "Rp 700",
        status: "SEBAGIAN",
    });

    const isTransaction = activeTab === "transaction";
    const templateValue = isTransaction
        ? data.receipt_template
        : data.payment_receipt_template;
    const templateOnChange = isTransaction
        ? (v) => setData("receipt_template", v)
        : (v) => setData("payment_receipt_template", v);
    const previewText = isTransaction ? transactionPreview : paymentPreview;

    return (
        <>
            <Head title="Setting Nota Slip" />
            <div className="space-y-5">
                <h1 className="text-3xl font-light tracking-tight text-main">
                    Setting Nota Slip
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
                        {/* Panel Kiri — Info Toko */}
                        <div className="space-y-6">
                            <Card>
                                <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-muted">
                                    <IconReceipt2 size={16} />
                                    Info Toko
                                </h3>
                                <div className="space-y-4">
                                    <Field label="Nama Toko">
                                        <Input
                                            value={data.store_name}
                                            onChange={(e) => setData("store_name", e.target.value)}
                                            placeholder="PARIS PARFUM"
                                        />
                                    </Field>
                                    <Field label="Alamat">
                                        <textarea
                                            value={data.store_address}
                                            onChange={(e) => setData("store_address", e.target.value)}
                                            rows={2}
                                            placeholder="Jl. ..."
                                            className="w-full rounded-lg border border-stroke bg-card px-3.5 py-2.5 text-sm font-medium text-main outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
                                        />
                                    </Field>
                                    <Field label="Telepon">
                                        <Input
                                            value={data.store_phone}
                                            onChange={(e) => setData("store_phone", e.target.value)}
                                            placeholder="0812-..."
                                        />
                                    </Field>
                                    <Field label="Footer">
                                        <Input
                                            value={data.receipt_footer}
                                            onChange={(e) => setData("receipt_footer", e.target.value)}
                                            placeholder="Terima kasih"
                                        />
                                    </Field>
                                </div>
                            </Card>

                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                            >
                                <IconDeviceFloppy size={18} />
                                {processing ? "Menyimpan..." : "Simpan Pengaturan"}
                            </button>
                        </div>

                        {/* Panel Kanan — Template + Preview */}
                        <Card>
                            <div className="mb-5 flex items-center gap-3">
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted">
                                    Template
                                </h3>
                                <div className="flex rounded-lg border border-stroke bg-page p-0.5">
                                    {NOTA_TYPES.map((t) => (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => setActiveTab(t.key)}
                                            className={`rounded-md px-4 py-2 text-xs font-bold transition ${
                                                activeTab === t.key
                                                    ? "bg-primary text-white shadow-sm"
                                                    : "text-muted hover:text-main"
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-2">
                                <div>
                                    <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                                        Editor
                                    </div>
                                    <textarea
                                        spellCheck={false}
                                        value={templateValue}
                                        onChange={(e) => templateOnChange(e.target.value)}
                                        rows={28}
                                        className="w-full rounded-xl border border-stroke bg-page px-4 py-3 font-mono text-[11px] leading-5 text-main outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                                    />
                                </div>
                                <div>
                                    <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                                        Preview Nota
                                    </div>
                                    <div className="overflow-hidden rounded-lg border border-stroke bg-white shadow-sm">
                                        <pre className="min-h-[480px] overflow-auto whitespace-pre-wrap px-4 py-5 font-mono text-[11px] leading-[1.5] text-gray-800">
                                            {previewText}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </form>
            </div>
        </>
    );
}
