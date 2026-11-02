import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useState } from "react";
import { router } from "@inertiajs/react";
import Button from "@/components/common/Button";
import { usePage } from "@inertiajs/react";
import { BarcodeField, Field, Input, PageHeader, Select, SimpleTable, number, useFlashMessages } from "./_components";
import toast from "react-hot-toast";
import { automaticWarehouse, purchaseWarehouse, availableBarcodeItems, barcodeMatches } from "./barcode";
import BarcodeLookup from "./BarcodeLookup";
import { TransactionDialog } from "./TransactionDialogs";
import useTransactionSubmissionOptions from "./useTransactionSubmissionOptions";

export default function InventoryPage({ mode, rows = [], barang = [], botol = [], gudang = [], stokGudangMap = {}, botolKosong = [], stokGudangList = [], suppliers = [], supplierRows = null }) {
    useFlashMessages();
    const submissionOptions = useTransactionSubmissionOptions();
    const { errors: pageErrors } = usePage().props;
    const errors = pageErrors || {};
    const emptyForm = { id_supplier: "", id_gudang_tujuan: "", tipe_mutasi: "MASUK", jumlah_botol: "", qty_ml: "", id_barang: "", id_botol: "", id_gudang: "", tipe_gudang: "", jenis_barang: "BIBIT", keterangan: "" };
    const [form, setForm] = useState(emptyForm);
    const [barcode, setBarcode] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [kodeGudang, setKodeGudang] = useState(new URLSearchParams(window.location.search).get("barcode") || "");
    const [filterSupplier, setFilterSupplier] = useState(new URLSearchParams(window.location.search).get("id_supplier") || "");
    const [filterWarehouse, setFilterWarehouse] = useState(new URLSearchParams(window.location.search).get("id_gudang") || "");
    const isMutation = mode === "mutations";
    const isStock = mode === "stock";
    const isDestroyStock = mode === "destroy-stock";
    const title = mode === "low" ? "Stok Menipis" : isMutation ? "Mutasi Stok" : isDestroyStock ? "Hancur Stock" : "Stok Gudang";
    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const formatDisplayNumber = (value) => {
        const parsed = Number(value ?? 0);
        if (!Number.isFinite(parsed)) return "0";
        return Number.isInteger(parsed)
            ? String(parsed)
            : parsed.toFixed(2).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
    };

    const isGudangBotol = form.jenis_barang === "BOTOL";
    const isAbsolute = form.jenis_barang === "ABSOLUTE";
    const selectedBarang = !isGudangBotol
        ? barang.find((item) => item.id === Number(form.id_barang))
        : null;
    const selectedBotolKosong = isGudangBotol
        ? botolKosong.find((item) => item.id === Number(form.id_barang))
        : null;
    const bottleStock = (item) => form.id_gudang && Array.isArray(item?.warehouse_stocks)
        ? Number(item.warehouse_stocks.find((row) => Number(row.id_gudang) === Number(form.id_gudang))?.quantity || 0)
        : Number(item?.stock || 0);
    const selectedStock = isDestroyStock && form.id_gudang && form.id_barang
        ? stokGudangList.find((item) => Number(item.id_gudang) === Number(form.id_gudang)
            && Number(item.id_barang) === Number(form.id_barang)
            && (form.id_botol ? Number(item.id_botol) === Number(form.id_botol) : true))
        : null;
    const availableStockMl = selectedStock?.stok_ml ?? 0;
    const selectedBottle = botol.find((item) => item.id === Number(form.id_botol));

    const barangByType = kodeGudang
        ? barang.filter((item) => item.kode_barang?.toLowerCase().includes(kodeGudang.toLowerCase()))
        : barang;

    const filteredBarang = barangByType.filter((item) => item.jenis_barang === form.jenis_barang);
    const showNoBarangMessage = !isGudangBotol && filteredBarang.length === 0;
    const filteredBotolKosong = botolKosong;
    const selectItem = (id, bottle) => {
        const item = (bottle ? botolKosong : barang).find((row) => Number(row.id) === Number(id));
        if (!item) { setForm((previous) => ({ ...previous, id_barang: "", id_gudang: "", id_botol: "" })); return false; }
        try {
            const location = form.id_gudang ? purchaseWarehouse(item, bottle, gudang, form.id_gudang) : automaticWarehouse(item, bottle, gudang, stokGudangList);
            setForm((previous) => ({ ...previous, jenis_barang: bottle ? "BOTOL" : item.jenis_barang, id_barang: item.id, id_gudang: location.id, tipe_gudang: location.tipe_gudang, id_botol: bottle ? "" : item.id_botol || "" }));
            return true;
        } catch (failure) { toast.error(failure.message); return false; }
    };
    const applyBarcode = (code) => {
        if (!code.trim()) return false;
        const matches = [...barang.map((item) => ({ item, bottle: false })), ...botolKosong.map((item) => ({ item, bottle: true }))].filter(({ item }) => barcodeMatches(item, code));
        if (matches.length !== 1) { toast.error(matches.length ? "Kode barcode ganda. Perbaiki master barang." : "Barcode tidak ditemukan."); return false; }
        const { item, bottle } = matches[0];
        if (!selectItem(item.id, bottle)) return false;
        setBarcode("");
        return true;
    };
    const scanBarcode = () => applyBarcode(barcode);
    const incoming = isStock || (isMutation && form.tipe_mutasi === "MASUK");
    const barcodeItems = availableBarcodeItems({ barang, bottles: botolKosong, warehouses: gudang, stocks: stokGudangList, incoming, warehouseId: form.id_gudang });

    const filteredRows = kodeGudang
        ? (Array.isArray(rows) ? rows : rows.data || []).filter((row) => row.barang?.kode_barang?.toLowerCase().includes(kodeGudang.toLowerCase()))
        : rows;

    const openModal = () => {
        setForm(isStock ? { ...emptyForm, tipe_mutasi: "MASUK" } : emptyForm);
        setBarcode("");
        setShowModal(true);
    };

    const submit = (event) => {
        event.preventDefault();
        const payload = isStock ? { ...form, tipe_mutasi: "MASUK" } : isDestroyStock ? { ...form, tipe_mutasi: "KELUAR" } : { ...form };
        delete payload.tipe_gudang;
        delete payload.jenis_barang;
        const route = form.tipe_mutasi === "PINDAH" ? "/admin/mutasi-stok/pindah" : isDestroyStock ? "/admin/hancur-stock" : "/admin/mutasi-stok";
        router.post(route, payload, submissionOptions(route, {
            preserveScroll: true,
            onError: (values) => { if (values.items) toast.error(values.items, { duration: 8000 }); },
            onSuccess: () => {
                setShowModal(false);
                setForm(emptyForm);
                setKodeGudang("");
            },
        }));
    };

    const btnLabel = isStock ? "Tambah Stok" : isDestroyStock ? "Catat Hancur Stock" : "Tambah Mutasi";
    const modalTitle = isStock ? "Tambah Stok Gudang" : isDestroyStock ? "Catat Hancur Stock" : "Tambah Mutasi Stok";

    return (
        <ProtectedLayout title={title}>
            <div className="space-y-5">
                <PageHeader
                    title={title}
                    subtitle={isDestroyStock ? "Catat stok yang rusak, kedaluwarsa, atau tidak layak dipakai agar stok tetap akurat." : "Stok cairan disimpan per botol isi berdasarkan barang, botol, dan gudang."}
                    actionLabel={isMutation || isStock || isDestroyStock ? btnLabel : undefined}
                    onAction={isMutation || isStock || isDestroyStock ? openModal : undefined}
                />

                {supplierRows ? <form className="grid items-end gap-3 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); router.get(window.location.pathname, { id_supplier: filterSupplier, id_gudang: filterWarehouse, barcode: kodeGudang }, { preserveState: true }); }}>
                    <Field label="Supplier"><Select value={filterSupplier} onChange={(event) => setFilterSupplier(event.target.value)}><option value="">Semua supplier</option>{suppliers.map((row) => <option key={row.id} value={row.id}>{row.nama_supplier}</option>)}</Select></Field>
                    <Field label="Gudang"><Select value={filterWarehouse} onChange={(event) => setFilterWarehouse(event.target.value)}><option value="">Semua gudang</option>{gudang.map((row) => <option key={row.id} value={row.id}>{row.nama_gudang}</option>)}</Select></Field>
                    <Field label="Kode / Barcode"><Input value={kodeGudang} onChange={(event) => setKodeGudang(event.target.value)} /></Field><Button type="submit">Cari Stok</Button>
                </form> : null}

                {showModal && (
                    <TransactionDialog
                        title={modalTitle}
                        onClose={() => setShowModal(false)}
                        width="max-w-3xl"
                    >
                        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {errors.items && (
                                <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    {errors.items}
                                </div>
                            )}
                            <div className="md:col-span-2 lg:col-span-3"><Field label="Scan Barcode">
                                <div className="flex flex-wrap items-start gap-2">
                                    <div className="flex min-w-0 flex-1 gap-2"><Input value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); scanBarcode(); } }} placeholder="Scan barcode dengan scanner, lalu Enter" /><Button onClick={scanBarcode}>Gunakan Kode</Button></div>
                                    <BarcodeLookup items={barcodeItems} onSelect={(item) => applyBarcode(item.code)} incoming={incoming} />
                                </div>
                            </Field></div>
                            <Field label={incoming ? "Gudang Tujuan" : "Gudang Sumber"}><Select value={form.id_gudang} onChange={(event) => setForm((previous) => ({ ...previous, id_gudang: event.target.value, id_barang: "", id_botol: "" }))}><option value="">Otomatis dari barang</option>{gudang.filter((row) => row.tipe_gudang === (isGudangBotol ? "BOTOL" : "BIBIT")).map((row) => <option key={row.id} value={row.id}>{row.nama_gudang}</option>)}</Select></Field>
                            {incoming && <Field label="Supplier Asal Stok"><Select value={form.id_supplier} onChange={(event) => set("id_supplier", event.target.value)}><option value="">Pilih supplier</option>{suppliers.map((row) => <option key={row.id} value={row.id}>{row.nama_supplier}</option>)}</Select>{errors.id_supplier && <p role="alert" className="text-xs text-red-600">{errors.id_supplier}</p>}</Field>}
                            <Field label="Jenis Barang"><Select value={form.jenis_barang} onChange={(event) => {
                                const jenisBarang = event.target.value;
                                setForm((previous) => ({ ...previous, jenis_barang: jenisBarang, tipe_gudang: "", id_barang: "", id_gudang: "", id_botol: "", jumlah_botol: "", qty_ml: "" }));
                                setBarcode("");
                            }}><option value="BIBIT">Bibit</option><option value="ABSOLUTE">Absolute</option><option value="BOTOL">Botol Kosong</option></Select></Field>
                            {errors.id_gudang && <p role="alert" className="text-sm text-red-600">{errors.id_gudang}</p>}
                            <Field label={isGudangBotol ? "Botol Kosong" : "Barang"}>
                                {isGudangBotol ? (
                                    <>
                                        <Select value={form.id_barang} onChange={(event) => selectItem(event.target.value, isGudangBotol)} error={errors.id_barang}>
                                            <option value="">Pilih botol kosong</option>
                                            {filteredBotolKosong.map((item) => (
                                                <option key={item.id} value={item.id}>{item.kode_botol} - {item.nama_botol} (Stok: {formatDisplayNumber(bottleStock(item))})</option>
                                            ))}
                                        </Select>
                                        {form.id_gudang && filteredBotolKosong.length === 0 && (
                                            <p className="mt-1 text-[11px] font-medium text-amber-600">
                                                Tidak ada botol kosong di gudang ini.
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <Select value={form.id_barang} onChange={(event) => selectItem(event.target.value, isGudangBotol)} error={errors.id_barang}>
                                            <option value="">Pilih barang</option>
                                            {filteredBarang.map((item) => <option key={item.id} value={item.id}>{item.kode_barang} - {item.nama_barang}</option>)}
                                        </Select>
                                        {showNoBarangMessage && (
                                            <p className="mt-1 text-[11px] font-medium text-amber-600">
                                                Tidak ada barang {isAbsolute ? "Absolute" : "Bibit"} yang sesuai dengan pilihan dan pencarian.
                                            </p>
                                        )}
                                    </>
                                )}
                            </Field>
                            {(selectedBarang || selectedBotolKosong) && (
                                <BarcodeField code={isGudangBotol ? selectedBotolKosong?.kode_botol : selectedBarang?.kode_barang} />
                            )}
                            {!isGudangBotol && !isAbsolute && (
                                <Field label="Varian Botol">
                                    <Select value={form.id_botol || ""} onChange={(event) => set("id_botol", event.target.value)} error={errors.id_botol}>
                                        <option value="">{incoming ? "Pilih varian botol" : form.tipe_mutasi === "PINDAH" ? "Semua varian (FIFO)" : "Stok tanpa varian"}</option>
                                        {botol.map((b) => <option key={b.id} value={b.id}>{b.nama_botol}</option>)}
                                    </Select>
                                </Field>
                            )}
                            {isDestroyStock && form.id_gudang && form.id_barang && !isGudangBotol && (
                                <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                    Sisa stok saat ini untuk <span className="font-semibold">{selectedBottle?.nama_botol || selectedBarang?.nama_barang || 'barang ini'}</span>: <span className="font-semibold">{formatDisplayNumber(availableStockMl)} ML</span>
                                </div>
                            )}
                            {isDestroyStock && isGudangBotol && form.id_gudang && form.id_barang && (
                                <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                    Sisa stok botol kosong saat ini: <span className="font-semibold">{formatDisplayNumber(bottleStock(selectedBotolKosong))}</span>
                                </div>
                            )}
                            {!isStock && !isDestroyStock && (
                                <Field label="Tipe">
                                    <Select value={form.tipe_mutasi} onChange={(event) => set("tipe_mutasi", event.target.value)} error={errors.tipe_mutasi}>
                                        <option>MASUK</option>
                                        <option>KELUAR</option>
                                        <option value="PINDAH">PINDAH GUDANG</option>
                                    </Select>
                                </Field>
                            )}
                            {form.tipe_mutasi === "PINDAH" && <Field label="Gudang Tujuan"><Select value={form.id_gudang_tujuan} onChange={(event) => set("id_gudang_tujuan", event.target.value)}><option value="">Pilih gudang tujuan</option>{gudang.filter((row) => row.tipe_gudang === (isGudangBotol ? "BOTOL" : "BIBIT") && Number(row.id) !== Number(form.id_gudang)).map((row) => <option key={row.id} value={row.id}>{row.nama_gudang}</option>)}</Select>{errors.id_gudang_tujuan && <p role="alert" className="text-xs text-red-600">{errors.id_gudang_tujuan}</p>}</Field>}
                            {isGudangBotol ? (
                                <Field label="Jumlah Botol"><Input type="number" min="1" value={form.jumlah_botol} onChange={(event) => set("jumlah_botol", event.target.value)} error={errors.jumlah_botol} /></Field>
                            ) : isDestroyStock ? (
                                <Field label="Jumlah Hancur ML">
                                    <Input type="number" min="0.01" step="0.01" max={availableStockMl || undefined} value={form.qty_ml} onChange={(event) => set("qty_ml", event.target.value)} error={errors.qty_ml} />
                                </Field>
                            ) : isStock || form.tipe_mutasi === "MASUK" ? (
                                <Field label={isAbsolute ? "Jumlah ML" : "Jumlah Botol"}><Input type="number" min="1" value={form.jumlah_botol} onChange={(event) => set("jumlah_botol", event.target.value)} error={errors.jumlah_botol} /></Field>
                            ) : (
                                <Field label="Jumlah Keluar ML"><Input type="number" min="0.01" step="0.01" value={form.qty_ml} onChange={(event) => set("qty_ml", event.target.value)} error={errors.qty_ml} /></Field>
                            )}
                            <Field label="Keterangan"><Input value={form.keterangan} onChange={(event) => set("keterangan", event.target.value)} error={errors.keterangan} /></Field>
                            <div className="flex justify-end gap-2 border-t border-stroke pt-4 md:col-span-2 lg:col-span-3">
                                <Button variant="outline" size="sm" type="button" onClick={() => setShowModal(false)}>Batal</Button>
                                <Button type="submit" size="sm">Ajukan Validasi</Button>
                            </div>
                        </form>
                    </TransactionDialog>
                )}

                {supplierRows ? <SimpleTable rows={supplierRows} columns={[
                    ...(isMutation ? [{ key: "tanggal", label: "Tanggal" }, { key: "reference", label: "Referensi" }] : []),
                    { key: "kode_barang", label: "Barcode" }, { key: "nama_barang", label: "Barang" },
                    { key: "supplier_name", label: "Supplier Asal" }, { key: "nama_gudang", label: "Gudang" },
                    ...(isMutation ? [{ key: "direction", label: "Arah" }] : []),
                    { key: "quantity", label: isMutation ? "Jumlah" : "Stok", render: (row) => `${number(row.quantity)} ${row.unit}` },
                ]} /> : (<SimpleTable
                    rows={filteredRows}
                    columns={isMutation ? [
                        { key: "tanggal", label: "Tanggal" },
                        { key: "no_transaksi", label: "No Transaksi" },
                        { key: "barcode", label: "Kode / Barcode", render: (row) => row.barang?.kode_barang || "-" },
                        { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
                        { key: "varian", label: "Varian Botol", render: (row) => row.botol_variant?.nama_botol || row.barang?.botol?.nama_botol || "-" },
                        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                        { key: "tipe_mutasi", label: "Tipe" },
                        { key: "qty_ml", label: "Qty ML", render: (row) => number(row.qty_ml) },
                        { key: "stok_sesudah_ml", label: "Stok Akhir", render: (row) => number(row.stok_sesudah_ml) },
                    ] : [
                        { key: "barcode", label: "Kode / Barcode", render: (row) => row.barang?.kode_barang || "-" },
                        { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
                        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                        { key: "varian", label: "Varian Botol", render: (row) => row.botol_variant?.nama_botol || row.barang?.botol?.nama_botol || "-" },
                        { key: "stok_ml", label: "Stok Cairan (ML)", render: (row) => number(row.stok_ml) },
                        { key: "stok_botol_isi", label: "Botol Isi", render: (row) => number(row.stok_botol_isi) },
                        { key: "minimum_stok_ml", label: "Minimum", render: (row) => number(row.minimum_stok_ml) },
                    ]}
                />)}

            </div>
        </ProtectedLayout>
    );
}
