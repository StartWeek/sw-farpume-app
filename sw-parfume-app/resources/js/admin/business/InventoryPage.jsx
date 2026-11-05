import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useState } from "react";
import { router } from "@inertiajs/react";
import Button from "@/components/common/Button";
import { IconPlus } from "@tabler/icons-react";
import { usePage } from "@inertiajs/react";
import { BarcodeField, Card, Field, Input, PageHeader, Select, SimpleTable, Textarea, number, useFlashMessages } from "./_components";
import toast from "react-hot-toast";
import { automaticWarehouse, purchaseWarehouse, availableBarcodeItems, barcodeMatches, itemStockDetails } from "./barcode";
import BarcodeLookup from "./BarcodeLookup";
import ItemStockInfo, { itemStockLabel } from "./ItemStockInfo";
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
    const selectItem = (id, bottle, warehouseId = form.id_gudang) => {
        const item = (bottle ? botolKosong : barang).find((row) => Number(row.id) === Number(id));
        if (!item) { setForm((previous) => ({ ...previous, id_barang: "", id_gudang: "", id_botol: "" })); return false; }
        try {
            const location = warehouseId ? purchaseWarehouse(item, bottle, gudang, warehouseId) : automaticWarehouse(item, bottle, gudang, stokGudangList, incoming);
            setForm((previous) => ({ ...previous, jenis_barang: bottle ? "BOTOL" : item.jenis_barang, id_barang: item.id, id_gudang: location.id, tipe_gudang: location.tipe_gudang, id_botol: bottle ? "" : item.id_botol || "" }));
            return true;
        } catch (failure) { toast.error(failure.message); return false; }
    };
    const applyBarcode = (code, warehouseId = form.id_gudang) => {
        if (!code.trim()) return false;
        const matches = [...barang.map((item) => ({ item, bottle: false })), ...botolKosong.map((item) => ({ item, bottle: true }))].filter(({ item }) => barcodeMatches(item, code));
        if (matches.length !== 1) { toast.error(matches.length ? "Kode barcode ganda. Perbaiki master barang." : "Barcode tidak ditemukan."); return false; }
        const { item, bottle } = matches[0];
        if (!selectItem(item.id, bottle, warehouseId)) return false;
        setBarcode("");
        return true;
    };
    const scanBarcode = () => applyBarcode(barcode);
    const incoming = isStock || (isMutation && form.tipe_mutasi === "MASUK");
    const barcodeItems = availableBarcodeItems({ barang, bottles: botolKosong, warehouses: gudang, stocks: stokGudangList, incoming, warehouseId: form.id_gudang });
    const stockDetails = (item) => itemStockDetails(item, form.jenis_barang, { warehouses: gudang, stocks: stokGudangList, incoming, warehouseId: form.id_gudang });

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

    const displayedRows = supplierRows || filteredRows;
    const totalRows = Array.isArray(displayedRows) ? displayedRows.length : Number(displayedRows?.total || 0);

    const btnLabel = isStock ? "Tambah Stok" : isDestroyStock ? "Catat Hancur Stock" : "Tambah Mutasi";
    const modalTitle = isStock ? "Tambah Stok Gudang" : isDestroyStock ? "Catat Hancur Stock" : "Tambah Mutasi Stok";

    return (
        <ProtectedLayout title={title}>
            <div className="space-y-5">
                <PageHeader
                    title={title}
                    subtitle={isDestroyStock ? "Catat stok yang rusak, kedaluwarsa, atau tidak layak dipakai agar stok tetap akurat." : "Stok cairan disimpan per botol isi berdasarkan barang, botol, dan gudang."}
                />
                <Card className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-main">{supplierRows ? isMutation ? "Filter Mutasi" : "Filter Stok" : isDestroyStock ? "Pencatatan Hancur Stok" : "Informasi Stok"}</h2>
                            <p className="mt-1 text-xs leading-5 text-muted">{supplierRows ? "Cari berdasarkan supplier, gudang, atau kode barang." : isDestroyStock ? "Catat barang rusak atau tidak layak pakai melalui pengajuan validasi." : "Pantau jumlah stok dan varian botol di setiap gudang."}</p>
                        </div>
                        {(isMutation || isStock || isDestroyStock) && <Button icon={IconPlus} size="sm" className="self-start sm:self-auto" onClick={openModal}>{btnLabel}</Button>}
                    </div>
                    {supplierRows ? <form className="grid items-end gap-4 border-t border-stroke pt-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(event) => { event.preventDefault(); router.get(window.location.pathname, { id_supplier: filterSupplier, id_gudang: filterWarehouse, barcode: kodeGudang }, { preserveState: true }); }}>
                        <Field label="Supplier"><Select value={filterSupplier} onChange={(event) => setFilterSupplier(event.target.value)}><option value="">Semua supplier</option>{suppliers.map((row) => <option key={row.id} value={row.id}>{row.nama_supplier}</option>)}</Select></Field>
                        <Field label="Gudang"><Select value={filterWarehouse} onChange={(event) => setFilterWarehouse(event.target.value)}><option value="">Semua gudang</option>{gudang.map((row) => <option key={row.id} value={row.id}>{row.nama_gudang}</option>)}</Select></Field>
                        <Field label="Kode / Barcode"><Input placeholder="Kode barang atau botol" value={kodeGudang} onChange={(event) => setKodeGudang(event.target.value)} /></Field>
                        <Button type="submit" size="sm" className="min-h-11">Cari Stok</Button>
                    </form> : null}
                </Card>

                {showModal && (
                    <TransactionDialog
                        title={modalTitle}
                        onClose={() => setShowModal(false)}
                        width="max-w-3xl"
                    >
                        <form onSubmit={submit} className="space-y-5">
                            {errors.items && (
                                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    {errors.items}
                                </div>
                            )}
                            <section className="space-y-4 rounded-xl border border-stroke bg-page/30 p-4">
                                <div>
                                    <h3 className="text-sm font-bold text-main">Barang & Lokasi</h3>
                                    <p className="mt-1 text-xs leading-5 text-muted">Scan barcode atau pilih barang, lalu pastikan gudangnya sesuai.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="inventory-scan-barcode" className="text-[11px] font-bold uppercase tracking-widest text-muted">Scan Barcode</label>
                                    <div className="flex flex-wrap items-start gap-2">
                                        <div className="min-w-0 flex-1 basis-52"><Input id="inventory-scan-barcode" value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); scanBarcode(); } }} placeholder="Scan barcode lalu tekan Enter" /></div>
                                        <Button size="sm" className="min-h-11" onClick={scanBarcode}>Gunakan Kode</Button>
                                        <BarcodeLookup items={barcodeItems} onSelect={(item) => applyBarcode(item.code, item.warehouseId)} incoming={incoming} />
                                    </div>
                                </div>
                                <div className="grid items-start gap-4 sm:grid-cols-2">
                                    {!isStock && !isDestroyStock && (
                                        <Field label="Tipe">
                                            <Select value={form.tipe_mutasi} onChange={(event) => set("tipe_mutasi", event.target.value)} error={errors.tipe_mutasi}>
                                                <option>MASUK</option>
                                                <option>KELUAR</option>
                                                <option value="PINDAH">PINDAH GUDANG</option>
                                            </Select>
                                        </Field>
                                    )}
                                    <Field label="Jenis Barang"><Select value={form.jenis_barang} onChange={(event) => {
                                        const jenisBarang = event.target.value;
                                        setForm((previous) => ({ ...previous, jenis_barang: jenisBarang, tipe_gudang: "", id_barang: "", id_gudang: "", id_botol: "", jumlah_botol: "", qty_ml: "" }));
                                        setBarcode("");
                                    }}><option value="BIBIT">Bibit</option><option value="ABSOLUTE">Absolute</option><option value="BOTOL">Botol Kosong</option></Select></Field>
                                    <Field label={incoming ? "Gudang Tujuan" : "Gudang Sumber"}><Select value={form.id_gudang} onChange={(event) => setForm((previous) => ({ ...previous, id_gudang: event.target.value, id_barang: "", id_botol: "" }))}><option value="">Otomatis dari barang</option>{gudang.filter((row) => row.tipe_gudang === (isGudangBotol ? "BOTOL" : "BIBIT")).map((row) => <option key={row.id} value={row.id}>{row.nama_gudang}</option>)}</Select>{errors.id_gudang && <p role="alert" className="text-xs text-red-600">{errors.id_gudang}</p>}</Field>
                                    {incoming && <Field label="Supplier Asal Stok"><Select value={form.id_supplier} onChange={(event) => set("id_supplier", event.target.value)}><option value="">Pilih supplier</option>{suppliers.map((row) => <option key={row.id} value={row.id}>{row.nama_supplier}</option>)}</Select>{errors.id_supplier && <p role="alert" className="text-xs text-red-600">{errors.id_supplier}</p>}</Field>}
                                    {form.tipe_mutasi === "PINDAH" && <Field label="Gudang Tujuan"><Select value={form.id_gudang_tujuan} onChange={(event) => set("id_gudang_tujuan", event.target.value)}><option value="">Pilih gudang tujuan</option>{gudang.filter((row) => row.tipe_gudang === (isGudangBotol ? "BOTOL" : "BIBIT") && Number(row.id) !== Number(form.id_gudang)).map((row) => <option key={row.id} value={row.id}>{row.nama_gudang}</option>)}</Select>{errors.id_gudang_tujuan && <p role="alert" className="text-xs text-red-600">{errors.id_gudang_tujuan}</p>}</Field>}
                                    <div className="sm:col-span-2">
                                        <Field label={isGudangBotol ? "Botol Kosong" : "Barang"}>
                                            {isGudangBotol ? (
                                                <>
                                                    <Select value={form.id_barang} onChange={(event) => selectItem(event.target.value, isGudangBotol)} error={errors.id_barang}>
                                                        <option value="">Pilih botol kosong</option>
                                                        {filteredBotolKosong.map((item) => (
                                                            <option key={item.id} value={item.id}>{item.kode_botol} - {item.nama_botol} — {itemStockLabel(stockDetails(item))}</option>
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
                                                        {filteredBarang.map((item) => <option key={item.id} value={item.id}>{item.kode_barang} - {item.nama_barang} — {itemStockLabel(stockDetails(item))}</option>)}
                                                    </Select>
                                                    {showNoBarangMessage && (
                                                        <p className="mt-1 text-[11px] font-medium text-amber-600">
                                                            Tidak ada barang {isAbsolute ? "Absolute" : "Bibit"} yang sesuai dengan pilihan dan pencarian.
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </Field>
                                        {(selectedBarang || selectedBotolKosong) && <ItemStockInfo details={stockDetails(selectedBarang || selectedBotolKosong)} incoming={incoming} />}
                                    </div>
                                    {(selectedBarang || selectedBotolKosong) && (
                                        <BarcodeField code={isGudangBotol ? selectedBotolKosong?.kode_botol : selectedBarang?.kode_barang} />
                                    )}
                                    {!isGudangBotol && (incoming || !isAbsolute) && (
                                        <Field label="Varian Botol">
                                            <Select value={incoming ? selectedBarang?.id_botol || "" : form.id_botol || ""} disabled={incoming} onChange={(event) => set("id_botol", event.target.value)} error={errors.id_botol}>
                                                <option value="">{incoming ? "Tetapkan varian di Barang Bibit" : form.tipe_mutasi === "PINDAH" ? "Semua varian (FIFO)" : "Stok tanpa varian"}</option>
                                                {botol.map((b) => <option key={b.id} value={b.id}>{b.nama_botol}</option>)}
                                            </Select>
                                        </Field>
                                    )}
                                </div>
                            </section>
                            <section className="space-y-4 rounded-xl border border-stroke p-4">
                                <h3 className="text-sm font-bold text-main">Jumlah & Keterangan</h3>
                                <div className="grid items-start gap-4 sm:grid-cols-2">
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
                                    {incoming && !isGudangBotol && !isAbsolute && <Field label="Total Isi"><Input readOnly value={selectedBottle ? `${number(Number(form.jumlah_botol || 0) * Number(selectedBottle.varian_ml || 0))} ML` : "Pilih barang dan varian terlebih dahulu"} /></Field>}
                                    {isDestroyStock && form.id_gudang && form.id_barang && !isGudangBotol && (
                                        <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                            Sisa stok saat ini untuk <span className="font-semibold">{selectedBottle?.nama_botol || selectedBarang?.nama_barang || 'barang ini'}</span>: <span className="font-semibold">{formatDisplayNumber(availableStockMl)} ML</span>
                                        </div>
                                    )}
                                    {isDestroyStock && isGudangBotol && form.id_gudang && form.id_barang && (
                                        <div className="sm:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                            Sisa stok botol kosong saat ini: <span className="font-semibold">{formatDisplayNumber(bottleStock(selectedBotolKosong))}</span>
                                        </div>
                                    )}
                                    <div className="sm:col-span-2"><Field label="Keterangan"><Textarea value={form.keterangan} onChange={(event) => set("keterangan", event.target.value)} error={errors.keterangan} /></Field></div>
                                </div>
                            </section>
                            <div className="sticky -bottom-5 -mx-6 flex flex-col gap-3 border-t border-stroke bg-card px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs leading-5 text-muted">Stok diperbarui setelah pengajuan disetujui di menu Validasi.</p>
                                <div className="flex shrink-0 justify-end gap-2">
                                    <Button variant="outline" size="sm" type="button" onClick={() => setShowModal(false)}>Batal</Button>
                                    <Button type="submit" size="sm">Ajukan Validasi</Button>
                                </div>
                            </div>
                        </form>
                    </TransactionDialog>
                )}

                <Card className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-sm font-bold text-main">{isMutation ? "Riwayat Mutasi" : isDestroyStock ? "Riwayat Hancur Stok" : mode === "low" ? "Stok Menipis" : "Daftar Stok"}</h2>
                        <span className="rounded-full bg-page px-3 py-1 text-xs font-semibold tabular-nums text-muted">{number(totalRows)} data</span>
                    </div>
                    <div className={`[&_td]:align-top ${supplierRows ? "[&_th:last-child]:text-right" : isMutation ? "[&_th:nth-last-child(-n+2)]:text-right" : "[&_th:nth-last-child(-n+3)]:text-right"}`}>
                        {supplierRows ? <SimpleTable rows={supplierRows} columns={[
                            ...(isMutation ? [{ key: "tanggal", label: "Tanggal" }, { key: "reference", label: "Referensi" }] : []),
                            { key: "kode_barang", label: "Barcode", render: (row) => <span className="block min-w-28 break-all font-mono text-xs">{row.kode_barang || "-"}</span> }, { key: "nama_barang", label: "Barang", render: (row) => <span className="block min-w-36 max-w-64 break-words font-semibold">{row.nama_barang || "-"}</span> },
                            { key: "supplier_name", label: "Supplier Asal" }, { key: "nama_gudang", label: "Gudang" },
                            ...(isMutation ? [{ key: "direction", label: "Arah", render: (row) => movementBadge(row.direction) }] : []),
                            { key: "quantity", label: isMutation ? "Jumlah" : "Stok", render: (row) => quantityCell(row.quantity, row.unit) },
                        ]} /> : (<SimpleTable
                            rows={filteredRows}
                            columns={isMutation ? [
                                { key: "tanggal", label: "Tanggal" },
                                { key: "no_transaksi", label: "No Transaksi" },
                                { key: "barcode", label: "Kode / Barcode", render: (row) => row.barang?.kode_barang || "-" },
                                { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
                                { key: "varian", label: "Varian Botol", render: (row) => row.botol_variant?.nama_botol || row.barang?.botol?.nama_botol || "-" },
                                { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                                { key: "tipe_mutasi", label: "Tipe", render: (row) => movementBadge(row.tipe_mutasi) },
                                { key: "qty_ml", label: "Qty ML", render: (row) => quantityCell(row.qty_ml, "ML") },
                                { key: "stok_sesudah_ml", label: "Stok Akhir", render: (row) => quantityCell(row.stok_sesudah_ml, "ML") },
                            ] : [
                                { key: "barcode", label: "Kode / Barcode", render: (row) => row.barang?.kode_barang || "-" },
                                { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
                                { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                                { key: "varian", label: "Varian Botol", render: (row) => row.botol_variant?.nama_botol || row.barang?.botol?.nama_botol || "-" },
                                { key: "stok_ml", label: "Stok Cairan (ML)", render: (row) => quantityCell(row.stok_ml, "ML") },
                                { key: "stok_botol_isi", label: "Botol Isi", render: (row) => quantityCell(row.stok_botol_isi, "BOTOL") },
                                { key: "minimum_stok_ml", label: "Minimum", render: (row) => quantityCell(row.minimum_stok_ml, "ML") },
                            ]}
                        />)}
                    </div>
                </Card>

            </div>
        </ProtectedLayout>
    );
}

function quantityCell(value, unit) {
    return <span className="block whitespace-nowrap text-right font-semibold tabular-nums">{number(value)}{unit ? <span className="ml-1 text-xs font-normal text-muted">{unit}</span> : null}</span>;
}

function movementBadge(value) {
    return <span className={`inline-flex min-w-20 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold text-white ${value === "MASUK" ? "bg-emerald-700" : value === "KELUAR" ? "bg-red-700" : "bg-slate-600"}`}>{value || "-"}</span>;
}
