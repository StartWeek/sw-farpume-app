import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useState } from "react";
import { router } from "@inertiajs/react";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import { usePage } from "@inertiajs/react";
import { Field, Input, PageHeader, Select, SimpleTable, number, useFlashMessages } from "./_components";

export default function InventoryPage({ mode, rows = [], barang = [], botol = [], gudang = [], stokGudangMap = {}, botolKosong = [], stokGudangList = [] }) {
    useFlashMessages();
    const { errors: pageErrors } = usePage().props;
    const errors = pageErrors || {};
    const emptyForm = { tipe_mutasi: "MASUK", jumlah_botol: "", qty_ml: "", id_barang: "", id_botol: "", id_gudang: "", tipe_gudang: "", keterangan: "" };
    const [form, setForm] = useState(emptyForm);
    const [showModal, setShowModal] = useState(false);
    const [kodeGudang, setKodeGudang] = useState("");
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

    const visibleGudang = gudang.filter((item) => !form.tipe_gudang || item.tipe_gudang === form.tipe_gudang);
    const selectedBarang = barang.find((item) => item.id === Number(form.id_barang));
    const selectedGudang = visibleGudang.find((item) => item.id === Number(form.id_gudang));
    const isGudangBotol = selectedGudang?.tipe_gudang === 'BOTOL';
    const selectedBotolKosong = isGudangBotol
        ? botolKosong.find((item) => item.id === Number(form.id_barang))
        : null;
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

    const allowedBarangIds = form.id_gudang && !isGudangBotol
        ? barang
            .filter((item) => Number(item.id_gudang) === Number(form.id_gudang))
            .map((item) => Number(item.id))
        : [];

    const filteredBarang = (() => {
        if (form.id_gudang && !isGudangBotol) {
            return barangByType.filter((item) => allowedBarangIds.includes(Number(item.id)));
        }
        return barangByType;
    })();

    const showNoBarangMessage = form.id_gudang && !isGudangBotol && filteredBarang.length === 0;

    // Untuk gudang BOTOL: tampilkan botol kosong yang sesuai dengan gudang terpilih
    const filteredBotolKosong = (() => {
        let items = botolKosong;
        if (isGudangBotol && form.id_gudang) {
            items = items.filter((bk) => String(bk.id_gudang) === String(form.id_gudang));
        }
        // Untuk mutasi KELUAR: hanya tampilkan botol yang masih ada stok
        if (isMutation && form.tipe_mutasi === 'KELUAR') {
            items = items.filter((bk) => Number(bk.stock) > 0);
        }
        return items;
    })();

    const filteredRows = kodeGudang
        ? (Array.isArray(rows) ? rows : rows.data || []).filter((row) => row.barang?.kode_barang?.toLowerCase().includes(kodeGudang.toLowerCase()))
        : rows;

    const openModal = () => {
        setForm(isStock ? { ...emptyForm, tipe_mutasi: "MASUK" } : emptyForm);
        setShowModal(true);
    };

    const submit = (event) => {
        event.preventDefault();
        const payload = isStock ? { ...form, tipe_mutasi: "MASUK" } : isDestroyStock ? { ...form, tipe_mutasi: "KELUAR" } : form;
        delete payload.tipe_gudang;
        const route = isDestroyStock ? "/admin/hancur-stock" : "/admin/mutasi-stok";
        router.post(route, payload, {
            preserveScroll: true,
            onSuccess: () => {
                setShowModal(false);
                setForm(emptyForm);
                setKodeGudang("");
                router.reload({ preserveScroll: true, preserveState: true });
            },
        });
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

                {(isStock || isMutation || isDestroyStock) && (
                    <div className="max-w-xs">
                        <Field label="Kode Gudang">
                            <Input value={kodeGudang} onChange={(event) => setKodeGudang(event.target.value)} placeholder="Cari kode gudang" />
                        </Field>
                    </div>
                )}

                {showModal && (
                    <Modal
                        title={modalTitle}
                        onClose={() => setShowModal(false)}
                        width="max-w-3xl"
                        position="center"
                    >
                        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {errors.items && (
                                <div className="md:col-span-2 lg:col-span-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    {errors.items}
                                </div>
                            )}
                            {(isStock || isMutation || isDestroyStock) && (
                                <Field label="Tipe Gudang">
                                    <Select value={form.tipe_gudang || ""} onChange={(event) => {
                                        set("tipe_gudang", event.target.value);
                                        set("id_gudang", "");
                                        set("id_barang", "");
                                        set("id_botol", "");
                                    }} error={errors.tipe_gudang}>
                                        <option value="">Pilih tipe gudang</option>
                                        <option value="BIBIT">BIBIT</option>
                                        <option value="BOTOL">BOTOL</option>
                                    </Select>
                                </Field>
                            )}
                            <Field label="Gudang">
                                <Select value={form.id_gudang} onChange={(event) => { set("id_gudang", event.target.value); set("id_barang", ""); set("id_botol", ""); }} error={errors.id_gudang}>
                                    <option value="">Pilih gudang</option>
                                    {visibleGudang.map((item) => <option key={item.id} value={item.id}>{item.nama_gudang}</option>)}
                                </Select>
                            </Field>
                            <Field label={isGudangBotol ? "Botol Kosong" : "Barang"}>
                                {isGudangBotol ? (
                                    <>
                                        <Select value={form.id_barang} onChange={(event) => set("id_barang", event.target.value)} error={errors.id_barang}>
                                            <option value="">Pilih botol kosong</option>
                                            {filteredBotolKosong.map((item) => (
                                                <option key={item.id} value={item.id}>{item.kode_botol} - {item.nama_botol} (Stok: {formatDisplayNumber(item.stock)})</option>
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
                                        <Select value={form.id_barang} onChange={(event) => set("id_barang", event.target.value)} error={errors.id_barang}>
                                            <option value="">Pilih barang</option>
                                            {filteredBarang.map((item) => {
                                                const typeInfo = item.jenis_barang === "ABSOLUTE" ? " [Absolute]" : "";
                                                return <option key={item.id} value={item.id}>{item.kode_barang} - {item.nama_barang}{typeInfo}</option>;
                                            })}
                                        </Select>
                                        {showNoBarangMessage && (
                                            <p className="mt-1 text-[11px] font-medium text-amber-600">
                                                {isMutation && form.tipe_mutasi === "KELUAR"
                                                    ? "Tidak ada barang dengan stok di gudang ini."
                                                    : "Tidak ada barang yang terikat ke gudang ini."
                                                }
                                            </p>
                                        )}
                                    </>
                                )}
                            </Field>
                            {!isGudangBotol && selectedBarang?.jenis_barang !== "ABSOLUTE" && (isStock || form.tipe_mutasi === "MASUK") && (
                                <Field label="Varian Botol">
                                    <Select value={form.id_botol || ""} onChange={(event) => set("id_botol", event.target.value)} error={errors.id_botol}>
                                        <option value="">Pilih varian botol</option>
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
                                    Sisa stok botol kosong saat ini: <span className="font-semibold">{formatDisplayNumber(selectedBotolKosong?.stock ?? 0)}</span>
                                </div>
                            )}
                            {!isStock && !isDestroyStock && (
                                <Field label="Tipe">
                                    <Select value={form.tipe_mutasi} onChange={(event) => set("tipe_mutasi", event.target.value)} error={errors.tipe_mutasi}>
                                        <option>MASUK</option>
                                        <option>KELUAR</option>
                                    </Select>
                                </Field>
                            )}
                            {isGudangBotol ? (
                                <Field label="Jumlah Botol"><Input type="number" min="1" value={form.jumlah_botol} onChange={(event) => set("jumlah_botol", event.target.value)} error={errors.jumlah_botol} /></Field>
                            ) : isDestroyStock ? (
                                <Field label="Jumlah Hancur ML">
                                    <Input type="number" min="0.01" step="1" max={availableStockMl || undefined} value={form.qty_ml} onChange={(event) => set("qty_ml", event.target.value)} error={errors.qty_ml} />
                                </Field>
                            ) : isStock || form.tipe_mutasi === "MASUK" ? (
                                <Field label={selectedBarang?.jenis_barang === "ABSOLUTE" ? "Jumlah ML" : "Jumlah Botol"}><Input type="number" min="1" value={form.jumlah_botol} onChange={(event) => set("jumlah_botol", event.target.value)} error={errors.jumlah_botol} /></Field>
                            ) : (
                                <Field label="Jumlah Keluar ML"><Input type="number" min="0.01" step="0.01" value={form.qty_ml} onChange={(event) => set("qty_ml", event.target.value)} error={errors.qty_ml} /></Field>
                            )}
                            <Field label="Keterangan"><Input value={form.keterangan} onChange={(event) => set("keterangan", event.target.value)} error={errors.keterangan} /></Field>
                            <div className="flex justify-end gap-2 border-t border-stroke pt-4 md:col-span-2 lg:col-span-3">
                                <Button variant="outline" size="sm" type="button" onClick={() => setShowModal(false)}>Batal</Button>
                                <Button type="submit" size="sm">{isDestroyStock ? "Simpan Hancur Stock" : isStock ? "Simpan Stok" : "Simpan Mutasi"}</Button>
                            </div>
                        </form>
                    </Modal>
                )}

                <SimpleTable
                    rows={filteredRows}
                    columns={isMutation ? [
                        { key: "tanggal", label: "Tanggal" },
                        { key: "no_transaksi", label: "No Transaksi" },
                        { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
                        { key: "varian", label: "Varian Botol", render: (row) => row.botol_variant?.nama_botol || row.barang?.botol?.nama_botol || "-" },
                        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                        { key: "tipe_mutasi", label: "Tipe" },
                        { key: "qty_ml", label: "Qty ML", render: (row) => number(row.qty_ml) },
                        { key: "stok_sesudah_ml", label: "Stok Akhir", render: (row) => number(row.stok_sesudah_ml) },
                    ] : [
                        { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
                        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                        { key: "varian", label: "Varian Botol", render: (row) => row.botol_variant?.nama_botol || row.barang?.botol?.nama_botol || "-" },
                        { key: "stok_ml", label: "Stok Cairan (ML)", render: (row) => number(row.stok_ml) },
                        { key: "stok_botol_isi", label: "Botol Isi", render: (row) => number(row.stok_botol_isi) },
                        { key: "minimum_stok_ml", label: "Minimum", render: (row) => number(row.minimum_stok_ml) },
                    ]}
                />
            </div>
        </ProtectedLayout>
    );
}
