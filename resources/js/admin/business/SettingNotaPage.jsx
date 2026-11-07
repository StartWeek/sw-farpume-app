import { useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import { IconDeviceFloppy, IconReceipt2 } from "@tabler/icons-react";
import { Card, Field, Input, PageHeader, Select, Textarea } from "./_components";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import PdfReceiptLayoutEditor from "./PdfReceiptLayoutEditor";

const NOTA_TYPES = [
    { key: "sale", label: "Penjualan Customer", description: "Slip 80 mm tampil setelah transaksi disimpan. Cetak melalui Bluetooth atau browser dari modal slip." },
    { key: "purchase", label: "Pembelian Supplier", description: "Nota pembelian supplier menggunakan PDF A4." },
    { key: "customer-payment", label: "Pembayaran Customer", description: "Bukti pembayaran piutang customer menggunakan slip 80 mm." },
    { key: "supplier-payment", label: "Hutang Supplier", description: "Bukti pembayaran hutang supplier menggunakan PDF A4." },
    { key: "supplier-receivable", label: "Piutang Supplier", description: "Bukti pembayaran piutang supplier menggunakan PDF A4." },
];

export default function SettingNotaPage() {
    const { settings = {}, previews = {} } = usePage().props;
    const [activeTab, setActiveTab] = useState("sale");
    const { data, setData, put, processing, errors, defaults } = useForm({
        store_name: settings.store_name || "",
        store_address: settings.store_address || "",
        store_phone: settings.store_phone || "",
        receipt_footer: settings.receipt_footer || "",
        receipt_pdf_layout: settings.receipt_pdf_layout || {},
    });
    const handleSubmit = (event) => {
        event.preventDefault();
        put("/admin/setting-nota", {
            preserveScroll: true,
            onSuccess: (page) => {
                const saved = page.props.settings;
                const values = Object.fromEntries(Object.keys(data).map((key) => [key, saved[key] || (key === "receipt_pdf_layout" ? {} : "")]));
                setData(values);
                defaults(values);
            },
        });
    };
    const activeType = NOTA_TYPES.find((type) => type.key === activeTab);
    const isPdf = ["purchase", "supplier-payment", "supplier-receivable"].includes(activeTab);
    const layoutKind = activeTab === "purchase" ? "purchase" : "payment";

    return (
        <ProtectedLayout title="Pengaturan Nota">
            <div className="space-y-5">
                <PageHeader title="Pengaturan Nota" subtitle="Identitas toko dan pesan penutup untuk slip customer serta nota PDF supplier." />
                <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Card>
                            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-main"><IconReceipt2 size={18} /> Informasi pada Nota</h2>
                            <div className="space-y-4">
                                <Field label="Nama Toko"><Input required maxLength={100} value={data.store_name} onChange={(event) => setData("store_name", event.target.value)} /></Field>
                                <Field label="Alamat"><Textarea rows={3} maxLength={500} value={data.store_address} onChange={(event) => setData("store_address", event.target.value)} /></Field>
                                <Field label="Telepon"><Input maxLength={30} value={data.store_phone} onChange={(event) => setData("store_phone", event.target.value)} /></Field>
                                <Field label="Pesan Penutup"><Textarea rows={3} maxLength={200} value={data.receipt_footer} onChange={(event) => setData("receipt_footer", event.target.value)} placeholder="TERIMA KASIH ATAS KUNJUNGAN ANDA" /></Field>
                                {Object.entries(errors).map(([key, message]) => <p key={key} role="alert" className="text-sm text-red-600">{message}</p>)}
                            </div>
                        </Card>
                        <button type="submit" disabled={processing} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
                            <IconDeviceFloppy size={18} />{processing ? "Menyimpan..." : "Simpan Pengaturan"}
                        </button>
                    </form>
                    <Card>
                        <h2 className="mb-3 text-sm font-bold text-main">Pratinjau dan Posisi Nota</h2>
                        <div className="mb-3">
                            <Field label="Jenis Nota">
                                <Select aria-label="Jenis Nota" value={activeTab} onChange={(event) => setActiveTab(event.target.value)}>
                                    {NOTA_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
                                </Select>
                            </Field>
                        </div>
                        {isPdf ? <PdfReceiptLayoutEditor key={activeTab} html={previews[activeTab] || ""} title={`Atur posisi ${activeType.label}`} layout={data.receipt_pdf_layout[layoutKind] || {}} onChange={(layout) => setData("receipt_pdf_layout", { ...data.receipt_pdf_layout, [layoutKind]: layout })} /> : <iframe key={activeTab} title={`Pratinjau ${activeType.label}`} srcDoc={previews[activeTab] || ""} sandbox="" className="h-[620px] w-full rounded-lg border border-stroke bg-white" />}
                    </Card>
                </div>
            </div>
        </ProtectedLayout>
    );
}
