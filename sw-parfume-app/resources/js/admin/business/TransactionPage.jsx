import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Button from "@/components/common/Button";
import { IconBluetooth, IconPlus, IconPrinter, IconTrash, IconX } from "@tabler/icons-react";
import { Card, CurrencyInput, Field, Input, PageHeader, Select, SimpleTable, formatInputNumber, money, number, todayDate, useFlashMessages } from "./_components";

const liquidUnits = ["ML", "LITER"];
const bottleUnits = ["BOTOL", "DUS"];
const payments = ["CASH", "TRANSFER", "TEMPO", "DP"];

export default function TransactionPage({ type, rows = [], refs = {} }) {
    useFlashMessages();
    const { flash = {} } = usePage().props;
    const isBuy = type === "pembelian";
    const isWholesale = type === "sales" || type === "grosir";
    const title = isBuy ? "Pembelian Supplier" : isWholesale ? "Penjualan Sales" : "Penjualan Retail";
    const emptyItem = { tipe_item: "BIBIT", item_id: "", qty_input: 1, satuan_input: "ML", harga: "" };
    const initial = {
        id_supplier: "",
        id_customer: "",
        id_sales: "",
        id_gudang: "",
        metode_pembayaran: "CASH",
        jumlah_bayar: "",
        jatuh_tempo: todayDate(),
        tipe_penjualan: isWholesale ? "SALES" : "RETAIL",
        keterangan: "",
        items: [emptyItem],
    };
    const [form, setForm] = useState(initial);
    const [receipt, setReceipt] = useState(flash.receipt || null);
    const [tempoPayment, setTempoPayment] = useState(null);
    const [tempoAmount, setTempoAmount] = useState("");
    const [bluetoothLoading, setBluetoothLoading] = useState(false);

    useEffect(() => {
        if (flash.receipt) {
            setReceipt(flash.receipt);
        }
    }, [flash.receipt]);

    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const updateItem = (index, key, value) => setForm((prev) => ({ ...prev, items: prev.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
    const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem] }));
    const removeItem = (index) => setForm((prev) => ({ ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) }));
    const customers = useMemo(() => (refs.customer || []).filter((row) => isWholesale ? ["GROSIR", "SALES", "TOKO"].includes(row.tipe_customer) : row.tipe_customer === "RETAIL"), [refs.customer, isWholesale]);

    const submit = (event) => {
        event.preventDefault();
        router.post(isBuy ? "/admin/pembelian" : "/admin/penjualan", {
            ...form,
            jatuh_tempo: ["TEMPO", "DP"].includes(form.metode_pembayaran) ? form.jatuh_tempo : null,
            id_sales: form.id_sales || null,
        }, { preserveScroll: true, onSuccess: () => setForm(initial) });
    };

    const openTempoPayment = (row) => {
        const record = getTempoRecord(row, isBuy);
        if (!record) return;

        setTempoPayment({
            url: isBuy ? `/admin/hutang/${record.id}/bayar` : `/admin/piutang/${record.id}/bayar`,
            number: isBuy ? row.no_pembelian : row.no_penjualan,
            party: isBuy ? row.supplier?.nama_supplier : row.customer?.nama_customer,
            remaining: Number(isBuy ? record.sisa_hutang || 0 : record.sisa_piutang || 0),
        });
        setTempoAmount("");
    };

    const submitTempoPayment = (event) => {
        event.preventDefault();
        if (!tempoPayment) return;

        router.post(tempoPayment.url, { jumlah_bayar: tempoAmount }, {
            preserveScroll: true,
            onSuccess: () => {
                setTempoPayment(null);
                setTempoAmount("");
            },
        });
    };

    return (
        <ProtectedLayout title={title}>
            <div className="space-y-5">
                <PageHeader title={title} subtitle="Transaksi otomatis membuat mutasi stok dan hutang/piutang bila pembayaran tempo." />
                <Card>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-4">
                            {isBuy ? (
                                <Field label="Supplier"><Select value={form.id_supplier} onChange={(event) => set("id_supplier", event.target.value)}><option value="">Pilih supplier</option>{(refs.supplier || []).map((row) => <option key={row.id} value={row.id}>{row.nama_supplier}</option>)}</Select></Field>
                            ) : (
                                <Field label="Customer"><Select value={form.id_customer} onChange={(event) => set("id_customer", event.target.value)}><option value="">Pilih customer</option>{customers.map((row) => <option key={row.id} value={row.id}>{row.nama_customer} ({row.tipe_customer})</option>)}</Select></Field>
                            )}
                            {!isBuy ? <Field label="Sales"><Select value={form.id_sales || ""} onChange={(event) => set("id_sales", event.target.value)}><option value="">Tanpa sales</option>{(refs.sales || []).map((row) => <option key={row.id} value={row.id}>{row.nama_sales}</option>)}</Select></Field> : null}
                            <Field label="Gudang"><Select value={form.id_gudang} onChange={(event) => set("id_gudang", event.target.value)}><option value="">Pilih gudang</option>{(refs.gudang || []).map((row) => <option key={row.id} value={row.id}>{row.nama_gudang}</option>)}</Select></Field>
                            <Field label="Metode Bayar"><Select value={form.metode_pembayaran} onChange={(event) => set("metode_pembayaran", event.target.value)}>{payments.map((payment) => <option key={payment}>{payment}</option>)}</Select></Field>
                            {form.metode_pembayaran === "DP" ? <Field label="Jumlah DP"><CurrencyInput value={form.jumlah_bayar || ""} onChange={(event) => set("jumlah_bayar", event.target.value)} /></Field> : null}
                            {["TEMPO", "DP"].includes(form.metode_pembayaran) ? <Field label="Jatuh Tempo"><Input type="date" value={form.jatuh_tempo || ""} onChange={(event) => set("jatuh_tempo", event.target.value)} /></Field> : null}
                        </div>

                        <div className="space-y-3">
                            {form.items.map((item, index) => {
                                const selected = findSelectedItem(refs, item);
                                const unitOptions = item.tipe_item === "BOTOL" ? bottleUnits : liquidUnits;
                                const defaultPrice = defaultItemPrice(selected, item, isBuy, isWholesale);
                                const price = Number(item.harga || defaultPrice || 0);
                                const convertedQty = convertQty(item, selected);
                                const subtotal = item.tipe_item === "BOTOL" && item.satuan_input === "DUS"
                                    ? Number(item.qty_input || 0) * price
                                    : convertedQty * price;
                                return (
                                    <div key={index} className="grid gap-3 rounded-lg border border-stroke bg-page p-3 md:grid-cols-7">
                                        <Field label="Tipe Item">
                                            <Select value={item.tipe_item} onChange={(event) => {
                                                const nextType = event.target.value;
                                                updateItem(index, "tipe_item", nextType);
                                                updateItem(index, "item_id", "");
                                                updateItem(index, "satuan_input", nextType === "BOTOL" ? "BOTOL" : "ML");
                                            }}>
                                                <option value="BIBIT">Bibit</option>
                                                <option value="ABSOLUTE">Absolute</option>
                                                <option value="BOTOL">Botol</option>
                                            </Select>
                                        </Field>
                                        <Field label="Item">
                                            <Select value={item.item_id} onChange={(event) => updateItem(index, "item_id", event.target.value)}>
                                                <option value="">Pilih item</option>
                                                {itemOptions(refs, item.tipe_item).map((row) => <option key={row.id} value={row.id}>{item.tipe_item === "BOTOL" ? row.nama_botol : row.nama_barang}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="Qty"><Input type="number" value={item.qty_input} onChange={(event) => updateItem(index, "qty_input", event.target.value)} /></Field>
                                        <Field label="Satuan"><Select value={item.satuan_input} onChange={(event) => updateItem(index, "satuan_input", event.target.value)}>{unitOptions.map((unit) => <option key={unit}>{unit}</option>)}</Select></Field>
                                        <Field label={isBuy ? "Harga Beli" : "Harga Jual"}><CurrencyInput value={item.harga || ""} placeholder={formatInputNumber(defaultPrice || "")} onChange={(event) => updateItem(index, "harga", event.target.value)} /></Field>
                                        <div className="rounded-lg bg-card px-3 py-2 text-sm text-muted">
                                            <div>Dasar: <b className="text-main">{number(convertedQty)} {item.tipe_item === "BOTOL" ? "botol" : "ML"}</b></div>
                                            <div>Subtotal: <b className="text-main">{money(subtotal)}</b></div>
                                        </div>
                                        <div className="flex items-end justify-end">
                                            <Button icon={IconTrash} iconOnly variant="danger" size="sm" onClick={() => removeItem(index)} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex flex-wrap justify-between gap-2">
                            <Button icon={IconPlus} variant="outline" onClick={addItem}>Item</Button>
                            <Button type="submit">Simpan Transaksi</Button>
                        </div>
                    </form>
                </Card>

                {tempoPayment ? (
                    <Card>
                        <form onSubmit={submitTempoPayment} className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
                            <div className="text-sm text-muted">
                                Pembayaran tempo <b className="text-main">{tempoPayment.number}</b>
                                <div>{tempoPayment.party || "-"}</div>
                                <div>Sisa: <b className="text-main">{money(tempoPayment.remaining)}</b></div>
                            </div>
                            <Field label="Jumlah Bayar">
                                <CurrencyInput value={tempoAmount} onChange={(event) => setTempoAmount(event.target.value)} />
                            </Field>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setTempoPayment(null)}>Batal</Button>
                                <Button type="submit">Proses Bayar</Button>
                            </div>
                        </form>
                    </Card>
                ) : null}

                <SimpleTable
                    rows={rows}
                    columns={isBuy ? [
                        { key: "no_pembelian", label: "No Pembelian" },
                        { key: "supplier", label: "Supplier", render: (row) => row.supplier?.nama_supplier || "-" },
                        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                        { key: "total_qty_ml", label: "Qty ML", render: (row) => number(row.total_qty_ml) },
                        { key: "total_qty_botol", label: "Qty Botol", render: (row) => number(row.total_qty_botol) },
                        { key: "total_pembelian", label: "Total", render: (row) => money(row.total_pembelian) },
                        { key: "status_pembayaran", label: "Status" },
                    ] : [
                        { key: "no_penjualan", label: "No Penjualan" },
                        { key: "customer", label: "Customer", render: (row) => row.customer?.nama_customer || "-" },
                        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                        { key: "total_qty_ml", label: "Qty ML", render: (row) => number(row.total_qty_ml) },
                        { key: "total_qty_botol", label: "Qty Botol", render: (row) => number(row.total_qty_botol) },
                        { key: "total_penjualan", label: "Total", render: (row) => money(row.total_penjualan) },
                        { key: "laba_kotor", label: "Laba", render: (row) => money(row.laba_kotor) },
                    ]}
                    renderActions={(row) => (
                        <>
                            {canPayTempo(row, isBuy) ? (
                                <Button size="sm" variant="outline" onClick={() => openTempoPayment(row)}>
                                    Bayar Tempo
                                </Button>
                            ) : null}
                            <Button
                                icon={IconPrinter}
                                size="sm"
                                variant="outline"
                                onClick={() => setReceipt(buildReceiptFromRow(row, isBuy))}
                            >
                                Nota
                            </Button>
                        </>
                    )}
                />

                {receipt ? (
                    <ReceiptModal
                        receipt={receipt}
                        bluetoothLoading={bluetoothLoading}
                        onClose={() => setReceipt(null)}
                        onPrint={() => printReceipt(receipt)}
                        onBluetooth={async () => {
                            setBluetoothLoading(true);
                            try {
                                await printBluetoothReceipt(receipt);
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

function itemOptions(refs, type) {
    if (type === "BOTOL") return refs.botol || [];

    return (refs.barang || []).filter((row) => (type === "ABSOLUTE" ? row.jenis_barang === "ABSOLUTE" : row.jenis_barang !== "ABSOLUTE"));
}

function findSelectedItem(refs, item) {
    return itemOptions(refs, item.tipe_item).find((row) => String(row.id) === String(item.item_id));
}

function defaultItemPrice(selected, item, isBuy, isWholesale) {
    if (!selected) return 0;
    if (item.tipe_item === "BOTOL") {
        if (isBuy) return selected.harga_beli_per_botol || 0;
        if (item.satuan_input === "DUS" && Number(selected.harga_jual_per_dus || 0) > 0) return selected.harga_jual_per_dus;
        return selected.harga_jual_per_botol || 0;
    }

    if (isBuy) return selected.harga_beli_per_ml || 0;
    return isWholesale ? selected.harga_jual_grosir_per_ml || 0 : selected.harga_jual_retail_per_ml || 0;
}

function convertQty(item, selected) {
    const qty = Number(item.qty_input || 0);
    if (item.tipe_item === "BOTOL") {
        return item.satuan_input === "DUS" ? qty * Number(selected?.isi_per_dus || 0) : qty;
    }

    return item.satuan_input === "LITER" ? qty * 1000 : qty;
}

function getTempoRecord(row, isBuy) {
    return isBuy ? row.hutang : row.piutang;
}

function canPayTempo(row, isBuy) {
    if (row.metode_pembayaran !== "TEMPO") return false;
    const record = getTempoRecord(row, isBuy);
    if (!record) return false;

    return Number(isBuy ? record.sisa_hutang || 0 : record.sisa_piutang || 0) > 0;
}

function ReceiptModal({ receipt, onClose, onPrint, onBluetooth, bluetoothLoading }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-card shadow-premium">
                <div className="flex items-center justify-between border-b border-stroke px-5 py-4">
                    <div>
                        <div className="text-base font-black text-main">{receipt.title}</div>
                        <div className="text-xs text-muted">{receipt.number}</div>
                    </div>
                    <Button icon={IconX} iconOnly variant="ghost" onClick={onClose} />
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-[280px_1fr]">
                    <pre className="max-h-[65vh] overflow-auto rounded-lg border border-stroke bg-page p-4 font-mono text-xs leading-relaxed text-main">
                        {receiptText(receipt)}
                    </pre>
                    <div className="space-y-4">
                        <div className="rounded-lg border border-stroke bg-page p-4 text-sm text-muted">
                            <div className="font-semibold text-main">{receipt.party_label}: {receipt.party_name}</div>
                            <div>Gudang: {receipt.warehouse}</div>
                            <div>Bayar: {receipt.payment_method} / {receipt.payment_status}</div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button icon={IconPrinter} onClick={onPrint}>
                                Print Thermal
                            </Button>
                            <Button
                                icon={IconBluetooth}
                                variant="outline"
                                loading={bluetoothLoading}
                                onClick={onBluetooth}
                            >
                                Bluetooth
                            </Button>
                            <Button variant="ghost" onClick={onClose}>
                                Tutup
                            </Button>
                        </div>

                        <div className="text-xs leading-5 text-muted">
                            Bluetooth memakai Web Bluetooth dan perlu printer BLE yang memiliki writable characteristic. Untuk printer Bluetooth classic, pair di OS lalu gunakan Print Thermal.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function buildReceiptFromRow(row, isBuy) {
    if (isBuy) {
        return {
            type: "pembelian",
            title: "NOTA PEMBELIAN",
            number: row.no_pembelian,
            date: formatDate(row.tanggal),
            party_label: "Supplier",
            party_name: row.supplier?.nama_supplier || "-",
            warehouse: row.gudang?.nama_gudang || "-",
            payment_method: row.metode_pembayaran,
            payment_status: row.status_pembayaran,
            items: (row.details || []).map((detail) => ({
                name: detail.nama_item || detail.barang?.nama_barang || detail.botol?.nama_botol || "-",
                qty: Number(detail.qty_input || detail.konversi_qty_dasar || detail.qty_ml || 0),
                unit: detail.satuan_input || "ML",
                price: Number(detail.harga || detail.harga_beli_per_ml || 0),
                subtotal: Number(detail.subtotal || 0),
            })),
            total_qty: Number(row.total_qty_ml || 0),
            total: Number(row.total_pembelian || 0),
        };
    }

    return {
        type: "penjualan",
        title: "NOTA PENJUALAN",
        number: row.no_penjualan,
        date: formatDate(row.tanggal),
        party_label: "Customer",
        party_name: row.customer?.nama_customer || "-",
        sales: row.sales?.nama_sales || "-",
        warehouse: row.gudang?.nama_gudang || "-",
        payment_method: row.metode_pembayaran,
        payment_status: row.status_pembayaran,
        items: (row.details || []).map((detail) => ({
            name: detail.nama_item || detail.barang?.nama_barang || detail.botol?.nama_botol || "-",
            qty: Number(detail.qty_input || detail.konversi_qty_dasar || detail.qty_ml || 0),
            unit: detail.satuan_input || "ML",
            price: Number(detail.harga || detail.harga_jual_per_ml || 0),
            subtotal: Number(detail.subtotal_jual || 0),
        })),
        total_qty: Number(row.total_qty_ml || 0),
        total: Number(row.total_penjualan || 0),
    };
}

function receiptText(receipt) {
    if (["hutang", "piutang", "piutang-supplier"].includes(receipt.type) || !Array.isArray(receipt.items)) {
        return paymentReceiptText(receipt);
    }

    const line = "-".repeat(32);
    const rows = [
        center("PARIS PARFUM"),
        center(receipt.title),
        line,
        `No   : ${receipt.number}`,
        `Tgl  : ${receipt.date || "-"}`,
        `${receipt.party_label.padEnd(5)}: ${receipt.party_name}`,
        `Gudang: ${receipt.warehouse || "-"}`,
        line,
        "Barang:",
        ...receipt.items.flatMap((item) => [
            truncate(item.name, 32),
            `${number(item.qty)} ${item.unit} x ${money(item.price).replace("Rp", "").trim()}`,
            right(money(item.subtotal), 32),
        ]),
        line,
        `Total Qty : ${number(receipt.total_qty)} ML`,
        `Total     : ${money(receipt.total)}`,
        `Bayar     : ${receipt.payment_method}`,
        `Status    : ${receipt.payment_status}`,
        line,
        center("Terima kasih"),
        "",
    ];

    return rows.join("\n");
}

function paymentReceiptText(receipt) {
    const line = "-".repeat(32);
    const rows = [
        center("PARIS PARFUM"),
        center(receipt.title),
        line,
        `No    : ${receipt.number}`,
        `Ref   : ${receipt.source_number || "-"}`,
        `Tgl   : ${receipt.date || "-"}`,
        `${receipt.party_label.padEnd(6)}: ${receipt.party_name}`,
        line,
        ...paymentReceiptItemLines(receipt.items),
        `Tagihan : ${money(receipt.total)}`,
        `Bayar   : ${money(receipt.amount)}`,
        `Terbayar: ${money(receipt.paid)}`,
        `Sisa    : ${money(receipt.remaining)}`,
        `Status  : ${receipt.status || "-"}`,
        line,
        center("Terima kasih"),
        "",
    ];

    return rows.join("\n");
}

function paymentReceiptItemLines(items = []) {
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
                    body { margin: 0; padding: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
                    pre { white-space: pre-wrap; margin: 0; }
                    @page { size: 80mm auto; margin: 4mm; }
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

function right(text, width = 32) {
    const value = String(text);
    return value.padStart(width);
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
