import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useState } from "react";
import { router } from "@inertiajs/react";
import Button from "@/components/common/Button";
import { Card, Field, Input, PageHeader, Select, SimpleTable, number, useFlashMessages } from "./_components";

export default function InventoryPage({ mode, rows = [], barang = [], gudang = [] }) {
    useFlashMessages();
    const emptyForm = { tipe_mutasi: "MASUK", jumlah_botol: "", qty_ml: "", id_barang: "", id_gudang: "", keterangan: "" };
    const [form, setForm] = useState(emptyForm);
    const isMutation = mode === "mutations";
    const title = mode === "low" ? "Stok Menipis" : isMutation ? "Mutasi Stok" : "Stok Gudang";
    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const submit = (event) => {
        event.preventDefault();
        router.post("/admin/mutasi-stok", form, {
            preserveScroll: true,
            onSuccess: () => setForm(emptyForm),
        });
    };

    return (
        <ProtectedLayout title={title}>
            <div className="space-y-5">
                <PageHeader title={title} subtitle="Stok cairan disimpan per botol isi berdasarkan barang, botol, dan gudang." />
                {isMutation || mode === "stock" ? (
                    <Card>
                        <form onSubmit={submit} className="grid gap-4 md:grid-cols-5">
                            <Field label="Gudang">
                                <Select value={form.id_gudang} onChange={(event) => set("id_gudang", event.target.value)}>
                                    <option value="">Pilih gudang</option>
                                    {gudang.map((item) => <option key={item.id} value={item.id}>{item.nama_gudang}</option>)}
                                </Select>
                            </Field>
                            <Field label="Barang">
                                <Select value={form.id_barang} onChange={(event) => set("id_barang", event.target.value)}>
                                    <option value="">Pilih barang</option>
                                    {barang.map((item) => <option key={item.id} value={item.id}>{item.nama_barang}</option>)}
                                </Select>
                            </Field>
                            <Field label="Tipe">
                                <Select value={form.tipe_mutasi} onChange={(event) => set("tipe_mutasi", event.target.value)}>
                                    <option>MASUK</option>
                                    <option>KELUAR</option>
                                </Select>
                            </Field>
                            {form.tipe_mutasi === "MASUK" ? (
                                <Field label="Jumlah Botol"><Input type="number" min="1" value={form.jumlah_botol} onChange={(event) => set("jumlah_botol", event.target.value)} /></Field>
                            ) : (
                                <Field label="Jumlah Keluar ML"><Input type="number" min="0.01" step="0.01" value={form.qty_ml} onChange={(event) => set("qty_ml", event.target.value)} /></Field>
                            )}
                            <Field label="Keterangan"><Input value={form.keterangan} onChange={(event) => set("keterangan", event.target.value)} /></Field>
                            <div className="flex justify-end md:col-span-5"><Button type="submit">Simpan Mutasi</Button></div>
                        </form>
                    </Card>
                ) : null}
                <SimpleTable
                    rows={rows}
                    columns={isMutation ? [
                        { key: "tanggal", label: "Tanggal" },
                        { key: "no_transaksi", label: "No Transaksi" },
                        { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
                        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                        { key: "tipe_mutasi", label: "Tipe" },
                        { key: "qty_ml", label: "Qty ML", render: (row) => number(row.qty_ml) },
                        { key: "stok_sesudah_ml", label: "Stok Akhir", render: (row) => number(row.stok_sesudah_ml) },
                    ] : [
                        { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
                        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                        { key: "botol", label: "Botol", render: (row) => row.barang?.botol ? `${row.barang.botol.nama_botol} - ${row.barang.botol.varian_ml} ML` : "-" },
                        { key: "stok_ml", label: "Stok ML", render: (row) => number(row.stok_ml) },
                        { key: "stok_botol_isi", label: "Botol Isi", render: (row) => number(row.stok_botol_isi) },
                        { key: "sisa_botol_ml", label: "Sisa Botol Aktif", render: (row) => `${number(row.sisa_botol_ml)} ML` },
                        { key: "minimum_stok_ml", label: "Minimum", render: (row) => number(row.minimum_stok_ml) },
                    ]}
                />
            </div>
        </ProtectedLayout>
    );
}
