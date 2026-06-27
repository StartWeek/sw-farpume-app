import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useState } from "react";
import { router } from "@inertiajs/react";
import Button from "@/components/common/Button";
import {
    Card,
    CurrencyInput,
    Field,
    Input,
    PageHeader,
    RowActions,
    Select,
    SimpleTable,
    money,
    submitDelete,
    useFlashMessages,
} from "./_components";

const emptyForm = {
    nama_barang: "",
    id_brand: "",
    id_botol: "",
    jenis_barang: "BIBIT",
    harga_beli_per_ml: "",
    harga_jual_retail_per_ml: "",
    harga_jual_grosir_per_ml: "",
    harga_beli_per_botol: "",
    harga_jual_per_botol: "",
    minimum_stok_ml: "",
    status: "AKTIF",
};

export default function BarangBibitPage({ rows = [], brand = [], botol = [] }) {
    useFlashMessages();
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const open = (row = null) => {
        setEditing(row || {});
        setForm(row ? { ...emptyForm, ...row } : emptyForm);
    };
    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const submit = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setEditing(null) };
        if (editing?.id) router.put(`/admin/barang-bibit/${editing.id}`, form, options);
        else router.post("/admin/barang-bibit", form, options);
    };

    return (
        <ProtectedLayout title="Barang Bibit">
            <div className="space-y-5">
                <PageHeader title="Barang Bibit" subtitle="Data barang bibit untuk parfum." actionLabel="Tambah Barang" onAction={() => open()} />
                {editing !== null ? (
                    <Card>
                        <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
                            <Field label="Nama Barang">
                                <Input className="uppercase" value={form.nama_barang || ""} onChange={(event) => set("nama_barang", event.target.value.toUpperCase())} placeholder="Nama barang" />
                            </Field>
                            <Field label="Brand">
                                <Select value={form.id_brand || ""} onChange={(event) => set("id_brand", event.target.value)}>
                                    <option value="">Pilih brand</option>
                                    {brand.map((item) => <option key={item.id} value={item.id}>{item.nama_brand}</option>)}
                                </Select>
                            </Field>
                            <Field label="Status">
                                <Select value={form.status || "AKTIF"} onChange={(event) => set("status", event.target.value)}>
                                    <option>AKTIF</option>
                                    <option>NONAKTIF</option>
                                </Select>
                            </Field>
                            <Field label="Jenis Barang">
                                <Select value={form.jenis_barang || "BIBIT"} onChange={(event) => set("jenis_barang", event.target.value)}>
                                    <option value="BIBIT">Bibit</option>
                                    <option value="ABSOLUTE">Absolute</option>
                                </Select>
                            </Field>
                            <Field label="Botol Stok">
                                <Select value={form.id_botol || ""} onChange={(event) => set("id_botol", event.target.value)}>
                                    <option value="">Pilih botol</option>
                                    {botol.map((item) => <option key={item.id} value={item.id}>{item.nama_botol} - {item.varian_ml} ML</option>)}
                                </Select>
                            </Field>
                            <Field label="Harga Beli / ML"><CurrencyInput value={form.harga_beli_per_ml || ""} onChange={(event) => set("harga_beli_per_ml", event.target.value)} /></Field>
                            <Field label="Harga Retail / ML"><CurrencyInput value={form.harga_jual_retail_per_ml || ""} onChange={(event) => set("harga_jual_retail_per_ml", event.target.value)} /></Field>
                            <Field label="Harga Sales / ML"><CurrencyInput value={form.harga_jual_grosir_per_ml || ""} onChange={(event) => set("harga_jual_grosir_per_ml", event.target.value)} /></Field>
                            <Field label="Harga Beli / Botol"><CurrencyInput value={form.harga_beli_per_botol || ""} onChange={(event) => set("harga_beli_per_botol", event.target.value)} /></Field>
                            <Field label="Harga Jual / Botol"><CurrencyInput value={form.harga_jual_per_botol || ""} onChange={(event) => set("harga_jual_per_botol", event.target.value)} /></Field>
                            <Field label="Minimum Stok ML"><Input type="number" value={form.minimum_stok_ml ?? ""} onChange={(event) => set("minimum_stok_ml", event.target.value)} /></Field>
                            <div className="flex justify-end gap-2 md:col-span-3">
                                <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
                                <Button type="submit">Simpan</Button>
                            </div>
                        </form>
                    </Card>
                ) : null}
                <SimpleTable
                    rows={rows}
                    columns={[
                        { key: "kode_barang", label: "Kode" },
                        { key: "nama_barang", label: "Barang" },
                        { key: "jenis_barang", label: "Jenis" },
                        { key: "botol", label: "Botol Stok", render: (row) => row.botol ? `${row.botol.nama_botol} - ${row.botol.varian_ml} ML` : "-" },
                        { key: "harga_beli_per_ml", label: "Beli/ML", render: (row) => money(row.harga_beli_per_ml) },
                        { key: "harga_jual_retail_per_ml", label: "Retail/ML", render: (row) => money(row.harga_jual_retail_per_ml) },
                        { key: "harga_jual_grosir_per_ml", label: "Sales/ML", render: (row) => money(row.harga_jual_grosir_per_ml) },
                        { key: "harga_beli_per_botol", label: "Beli/Botol", render: (row) => money(row.harga_beli_per_botol) },
                        { key: "harga_jual_per_botol", label: "Jual/Botol", render: (row) => money(row.harga_jual_per_botol) },
                        { key: "minimum_stok_ml", label: "Min Stok" },
                        { key: "status", label: "Status" },
                    ]}
                    renderActions={(row) => (
                        <RowActions onEdit={() => open(row)} onDelete={() => submitDelete(`/admin/barang-bibit/${row.id}`, `Hapus ${row.kode_barang}?`)} />
                    )}
                />
            </div>
        </ProtectedLayout>
    );
}
