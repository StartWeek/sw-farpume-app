import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Button from "@/components/common/Button";
import { IconDotsVertical, IconFileTypePdf, IconPencil, IconPlus, IconPrinter, IconTrash, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { Card, CurrencyInput, Field, Input, PageHeader, Select, SimpleTable, formatInputNumber, money, number, todayDate, useFlashMessages } from "./_components";
import {
    renderReceiptTemplate,
    renderItemTemplate,
    withReceiptSettings,
} from "./receiptSettings";

const liquidUnits = ["ML", "LITER"];
const purchaseLiquidUnits = ["ML", "LITER", "BOTOL"];
const bottleUnits = ["BOTOL", "DUS"];
const payments = ["CASH", "TRANSFER", "TEMPO", "DP"];
const retailPayments = ["CASH", "TRANSFER"];

export default function TransactionPage({ type, mode = "form", rows = [], refs = {}, operationalDate = todayDate() }) {
    useFlashMessages();
    const { flash = {}, errors = {}, appSettings = {} } = usePage().props;
    const isHistory = mode === "history";
    const isBuy = type === "pembelian";
    const isBottleSale = type === "botol-kosong";
    const isWholesale = type === "sales" || type === "grosir";
    const title = isHistory
        ? (isBuy ? "Riwayat Pembelian Supplier" : isWholesale ? "Riwayat Penjualan Sales" : "Riwayat Penjualan Retail")
        : (isBuy ? "Pembelian Supplier" : isBottleSale ? "Penjualan Botol Kosong" : isWholesale ? "Penjualan Sales" : "Penjualan Retail");
    const emptyItem = { tipe_item: isBottleSale ? "BOTOL" : "BIBIT", item_id: "", qty_input: 1, satuan_input: isBottleSale ? "BOTOL" : "ML", harga: "", discount: "" };
    const initial = {
        tanggal: operationalDate,
        id_supplier: "",
        id_customer: "",
        manual_customer_name: "",
        id_sales: "",
        tipe_gudang: "",
        id_gudang: "",
        metode_pembayaran: "CASH",
        jumlah_bayar: "",
        discount: "",
        jatuh_tempo: operationalDate,
        tipe_penjualan: isBottleSale ? "BOTOL_KOSONG" : isWholesale ? "SALES" : "RETAIL",
        keterangan: "",
        items: [],
    };
    const [form, setForm] = useState(initial);
    const [receipt, setReceipt] = useState(flash.receipt || null);
    const printableReceipt = receipt
        ? withReceiptSettings(receipt, appSettings)
        : null;
    const [tempoPayment, setTempoPayment] = useState(null);
    const [tempoAmount, setTempoAmount] = useState("");
    const [bluetoothLoading, setBluetoothLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalForm, setModalForm] = useState(emptyItem);
    const [editingIndex, setEditingIndex] = useState(null);
    const urlParams = new URLSearchParams(window.location.search);
    const [filterForm, setFilterForm] = useState({
        tanggal_dari: urlParams.get("tanggal_dari") || "",
        tanggal_sampai: urlParams.get("tanggal_sampai") || "",
        tipe_penjualan: urlParams.get("tipe_penjualan") || "",
        id_supplier: urlParams.get("id_supplier") || "",
        search: urlParams.get("search") || "",
    });
    const setFilter = (key, value) => setFilterForm((prev) => ({ ...prev, [key]: value }));
    const applyFilter = () => {
        const params = new URLSearchParams(window.location.search);
        Object.entries(filterForm).forEach(([k, v]) => { if (v) params.set(k, v); else params.delete(k); });
        router.get(window.location.pathname + "?" + params.toString(), {}, { preserveScroll: true, preserveState: true, replace: true });
    };
    const resetFilter = () => {
        setFilterForm({ tanggal_dari: "", tanggal_sampai: "", tipe_penjualan: "", id_supplier: "", search: "" });
        router.get(window.location.pathname, {}, { preserveScroll: true, replace: true });
    };

    useEffect(() => {
        if (flash.receipt) {
            setReceipt(flash.receipt);
        }
    }, [flash.receipt]);

    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const visibleGudang = (refs.gudang || []).filter((row) => !form.tipe_gudang || row.tipe_gudang === form.tipe_gudang);
    const visibleSupplier = (refs.supplier || []).filter((row) => {
        if (!form.id_gudang) return false;
        const selectedGudang = (refs.gudang || []).find((g) => String(g.id) === String(form.id_gudang));
        if (!selectedGudang) return false;
        return !row.id_gudang || String(row.id_gudang) === String(selectedGudang.id);
    });
    const handleGudangTypeChange = (value) => {
        set("tipe_gudang", value);
        set("id_gudang", "");
        set("id_supplier", "");
    };
    const handleGudangChange = (value) => {
        set("id_gudang", value);
        set("id_supplier", "");
        const selected = (refs.gudang || []).find((row) => String(row.id) === String(value));
        if (selected) {
            set("tipe_gudang", selected.tipe_gudang || "");
        }
    };
    const updateItem = (index, key, value) => setForm((prev) => ({ ...prev, items: prev.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
    const updateItemQty = (index, value) => setForm((prev) => ({
        ...prev,
        items: prev.items.map((item, itemIndex) => {
            if (itemIndex !== index) return item;

            const defaultPrice = defaultItemPrice(findSelectedItem(refs, item), item, isBuy, isWholesale);

            return {
                ...item,
                qty_input: value,
                harga: !isBuy && value !== "" && !item.harga ? defaultPrice : item.harga,
            };
        }),
    }));
    const openAddModal = () => {
        if (!form.id_gudang) { toast.error("Pilih gudang terlebih dahulu."); return; }
        setEditingIndex(null);
        setModalForm(emptyItem);
        setModalOpen(true);
    };
    const openEditModal = (index) => { setEditingIndex(index); setModalForm({ ...form.items[index] }); setModalOpen(true); };
    const saveModalItem = () => {
        const selected = findSelectedItem(refs, modalForm);
        if (!modalForm.item_id) { toast.error("Pilih barang terlebih dahulu."); return; }
        if (isBuy && modalForm.tipe_item !== "BOTOL" && modalForm.satuan_input === "BOTOL" && !modalForm.id_botol) { toast.error("Pilih varian botol terlebih dahulu."); return; }
        if (!modalForm.qty_input || Number(modalForm.qty_input) <= 0) { toast.error("Jumlah harus lebih dari 0."); return; }
        if (editingIndex !== null) {
            setForm((prev) => ({ ...prev, items: prev.items.map((item, i) => i === editingIndex ? modalForm : item) }));
        } else {
            setForm((prev) => ({ ...prev, items: [...prev.items, modalForm] }));
        }
        setModalOpen(false);
    };
    const removeItem = (index) => setForm((prev) => ({ ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) }));
    const customers = useMemo(() => (refs.customer || []).filter((row) => isWholesale ? ["SALES"].includes(row.tipe_customer) : row.tipe_customer === "RETAIL"), [refs.customer, isWholesale]);

    const submit = (event) => {
        event.preventDefault();
        if (!checkStock()) return;
        router.post(isBuy ? "/admin/pembelian" : isBottleSale ? "/admin/penjualan-botol-kosong" : "/admin/penjualan", {
            ...form,
            jatuh_tempo: ["TEMPO", "DP"].includes(form.metode_pembayaran) ? form.jatuh_tempo : null,
            id_sales: form.id_sales || null,
        }, { preserveScroll: true, onSuccess: () => setForm(initial) });
    };

    const checkStock = () => {
        if (isBuy) return true;
        const insufficientStock = form.items.filter((item) => {
            if (!item.item_id) return false;
            if (item.tipe_item === "BOTOL") {
                const selected = findSelectedItem(refs, item);
                return selected && Number(selected.stock || 0) < Number(convertQty(item, selected, refs));
            }
            const selected = findSelectedItem(refs, item);
            if (!selected) return false;
            const convertedQty = Number(convertQty(item, selected, refs));
            const stock = refs.stok_gudang?.filter((s) => Number(s.id_barang) === Number(selected.id) && Number(s.id_gudang) === Number(form.id_gudang)).reduce((sum, s) => sum + Number(s.stok_ml || 0), 0) || 0;
            return stock < convertedQty;
        });
        if (insufficientStock.length > 0) {
            const names = insufficientStock.map((item) => {
                const selected = findSelectedItem(refs, item);
                if (item.tipe_item === "BOTOL") {
                    return `${selected?.nama_botol || "Botol kosong"} (stok: ${number(selected?.stock || 0)} BOTOL)`;
                }
                const stock = refs.stok_gudang?.filter((s) => Number(s.id_barang) === Number(selected?.id) && Number(s.id_gudang) === Number(form.id_gudang)).reduce((sum, s) => sum + Number(s.stok_ml || 0), 0) || 0;
                const available = stock ? Number(stock.stok_ml) : 0;
                return `${selected?.nama_barang || "?"} (stok: ${number(available)} ML)`;
            }).join(", ");
            toast.error(`Stok tidak mencukupi: ${names}`);
            return false;
        }
        return true;
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
                <PageHeader title={title} subtitle={isHistory ? "Riwayat transaksi — klik menu titik tiga untuk reprint nota atau pembayaran tempo." : "Transaksi otomatis membuat mutasi stok dan hutang/piutang bila pembayaran tempo."} />
                {!isHistory && <Card>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-4">
                            {isBuy ? (
                                <>
                                    <Field label="Tipe Gudang">
                                        <Select error={!!errors.tipe_gudang} value={form.tipe_gudang || ""} onChange={(event) => handleGudangTypeChange(event.target.value)}>
                                            <option value="">Pilih tipe gudang</option>
                                            <option value="BIBIT">BIBIT</option>
                                            <option value="BOTOL">BOTOL</option>
                                        </Select>
                                    </Field>
                                    <Field label="Gudang">
                                        <Select error={!!errors.id_gudang} value={form.id_gudang} onChange={(event) => handleGudangChange(event.target.value)}>
                                            <option value="">Pilih gudang</option>
                                            {visibleGudang.map((row) => <option key={row.id} value={row.id}>{row.nama_gudang}</option>)}
                                        </Select>
                                        {errors.id_gudang && <div className="mt-1 text-xs text-red-500">{errors.id_gudang}</div>}
                                    </Field>
                                    <Field label="Supplier">
                                        <Select error={!!errors.id_supplier} value={form.id_supplier} onChange={(event) => set("id_supplier", event.target.value)}>
                                            <option value="">Pilih supplier</option>
                                            {visibleSupplier.map((row) => <option key={row.id} value={row.id}>{row.kode_supplier} — {row.nama_supplier}</option>)}
                                            {!form.id_gudang && <option value="" disabled>Silakan pilih gudang dulu</option>}
                                        </Select>
                                        {errors.id_supplier && <div className="mt-1 text-xs text-red-500">{errors.id_supplier}</div>}
                                    </Field>
                                </>
                            ) : (
                                <>
                                    <Field label="Customer">
                                        <Select error={!!errors.id_customer} value={form.id_customer} onChange={(event) => set("id_customer", event.target.value)}>
                                            <option value="">Pilih customer</option>
                                            {customers.map((row) => <option key={row.id} value={row.id}>{row.kode_customer} - {row.nama_customer}</option>)}
                                        </Select>
                                        {errors.id_customer && <div className="mt-1 text-xs text-red-500">{errors.id_customer}</div>}
                                    </Field>
                                    <Field label="Nama Customer Manual">
                                        <Input error={!!errors.manual_customer_name} value={form.manual_customer_name || ""} onChange={(event) => set("manual_customer_name", event.target.value.toUpperCase())} placeholder="Isi jika tidak memilih customer" className="uppercase" />
                                        {errors.manual_customer_name && <div className="mt-1 text-xs text-red-500">{errors.manual_customer_name}</div>}
                                    </Field>
                                </>
                            )}
                            {!isBuy ? <Field label="Sales"><Select error={!!errors.id_sales} value={form.id_sales || ""} onChange={(event) => set("id_sales", event.target.value)}><option value="">Tanpa sales</option>{(refs.sales || []).map((row) => <option key={row.id} value={row.id}>{row.nama_sales}{row.no_hp ? ` — ${row.no_hp}` : ""}</option>)}</Select>{errors.id_sales && <div className="mt-1 text-xs text-red-500">{errors.id_sales}</div>}</Field> : null}
                            <Field label="Metode Bayar">
                                <Select error={!!errors.metode_pembayaran} value={form.metode_pembayaran} onChange={(event) => set("metode_pembayaran", event.target.value)}>{(isBuy || isWholesale ? payments : retailPayments).map((payment) => <option key={payment}>{payment}</option>)}</Select>
                                {errors.metode_pembayaran && <div className="mt-1 text-xs text-red-500">{errors.metode_pembayaran}</div>}
                            </Field>
                            {form.metode_pembayaran === "DP" ? <Field label="Jumlah DP"><CurrencyInput error={!!errors.jumlah_bayar} value={form.jumlah_bayar || ""} onChange={(event) => set("jumlah_bayar", event.target.value)} />{errors.jumlah_bayar && <div className="mt-1 text-xs text-red-500">{errors.jumlah_bayar}</div>}</Field> : null}
                            {["TEMPO", "DP"].includes(form.metode_pembayaran) ? <Field label="Jatuh Tempo"><Input error={!!errors.jatuh_tempo} type="date" value={form.jatuh_tempo || ""} onChange={(event) => set("jatuh_tempo", event.target.value)} />{errors.jatuh_tempo && <div className="mt-1 text-xs text-red-500">{errors.jatuh_tempo}</div>}</Field> : null}
                            <Field label="Discount">
                                <CurrencyInput error={!!errors.discount} value={form.discount || ""} onChange={(event) => set("discount", event.target.value.toUpperCase())} placeholder="0" />
                                {errors.discount && <div className="mt-1 text-xs text-red-500">{errors.discount}</div>}
                            </Field>
                        </div>

                        {errors.items && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{errors.items}</div>}

                        {/* Item Summary Table */}
                        {form.items.length > 0 && (
                            <div className="overflow-x-auto rounded-xl border border-stroke bg-card">
                                <table className="min-w-full divide-y divide-stroke text-sm">
                                    <thead className="bg-page/80 text-left">
                                        <tr>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-10 text-center">No</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-28">Kode</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted">Nama Barang</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-40">Qty</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-36 text-right">Harga</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-40 text-right">Disc</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-40 text-right">Total</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-20 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stroke/70">
                                        {(() => {
                                            let runningNo = 1;
                                            return form.items.map((item, index) => {
                                                const selected = findSelectedItem(refs, item);
                                                const price = Number(item.harga || defaultItemPrice(selected, item, isBuy, isWholesale) || 0);
                                                const convertedQty = convertQty(item, selected, refs);
                                                const subtotal = item.tipe_item === "BOTOL" && item.satuan_input === "DUS"
                                                    ? Number(item.qty_input || 0) * price
                                                    : convertedQty * price;
                                                const totalAfterDisc = Math.max(0, subtotal - (Number(item.discount) || 0));
                                                const kode = item.tipe_item === "BOTOL"
                                                    ? (selected?.kode_botol || "-")
                                                    : (selected?.kode_barang || "-");
                                                const namaBarang = item.tipe_item === "BOTOL"
                                                    ? (selected?.nama_botol || "-")
                                                    : (selected?.nama_barang || "-");
                                                const itemBotolVariant = item.id_botol
                                                    ? (refs.botol || []).find((b) => Number(b.id) === Number(item.id_botol))
                                                    : null;
                                                const botolInfo = item.satuan_input === "BOTOL" && itemBotolVariant
                                                    ? ` (${itemBotolVariant.nama_botol} ${itemBotolVariant.varian_ml} ML)`
                                                    : selected?.botol ? ` ${selected.botol.varian_ml} ML` : "";
                                                const qtyDisplay = item.tipe_item === "BOTOL"
                                                    ? `${number(convertedQty)} Botol`
                                                    : `${number(item.qty_input)} ${item.satuan_input === "BOTOL" ? "BOTOL ISI" : item.satuan_input}${botolInfo}`;
                                                const no = runningNo++;
                                                return (
                                                    <tr key={index} className="transition-colors duration-150 hover:bg-page/50">
                                                        <td className="px-3 py-2.5 text-center font-medium text-muted">{no}</td>
                                                        <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-main">{kode}</td>
                                                        <td className="px-3 py-2.5 font-medium text-main">{namaBarang}{botolInfo ? <span className="text-muted font-normal"> - {botolInfo}</span> : ""}</td>
                                                        <td className="px-3 py-2.5 font-medium text-main">{qtyDisplay}</td>
                                                        <td className="px-3 py-2.5 text-right font-medium text-main">{money(price)}</td>
                                                        <td className="px-3 py-2.5 text-right font-medium text-red-500">{Number(item.discount) > 0 ? money(Number(item.discount)) : "-"}</td>
                                                        <td className="px-3 py-2.5 text-right font-extrabold text-main">{money(totalAfterDisc)}</td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button icon={IconPencil} iconOnly variant="outline" size="sm" onClick={() => openEditModal(index)} title="Edit" />
                                                                <Button icon={IconTrash} iconOnly variant="danger" size="sm" onClick={() => removeItem(index)} title="Hapus" />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-page/80 font-bold">
                                            <td colSpan={4} className="px-3 py-2.5 text-right text-[10px] uppercase tracking-widest text-muted">Grand Total</td>
                                            <td className="px-3 py-2.5 text-right text-sm text-main"></td>
                                            <td className="px-3 py-2.5 text-right text-sm text-red-500">{money(form.items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0))}</td>
                                            <td className="px-3 py-2.5 text-right text-sm font-extrabold text-main">{money(form.items.reduce((sum, item) => {
                                                const selected = findSelectedItem(refs, item);
                                                const price = Number(item.harga || defaultItemPrice(selected, item, isBuy, isWholesale) || 0);
                                                const convertedQty = convertQty(item, selected, refs);
                                                const subtotal = item.tipe_item === "BOTOL" && item.satuan_input === "DUS"
                                                    ? Number(item.qty_input || 0) * price
                                                    : convertedQty * price;
                                                return sum + Math.max(0, subtotal - (Number(item.discount) || 0));
                                            }, 0))}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                        <div className="flex flex-wrap justify-between gap-2">
                            <Button icon={IconPlus} variant="outline" onClick={openAddModal}>Tambah Barang</Button>
                            <Button type="submit" disabled={form.items.length === 0}>Simpan Transaksi</Button>
                        </div>
                    </form>
                </Card>}

                {tempoPayment ? (
                    <Card>
                        <form onSubmit={submitTempoPayment} className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
                            <div className="text-[13px] font-medium text-muted">
                                Pembayaran tempo <b className="font-bold text-main">{tempoPayment.number}</b>
                                <div className="mt-0.5">{tempoPayment.party || "-"}</div>
                                <div className="mt-0.5">Sisa: <b className="font-bold text-main">{money(tempoPayment.remaining)}</b></div>
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

                {isHistory && <>
                    <Card>
                        <div className="flex flex-wrap items-end gap-3">
                            <Field label="Tanggal Dari">
                                <Input type="date" value={filterForm.tanggal_dari} onChange={(e) => setFilter("tanggal_dari", e.target.value)} />
                            </Field>
                            <Field label="Tanggal Sampai">
                                <Input type="date" value={filterForm.tanggal_sampai} onChange={(e) => setFilter("tanggal_sampai", e.target.value)} />
                            </Field>
                            {!isBuy && (
                                <Field label="Tipe Penjualan">
                                    <Select value={filterForm.tipe_penjualan} onChange={(e) => setFilter("tipe_penjualan", e.target.value)}>
                                        <option value="">Semua</option>
                                        <option value="RETAIL">Retail</option>
                                        <option value="GROSIR">Sales</option>
                                    </Select>
                                </Field>
                            )}
                            {isBuy && (
                                <Field label="Supplier">
                                    <Select value={filterForm.id_supplier} onChange={(e) => setFilter("id_supplier", e.target.value)}>
                                        <option value="">Semua</option>
                                        {(refs.supplier || []).map((s) => <option key={s.id} value={s.id}>{s.kode_supplier} — {s.nama_supplier}</option>)}
                                    </Select>
                                </Field>
                            )}
                            <Field label="Cari No Transaksi">
                                <Input value={filterForm.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Cari..." />
                            </Field>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={resetFilter}>Reset</Button>
                                <Button onClick={applyFilter}>Cari</Button>
                            </div>
                        </div>
                    </Card>
                    <SimpleTable
                    rows={rows}
                    columns={isBuy ? [
                        { key: "no_pembelian", label: "No Pembelian" },
                        { key: "supplier", label: "Supplier", render: (row) => row.supplier ? `${row.supplier.kode_supplier} — ${row.supplier.nama_supplier}` : "-" },
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
                    renderActions={isHistory ? (row) => <KebabMenu row={row} isBuy={isBuy} onPrint={() => setReceipt(buildReceiptFromRow(row, isBuy))} onPayTempo={canPayTempo(row, isBuy) ? () => openTempoPayment(row) : null} /> : (row) => (
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
                /></>}

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

                {/* Item Modal */}
                {modalOpen && (
                    <ItemModal
                        form={modalForm}
                        setForm={setModalForm}
                        onSave={saveModalItem}
                        onClose={() => setModalOpen(false)}
                        isEdit={editingIndex !== null}
                        isBuy={isBuy}
                        isWholesale={isWholesale}
                        refs={refs}
                        gudangId={form.id_gudang}
                        isBottleSale={isBottleSale}
                    />
                )}
            </div>
        </ProtectedLayout>
    );
}

function itemOptions(refs, type) {
    if (type === "BOTOL") return refs.botol_kosong || [];

    return (refs.barang || []).filter((row) => (type === "ABSOLUTE" ? row.jenis_barang === "ABSOLUTE" : row.jenis_barang !== "ABSOLUTE"));
}

function availableItemOptions(refs, type, isBuy, gudangId) {
    const options = itemOptions(refs, type);
    if (type === "BOTOL") {
        if (!gudangId) return [];
        return options.filter((row) => Number(row.id_gudang) === Number(gudangId) && (isBuy || Number(row.stock || 0) > 0));
    }

    if (isBuy) return options;

    if (!gudangId) return [];

    return options.filter((row) => refs.stok_gudang?.some((stock) => Number(stock.id_barang) === Number(row.id) && Number(stock.id_gudang) === Number(gudangId) && Number(stock.stok_ml) > 0));
}

function itemOptionLabel(row, type, isBuy, isWholesale, refs, gudangId) {
    if (type === "BOTOL") {
        const stockInfo = gudangId ? ` — Stok: ${number(row.stock || 0)} Botol` : "";
        return `${row.kode_botol || "-"} - ${row.nama_botol}${stockInfo}`;
    }

    // Pembelian: hanya tampilkan kode_barang dan nama_barang
    if (isBuy) {
        return `${row.kode_barang || "-"} - ${row.nama_barang}`;
    }

    const botol = row.botol?.varian_ml ? ` - ${row.botol.varian_ml} ML` : " - Botol belum dipilih";
    const stock = gudangId
        ? refs?.stok_gudang?.filter((s) => Number(s.id_barang) === Number(row.id) && Number(s.id_gudang) === Number(gudangId)).reduce((sum, s) => sum + Number(s.stok_ml || 0), 0)
        : null;
    const stockInfo = stock ? ` — Stok: ${number(stock.stok_ml)} ML` : (gudangId ? " — Stok: 0 ML" : "");
    return `${row.kode_barang || "-"} - ${row.nama_barang}${botol}${stockInfo}`;
}

function findSelectedItem(refs, item) {
    return itemOptions(refs, item.tipe_item).find((row) => String(row.id) === String(item.item_id));
}

function defaultItemPrice(selected, item, isBuy, isWholesale) {
    if (!selected) return 0;
    if (item.tipe_item === "BOTOL") {
        if (isBuy) return selected.harga_beli || 0;
        return selected.harga_jual || 0;
    }

    if (isBuy) return selected.harga_beli_per_ml || 0;
    if (isWholesale && Number(selected.harga_jual_grosir_per_ml || 0) > 0) return selected.harga_jual_grosir_per_ml;
    return selected.harga_jual_retail_per_ml || 0;
}

function convertQty(item, selected, refs) {
    const qty = Number(item.qty_input || 0);
    if (item.tipe_item === "BOTOL") {
        return item.satuan_input === "DUS" ? qty : qty;
    }

    if (item.satuan_input === "BOTOL") {
        const botolVariant = item.id_botol
            ? (refs?.botol || []).find((b) => Number(b.id) === Number(item.id_botol))
            : null;
        return qty * Number(botolVariant?.varian_ml || selected?.botol?.varian_ml || 0);
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

function KebabMenu({ row, isBuy, onPrint, onPayTempo }) {
    const [open, setOpen] = useState(false);
    const [dropUp, setDropUp] = useState(false);
    const buttonRef = useRef(null);

    const toggle = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // If the button is in the bottom 200px of the viewport, open upward
            setDropUp(window.innerHeight - rect.bottom < 200);
        }
        setOpen(!open);
    };

    return (
        <div className="relative inline-block" ref={buttonRef}>
            <button type="button" onClick={toggle} className="rounded-lg p-1.5 text-muted hover:bg-page hover:text-main transition-colors">
                <IconDotsVertical size={16} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className={`absolute right-0 z-20 w-44 rounded-xl border border-stroke bg-card py-1.5 shadow-premium text-sm ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                        <button type="button" onClick={() => { onPrint(); setOpen(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left font-medium text-main hover:bg-page transition-colors">
                            <IconPrinter size={14} className="text-muted" /> Reprint Nota
                        </button>
                        {onPayTempo && (
                            <button type="button" onClick={() => { onPayTempo(); setOpen(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left font-medium text-amber-600 hover:bg-page transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                {" "}Bayar Tempo
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function ItemModal({ form, setForm, onSave, onClose, isEdit, isBuy, isWholesale, refs, gudangId, isBottleSale }) {
    const selected = findSelectedItem(refs, form);
    const options = availableItemOptions(refs, form.tipe_item, isBuy, gudangId);
    const unitOptions = form.tipe_item === "BOTOL"
        ? bottleUnits
        : (isBuy ? purchaseLiquidUnits : liquidUnits);
    const defaultPrice = defaultItemPrice(selected, form, isBuy, isWholesale);
    const price = Number(form.harga || defaultPrice || 0);
    const convertedQty = convertQty(form, selected);
    const subtotal = form.tipe_item === "BOTOL" && form.satuan_input === "DUS"
        ? Number(form.qty_input || 0) * price
        : convertedQty * price;
    const totalAfterDisc = Math.max(0, subtotal - (Number(form.discount) || 0));

    const selectedBotolVariant = form.id_botol
        ? (refs.botol || []).find((b) => Number(b.id) === Number(form.id_botol))
        : null;

    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const updateQty = (value) => {
        const defPrice = defaultItemPrice(findSelectedItem(refs, { ...form, qty_input: value }), { ...form, qty_input: value }, isBuy, isWholesale);
        setForm((prev) => ({
            ...prev,
            qty_input: value,
            harga: !isBuy && value !== "" && !prev.harga ? defPrice : prev.harga,
        }));
    };

    const handleSelectItem = (itemId) => {
        set("item_id", itemId);
        set("harga", "");
        // Cek stok saat pilih barang — hanya untuk penjualan (bukan pembelian)
        if (!isBuy && itemId && form.tipe_item !== "BOTOL" && gudangId) {
            const stock = refs.stok_gudang?.filter((s) => Number(s.id_barang) === Number(itemId) && Number(s.id_gudang) === Number(gudangId)).reduce((sum, s) => sum + Number(s.stok_ml || 0), 0) || 0;
            if (!stock || Number(stock.stok_ml) <= 0) {
                const item = itemOptions(refs, form.tipe_item).find((row) => String(row.id) === String(itemId));
                toast.error(`Stok ${item?.nama_barang || "barang"} kosong atau tidak tersedia di gudang yang dipilih.`);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="w-full max-w-lg rounded-xl border border-stroke bg-card shadow-premium" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-stroke px-5 py-4">
                    <div className="text-lg font-extrabold tracking-tight text-main">
                        {isEdit ? "Edit Barang" : "Tambah Barang"}
                    </div>
                    <Button icon={IconX} iconOnly variant="ghost" onClick={onClose} />
                </div>
                <div className="space-y-4 p-5">
                    <Field label="Tipe Barang">
                        <Select value={form.tipe_item} disabled={isBottleSale} onChange={(event) => {
                            const nextType = event.target.value;
                            set("tipe_item", nextType);
                            set("item_id", "");
                            set("harga", "");
                            set("satuan_input", nextType === "BOTOL" ? "BOTOL" : "ML");
                        }}>
                            <option value="BIBIT">Bibit</option>
                            <option value="ABSOLUTE">Absolute</option>
                            {(isBuy || isBottleSale) && <option value="BOTOL">Botol Kosong</option>}
                        </Select>
                    </Field>
                    <Field label="Pilih Barang">
                        <Select value={form.item_id} onChange={(event) => handleSelectItem(event.target.value)}>
                            <option value="">Pilih barang...</option>
                            {options.map((row) => <option key={row.id} value={row.id}>{itemOptionLabel(row, form.tipe_item, isBuy, isWholesale, refs, gudangId)}</option>)}
                        </Select>
                        {!isBuy && !gudangId && <p className="mt-1 text-[11px] font-medium text-amber-600">Pilih gudang terlebih dahulu.</p>}
                        {!isBuy && gudangId && options.length === 0 && <p className="mt-1 text-[11px] font-medium text-amber-600">Tidak ada stok untuk tipe barang ini di gudang yang dipilih.</p>}
                    </Field>
                    {isBuy && form.tipe_item !== "BOTOL" && form.satuan_input === "BOTOL" && (
                        <Field label="Varian Botol">
                            <Select
                                value={form.id_botol || ""}
                                onChange={(e) => {
                                    set("id_botol", e.target.value);
                                    set("harga", "");
                                }}
                            >
                                <option value="">Pilih varian botol</option>
                                {(refs.botol || []).map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.nama_botol}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Jumlah">
                            <Input type="number" value={form.qty_input} onChange={(event) => updateQty(event.target.value)} />
                        </Field>
                        <Field label="Satuan">
                            <Select value={form.satuan_input} onChange={(event) => { set("satuan_input", event.target.value); set("harga", ""); if (event.target.value !== "BOTOL") set("id_botol", ""); }}>
                                {unitOptions.map((unit) => (
                                    <option key={unit} value={unit}>
                                        {unit === "BOTOL" && form.tipe_item !== "BOTOL" ? "BOTOL ISI" : unit}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label={isBuy ? "Harga Beli" : "Harga Jual"}>
                            <CurrencyInput
                                value={isBuy ? form.harga || "" : price || ""}
                                placeholder={formatInputNumber(defaultPrice || "")}
                                onChange={isBuy ? (event) => set("harga", event.target.value) : undefined}
                                readOnly={!isBuy}
                            />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Diskon">
                            <CurrencyInput value={form.discount || ""} placeholder="0" onChange={(event) => set("discount", event.target.value)} />
                        </Field>
                        <div className="rounded-lg bg-page/60 px-3.5 py-2.5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Subtotal</div>
                            <div className="mt-1 text-lg font-extrabold text-main">{money(totalAfterDisc)}</div>
                            <div className="text-[11px] text-muted">{number(convertedQty)} {form.tipe_item === "BOTOL" ? "Botol" : "ML"}</div>
                            {Number(form.discount) > 0 && <div className="text-[10px] text-red-500">Diskon: -{money(Number(form.discount))}</div>}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-stroke px-5 py-4">
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={onSave}>{isEdit ? "Update" : "Simpan"}</Button>
                </div>
            </div>
        </div>
    );
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
                            <div className="mt-0.5 font-medium">Gudang: {receipt.warehouse}</div>
                            {receipt.type !== "penjualan" && <div className="mt-0.5 font-medium">Bayar: {receipt.payment_method} / {receipt.payment_status}</div>}
                            {receipt.type === "penjualan" && <div className="mt-0.5 font-medium">Status: {receipt.payment_status}</div>}
                            {receipt.jatuh_tempo && <div className="mt-0.5 font-medium">Jatuh Tempo: {receipt.jatuh_tempo}</div>}
                            {receipt.discount > 0 && <div className="mt-0.5 font-medium">Discount: {money(receipt.discount)}</div>}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                icon={IconPrinter}
                                loading={bluetoothLoading}
                                onClick={onBluetooth}
                            >
                                Print
                            </Button>
                            {receipt.type === 'pembelian' && receipt.id ? (
                                <a href={`/admin/pembelian/${receipt.id}/pdf`} className="no-underline">
                                    <Button icon={IconFileTypePdf} variant="outline">
                                        PDF
                                    </Button>
                                </a>
                            ) : null}
                            <Button variant="ghost" onClick={onClose}>
                                Tutup
                            </Button>
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

function buildReceiptFromRow(row, isBuy) {
    if (isBuy) {
        return {
            id: row.id,
            type: "pembelian",
            title: "NOTA PEMBELIAN",
            number: row.no_pembelian,
            date: formatDate(row.tanggal),
            party_label: "Supplier",
            party_name: row.supplier?.nama_supplier || "-",
            warehouse: row.gudang?.nama_gudang || "-",
            payment_method: row.metode_pembayaran,
            payment_status: row.status_pembayaran,
            discount: Number(row.discount || 0),
            items: (row.details || []).map((detail) => {
                const variant = detail.botol_variant;
                const capacity = detail.satuan_dasar === "BOTOL"
                    ? Number(detail.qty_ml || 0)
                    : (variant ? Number(variant.varian_ml || 0) : null);
                const unitLabel = detail.satuan_input === "BOTOL" && detail.satuan_dasar === "ML"
                    ? "BOTOL ISI"
                    : (detail.satuan_input || "ML");
                const variantLabel = variant ? variant.nama_botol : null;
                return {
                    name: detail.nama_item || detail.barang?.nama_barang || detail.botol?.nama_botol || "-",
                    qty: Number(detail.qty_input || detail.konversi_qty_dasar || detail.qty_ml || 0),
                    unit: unitLabel,
                    variant: variantLabel,
                    price: Number(detail.harga || detail.harga_beli_per_ml || 0),
                    subtotal: Number(detail.subtotal || 0),
                    discount: Number(detail.discount || 0),
                    capacity_ml: capacity,
                    price_per_ml: Number(detail.harga_beli_per_ml || 0),
                };
            }),
            total_qty: Number(row.total_qty_ml || 0),
            total_bottle: Number(row.total_qty_botol || 0),
            total: Number(row.total_pembelian || 0),
        };
    }

    return {
        id: row.id,
        type: "penjualan",
        title: "NOTA PENJUALAN",
        number: row.no_penjualan,
        date: formatDate(row.tanggal),
        party_label: "Customer",
        party_name: row.customer?.nama_customer || row.manual_customer_name || "-",
        sales: row.sales?.nama_sales || "-",
        warehouse: row.gudang?.nama_gudang || "-",
        payment_method: row.metode_pembayaran,
        payment_status: row.status_pembayaran,
        discount: Number(row.discount || 0),
        jatuh_tempo: row.jatuh_tempo ? formatDate(row.jatuh_tempo) : null,
        items: (row.details || []).map((detail) => {
            const variant = detail.botol_variant;
            const variantLabel = variant ? variant.nama_botol : null;
            return {
                name: detail.nama_item || detail.barang?.nama_barang || detail.botol?.nama_botol || "-",
                qty: Number(detail.qty_input || detail.konversi_qty_dasar || detail.qty_ml || 0),
                unit: detail.satuan_input || "ML",
                variant: variantLabel,
                price: Number(detail.harga || detail.harga_jual_per_ml || 0),
                subtotal: Number(detail.subtotal_jual || 0),
                discount: Number(detail.discount || 0),
                capacity_ml: detail.satuan_dasar === "BOTOL" ? Number(detail.qty_ml || 0) : null,
                price_per_ml: Number(detail.harga_jual_per_ml || 0),
            };
        }),
        total_qty: Number(row.total_qty_ml || 0),
        total_bottle: Number(row.total_qty_botol || 0),
        total: Number(row.total_penjualan || 0),
    };
}

function receiptText(receipt) {
    if (["hutang", "piutang", "piutang-supplier"].includes(receipt.type) || !Array.isArray(receipt.items)) {
        return paymentReceiptText(receipt);
    }

    const line = "-".repeat(32);
    const itemTemplate = receipt.item_template || "";
    const itemLines = receipt.items.flatMap((item) => {
        const rendered = renderItemTemplate(itemTemplate, {
            name: item.name,
            qty: `${number(item.qty)} ${item.unit}`,
            price: money(item.price).replace("Rp", "").trim(),
            unit: item.unit,
            variant: item.variant ? `BOTOL : ${item.variant}` : "",
        });
        return rendered.split("\n").filter(Boolean);
    });
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
        date: receipt.date || "-",
        party_label: receipt.party_label,
        party_name: receipt.party_name,
        warehouse: receipt.warehouse || "-",
        items: itemLines.join("\n"),
        total_qty: number(receipt.total_qty),
        total_bottle_line: receipt.total_bottle > 0 ? `Total Botol: ${number(receipt.total_bottle)} BOTOL` : "",
        subtotal_line: receipt.discount > 0 ? `Subtotal  : ${money(receipt.total + receipt.discount)}` : "",
        discount_line: receipt.discount > 0 ? `Discount  : ${money(receipt.discount)}` : "",
        grand_total: money(receipt.total),
        payment_method: receipt.payment_method || "-",
        payment_line: receipt.type !== "penjualan" ? `Bayar     : ${receipt.payment_method}` : "",
        payment_status: receipt.payment_status || "-",
        due_date: receipt.jatuh_tempo || "",
        due_date_line: receipt.jatuh_tempo ? `Jatuh Tempo: ${receipt.jatuh_tempo}` : "",
        footer: receipt.receipt_footer || "Terima kasih",
        footer_center: center(receipt.receipt_footer || "Terima kasih"),
    };

    if (receipt.receipt_template) {
        return renderReceiptTemplate(receipt.receipt_template, templateValues);
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
        `No     : ${receipt.number}`,
        `Tgl    : ${receipt.date || "-"}`,
        `${receipt.party_label} : ${receipt.party_name}`,
        `Gudang : ${receipt.warehouse || "-"}`,
        line,
        ...itemLines,
        line,
        `Total Qty  : ${number(receipt.total_qty)} ML`,
        `Grand Total : ${money(receipt.total)}`,
        receipt.type !== "penjualan" ? `Bayar      : ${receipt.payment_method}` : null,
        `Status     : ${receipt.payment_status}`,
        line,
        center(receipt.receipt_footer || "Terima kasih"),
        line,
        "",
    ].filter(Boolean);

    return rows.join("\n");
}

function paymentReceiptText(receipt) {
    const line = "-".repeat(32);
    const itemLines = paymentReceiptItemLines(receipt.items);
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
        line,
        center(receipt.receipt_footer || "Terima kasih"),
        line,
        "",
    ].filter(Boolean);

    return rows.join("\n");
}

function paymentReceiptItemLines(items = []) {
    if (!Array.isArray(items) || items.length === 0) return [];

    return [
        "Barang:",
        ...items.flatMap((item) => [
            ...wrapLabeledLine("  NAMA", item.name),
            `  QTY     : ${number(item.qty)} ${item.unit}`,
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
        toast.error("Browser belum mendukung Web Bluetooth.");
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
    toast.error("Printer Bluetooth tidak memiliki characteristic yang bisa ditulis.");
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

function wrapLabeledLine(label, value, width = 32) {
    const prefix = `${label} : `;
    const maxLen = width - prefix.length;
    if (maxLen <= 0) return [`${prefix}${value}`];

    const words = String(value || "-").split(" ");
    const lines = [];
    let currentLine = "";
    let isFirst = true;

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length <= maxLen) {
            currentLine = testLine;
        } else {
            if (currentLine) {
                lines.push(isFirst ? `${prefix}${currentLine}` : `${" ".repeat(prefix.length)}${currentLine}`);
                isFirst = false;
            }
            // If single word exceeds maxLen, force-break it
            if (word.length > maxLen) {
                let chunk = word;
                while (chunk.length > 0) {
                    const part = chunk.slice(0, maxLen);
                    chunk = chunk.slice(maxLen);
                    lines.push(isFirst ? `${prefix}${part}` : `${" ".repeat(prefix.length)}${part}`);
                    isFirst = false;
                }
            } else {
                currentLine = word;
            }
        }
    }

    if (currentLine) {
        lines.push(isFirst ? `${prefix}${currentLine}` : `${" ".repeat(prefix.length)}${currentLine}`);
    }

    return lines.length > 0 ? lines : [`${prefix}-`];
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
