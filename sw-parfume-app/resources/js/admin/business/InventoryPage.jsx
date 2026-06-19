import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useState } from "react";
import { router } from "@inertiajs/react";
import Button from "@/components/common/Button";
import { Card, Field, Input, PageHeader, Select, SimpleTable, number, useFlashMessages } from "./_components";

export default function InventoryPage({ mode, rows = [], barang = [], gudang = [] }) {
    useFlashMessages();
    const [form, setForm] = useState({ tipe_mutasi: "MASUK", qty_ml: "", id_barang: "", id_gudang: "", keterangan: "" });
    const isMutation = mode === "mutations";
    const title = mode === "low" ? "Stok Menipis" : isMutation ? "Mutasi Stok" : "Stok Gudang";
    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const submit = (event) => {
        event.preventDefault();
        router.post("/admin/mutasi-stok", form, {
            preserveScroll: true,
            onSuccess: () => setForm({ tipe_mutasi: "MASUK", qty_ml: "", id_barang: "", id_gudang: "", keterangan: "" }),
        });
    };

    return (
        <ProtectedLayout title={title}>
            <div className="space-y-5">
                <PageHeader title={title} subtitle="Stok utama memakai satuan ML dan dikonversi otomatis untuk pembelian." />
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
                            <Field label="Qty ML"><Input type="number" value={form.qty_ml} onChange={(event) => set("qty_ml", event.target.value)} /></Field>
                            <Field label="Keterangan"><Input value={form.keterangan} onChange={(event) => set("keterangan", event.target.value)} /></Field>
                            <div className="flex justify-end md:col-span-5"><Button type="submit">Simpan Mutasi</Button></div>
                        </form>
                    </Card>
                ) : null}
                <SimpleTable
                    rows={rows}
                    columns={isMutation ? [
                        { key: "tanggal", label: "Tanggal", render: (row) => row.tanggal || "-" },
                        { key: "no_transaksi", label: "No Transaksi" },
                        { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
                        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                        { key: "tipe_mutasi", label: "Tipe" },
                        { key: "qty_ml", label: "Qty ML", render: (row) => number(row.qty_ml) },
                        { key: "stok_sesudah_ml", label: "Stok Akhir", render: (row) => number(row.stok_sesudah_ml) },
                    ] : [
                        { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
                        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                        { key: "stok_ml", label: "Stok ML", render: (row) => number(row.stok_ml) },
                        { key: "botol_500", label: "Botol 500ML", render: (row) => number(Number(row.stok_ml || 0) / 500) },
                        { key: "liter", label: "Liter", render: (row) => number(Number(row.stok_ml || 0) / 1000) },
                        { key: "minimum_stok_ml", label: "Minimum", render: (row) => number(row.minimum_stok_ml) },
                    ]}
                />
            </div>
        </ProtectedLayout>
    );
}
