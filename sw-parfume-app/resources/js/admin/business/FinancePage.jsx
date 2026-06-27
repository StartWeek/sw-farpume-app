import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useEffect, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Button from "@/components/common/Button";
import { IconPrinter, IconX } from "@tabler/icons-react";
import { Card, CurrencyInput, Field, Input, PageHeader, Select, SimpleTable, Textarea, money, number, todayDate, useFlashMessages } from "./_components";
import { renderReceiptTemplate, withReceiptSettings } from "./receiptSettings";

export default function FinancePage({ type, rows = [], refs = {} }) {
    useFlashMessages();
    const { flash = {}, appSettings = {} } = usePage().props;
    const isDebt = type === "hutang";
    const isSupplierReceivable = type === "piutang-supplier";
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
    const [receipt, setReceipt] = useState(flash.receipt || null);
    const printableReceipt = receipt
        ? withReceiptSettings(receipt, appSettings)
        : null;
    const [bluetoothLoading, setBluetoothLoading] = useState(false);
    const title = isDebt ? "Hutang Supplier" : isSupplierReceivable ? "Piutang Supplier" : "Piutang Customer";
    const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

    useEffect(() => {
        if (flash.receipt) {
            setReceipt(flash.receipt);
        }
    }, [flash.receipt]);

    const pay = (event) => {
        event.preventDefault();
        router.post(`/admin/${type}/${active.id}/bayar`, { jumlah_bayar: amount }, { preserveScroll: true, onSuccess: () => { setActive(null); setAmount(""); } });
    };

    const resetForm = () => setForm({ tanggal: todayDate(), id_supplier: "", total_hutang: "", total_piutang: "", jatuh_tempo: todayDate(), keterangan: "" });

    const storeSupplierFinance = (event) => {
        event.preventDefault();
        router.post(isDebt ? "/admin/hutang" : "/admin/piutang-supplier", form, {
            preserveScroll: true,
            onSuccess: resetForm,
        });
    };

    return (
        <ProtectedLayout title={title}>
            <div className="space-y-5">
                <PageHeader title={title} subtitle="Catat pembayaran dan pantau sisa tagihan tempo." />
                {isSupplierReceivable ? (
                    <Card>
                        <form onSubmit={storeSupplierFinance} className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-4">
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
                            <div className="flex justify-end">
                                <Button type="submit">{isDebt ? "Simpan Hutang Supplier" : "Simpan Piutang Supplier"}</Button>
                            </div>
                        </form>
                    </Card>
                ) : null}
                {active ? (
                    <Card>
                        <form onSubmit={pay} className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
                            <div className="text-[13px] font-medium text-muted">
                                Pembayaran untuk <b className="font-bold text-main">{isDebt || isSupplierReceivable ? active.supplier?.nama_supplier : active.customer?.nama_customer}</b>
                                <div className="mt-0.5">Sisa: <b className="font-bold text-main">{money(isDebt ? active.sisa_hutang : active.sisa_piutang)}</b></div>
                            </div>
                            <Field label="Jumlah Bayar"><CurrencyInput value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setActive(null)}>Batal</Button>
                                <Button type="submit">Bayar</Button>
                            </div>
                        </form>
                    </Card>
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
                            <Button size="sm" variant="outline" onClick={() => setActive(row)}>Bayar</Button>
                            <Button icon={IconPrinter} size="sm" variant="outline" onClick={() => setReceipt(buildPaymentReceiptFromRow(row, isDebt, isSupplierReceivable))}>Nota</Button>
                        </>
                    )}
                />

                {printableReceipt ? (
                    <ReceiptModal
                        receipt={printableReceipt}
                        bluetoothLoading={bluetoothLoading}
                        onClose={() => setReceipt(null)}
                        onBluetooth={async () => {
                            setBluetoothLoading(true);
                            try {
                                await printBluetoothReceipt(printableReceipt);
                            } finally {
                                setBluetoothLoading(false);
                            }
                        }}
                    />
                ) : null}
            </div>
        </ProtectedLayout>
    );
}

function buildPaymentReceiptFromRow(row, isDebt, isSupplierReceivable = false) {
    return {
        type: isDebt ? "hutang" : isSupplierReceivable ? "piutang-supplier" : "piutang",
        title: isDebt ? "NOTA BAYAR HUTANG" : isSupplierReceivable ? "NOTA PIUTANG SUPPLIER" : "NOTA BAYAR PIUTANG",
        number: isDebt ? row.no_hutang : isSupplierReceivable ? row.no_piutang_supplier : row.no_piutang,
        source_number: isDebt ? row.pembelian?.no_pembelian : isSupplierReceivable ? "-" : row.penjualan?.no_penjualan,
        date: formatDate(row.updated_at || row.tanggal),
        party_label: isDebt || isSupplierReceivable ? "Supplier" : "Customer",
        party_name: isDebt || isSupplierReceivable ? row.supplier?.nama_supplier || "-" : row.customer?.nama_customer || "-",
        items: receiptItemsFromSource(row, isDebt, isSupplierReceivable),
        amount: Number(row.total_bayar || 0),
        total: Number(isDebt ? row.total_hutang || 0 : row.total_piutang || 0),
        paid: Number(row.total_bayar || 0),
        remaining: Number(isDebt ? row.sisa_hutang || 0 : row.sisa_piutang || 0),
        status: isDebt ? row.status_hutang : row.status_piutang,
    };
}

function receiptItemsFromSource(row, isDebt, isSupplierReceivable) {
    if (isSupplierReceivable) return row.items || [];

    const source = isDebt ? row.pembelian : row.penjualan;
    return (source?.details || row.items || []).map((detail) => ({
        name: detail.nama_item || detail.barang?.nama_barang || detail.botol?.nama_botol || "-",
        qty: Number(detail.qty_input || detail.konversi_qty_dasar || detail.qty_ml || 0),
        unit: detail.satuan_input || detail.satuan_dasar || "ML",
    }));
}

function ReceiptModal({ receipt, onClose, onBluetooth, bluetoothLoading }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-card shadow-premium">
                <div className="flex items-center justify-between border-b border-stroke px-5 py-4">
                    <div>
                        <div className="text-lg font-extrabold tracking-tight text-main">{receipt.title}</div>
                        <div className="mt-0.5 text-xs font-medium text-muted">{receipt.number}</div>
                    </div>
                    <Button icon={IconX} iconOnly variant="ghost" onClick={onClose} />
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-[280px_1fr]">
                    <pre className="max-h-[65vh] overflow-auto rounded-lg border border-stroke bg-page p-4 font-mono text-xs leading-relaxed text-main">
                        {receiptText(receipt)}
                    </pre>
                    <div className="space-y-4">
                        <div className="rounded-lg border border-stroke bg-page p-4 text-sm text-muted">
                            <div className="font-bold text-main">{receipt.party_label}: {receipt.party_name}</div>
                            <div className="mt-0.5 font-medium">Referensi: {receipt.source_number || "-"}</div>
                            <div className="mt-0.5 font-medium">Status: {receipt.status || "-"}</div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button icon={IconPrinter} loading={bluetoothLoading} onClick={onBluetooth}>Print</Button>
                            <Button variant="ghost" onClick={onClose}>Tutup</Button>
                        </div>

                        <div className="text-xs leading-5 text-muted">
                            Print memakai koneksi Bluetooth ke printer BLE.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function receiptText(receipt) {
    const line = "-".repeat(32);
    const itemLines = receiptItemLines(receipt.items);
    const templateValues = {
        store_name: receipt.store_name || "PARIS PARFUM",
        store_name_center: center(receipt.store_name || "PARIS PARFUM"),
        store_address: receipt.store_address || "",
        store_address_center: receipt.store_address ? center(receipt.store_address) : "",
        store_phone: receipt.store_phone || "",
        store_phone_center: receipt.store_phone ? center(`Telp: ${receipt.store_phone}`) : "",
        title: receipt.title,
        title_center: center(receipt.title),
        number: receipt.number,
        source_number: receipt.source_number || "-",
        date: receipt.date || "-",
        party_label: receipt.party_label,
        party_name: receipt.party_name,
        items: itemLines.join("\n"),
        total: money(receipt.total),
        amount: money(receipt.amount),
        paid: money(receipt.paid),
        remaining: money(receipt.remaining),
        status: receipt.status || "-",
        footer: receipt.receipt_footer || "Terima kasih",
        footer_center: center(receipt.receipt_footer || "Terima kasih"),
    };

    if (receipt.payment_receipt_template) {
        return renderReceiptTemplate(
            receipt.payment_receipt_template,
            templateValues,
        );
    }

    const dline = "=".repeat(32);
    const rows = [
        dline,
        center(receipt.store_name || "PARIS PARFUM"),
        receipt.store_address ? center(receipt.store_address) : null,
        receipt.store_phone ? center(`Telp: ${receipt.store_phone}`) : null,
        dline,
        center(receipt.title),
        line,
        `No       : ${receipt.number}`,
        `Ref      : ${receipt.source_number || "-"}`,
        `Tgl      : ${receipt.date || "-"}`,
        `${receipt.party_label} : ${receipt.party_name}`,
        line,
        ...itemLines,
        line,
        `Tagihan  : ${money(receipt.total)}`,
        `Bayar    : ${money(receipt.amount)}`,
        `Terbayar : ${money(receipt.paid)}`,
        `Sisa     : ${money(receipt.remaining)}`,
        `Status   : ${receipt.status || "-"}`,
        dline,
        center(receipt.receipt_footer || "Terima kasih"),
        dline,
        "",
    ].filter(Boolean);

    return rows.join("\n");
}

function receiptItemLines(items = []) {
    if (!Array.isArray(items) || items.length === 0) return [];

    return [
        "Barang:",
        ...items.flatMap((item) => [
            truncate(item.name, 32),
            `${number(item.qty)} ${item.unit}`,
        ]),
        "-".repeat(32),
    ];
}

function printReceipt(receipt) {
    const popup = window.open("", "_blank", "width=360,height=640");
    if (!popup) return;

    popup.document.write(`
        <html>
            <head>
                <title>${receipt.number}</title>
                <style>
                    body { margin: 0; padding: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; line-height: 1.4; color: #1a1a1a; }
                    pre { white-space: pre-wrap; margin: 0; }
                    @page { size: 80mm auto; margin: 3mm; }
                </style>
            </head>
            <body><pre>${escapeHtml(receiptText(receipt))}</pre></body>
        </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
}

async function printBluetoothReceipt(receipt) {
    if (!navigator.bluetooth) {
        alert("Browser belum mendukung Web Bluetooth.");
        return;
    }

    const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
            "000018f0-0000-1000-8000-00805f9b34fb",
            "0000ffe0-0000-1000-8000-00805f9b34fb",
            "0000ff00-0000-1000-8000-00805f9b34fb",
        ],
    });
    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    for (const service of services) {
        const characteristics = await service.getCharacteristics();
        const writable = characteristics.find(
            (characteristic) =>
                characteristic.properties.write ||
                characteristic.properties.writeWithoutResponse,
        );

        if (writable) {
            const payload = new TextEncoder().encode(`\x1b@\n${receiptText(receipt)}\n\n\n\x1dV\x00`);
            for (let offset = 0; offset < payload.length; offset += 180) {
                const chunk = payload.slice(offset, offset + 180);
                if (writable.properties.writeWithoutResponse) {
                    await writable.writeValueWithoutResponse(chunk);
                } else {
                    await writable.writeValue(chunk);
                }
            }
            server.disconnect();
            return;
        }
    }

    server.disconnect();
    alert("Printer Bluetooth tidak memiliki characteristic yang bisa ditulis.");
}

function center(text, width = 32) {
    const value = String(text);
    const left = Math.max(0, Math.floor((width - value.length) / 2));
    return `${" ".repeat(left)}${value}`;
}

function truncate(text, width) {
    const value = String(text || "");
    return value.length > width ? value.slice(0, width - 1) : value;
}

function formatDate(value) {
    if (!value) return "-";
    return String(value).slice(0, 10).split("-").reverse().join("/");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
