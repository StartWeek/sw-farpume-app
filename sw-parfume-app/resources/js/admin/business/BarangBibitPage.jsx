import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import {
    CurrencyInput,
    Field,
    Input,
    PageHeader,
    RowActions,
    Select,
    SimpleTable,
    money,
    number,
    submitDelete,
    useFlashMessages,
} from "./_components";

const emptyForm = {
    nama_barang: "",
    id_brand: "",
    id_gudang: "",
    tipe_gudang: "",
    jenis_barang: "",
    harga_beli_per_ml: "",
    harga_jual_retail_per_ml: "",
    harga_jual_grosir_per_ml: "",
    minimum_stok_ml: "",
    status: "AKTIF",
};

export default function BarangBibitPage({ rows = [], brand = [], gudang = [] }) {
    useFlashMessages();
    const { errors: pageErrors } = usePage().props;
    const errors = pageErrors || {};
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState("");

    const doSearch = (value) => setSearch(value);

    const tableRows = Array.isArray(rows) ? rows : rows?.data || [];
    const pagination = !Array.isArray(rows) ? rows : null;

    const filteredRows = search
        ? tableRows.filter((row) => {
            const code = (row.kode_barang || "").toLowerCase();
            const nama = (row.nama_barang || "").toLowerCase();
            const s = search.toLowerCase();
            return code.includes(s) || nama.includes(s);
        })
        : tableRows;

    const filteredGudang = form.tipe_gudang
        ? gudang.filter((item) => item.tipe_gudang === form.tipe_gudang)
        : gudang;

    const open = (row = null) => {
        const selectedGudang = row?.gudang || gudang.find((item) => item.id === Number(row?.id_gudang));
        setEditing(row || {});
        setForm(row ? { ...emptyForm, ...row, id_gudang: row?.id_gudang || "", tipe_gudang: selectedGudang?.tipe_gudang || "" } : { ...emptyForm, tipe_gudang: "" });
    };
    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const handleGudangTypeChange = (value) => {
        set("tipe_gudang", value);
        if (form.id_gudang) {
            const currentGudang = gudang.find((item) => item.id === Number(form.id_gudang));
            if (currentGudang && currentGudang.tipe_gudang !== value) {
                set("id_gudang", "");
            }
        }
    };
    const handleGudangChange = (value) => {
        set("id_gudang", value);
        const selected = gudang.find((item) => item.id === Number(value));
        if (selected) {
            set("tipe_gudang", selected.tipe_gudang);
        }
    };
    const submit = (event) => {
        event.preventDefault();
        // Konversi empty string ke null untuk numeric fields — cegah error server
        const payload = { ...form };
        delete payload.tipe_gudang;
        ["harga_beli_per_ml", "harga_jual_retail_per_ml", "harga_jual_grosir_per_ml", "minimum_stok_ml"].forEach((key) => {
            if (payload[key] === "") payload[key] = null;
        });
        const options = {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        };
        if (editing?.id) router.put(`/admin/barang-bibit/${editing.id}`, payload, options);
        else router.post("/admin/barang-bibit", payload, options);
    };

    return (
        <ProtectedLayout title="Barang Bibit">
            <div className="space-y-5">
                <PageHeader title="Barang Bibit" />
                <div className="overflow-hidden rounded-2xl border border-stroke shadow-premium" style={{ backgroundColor: "var(--color-card)" }}>
                    <div className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between border-b border-stroke">
                        <div className="relative">
                            <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                placeholder="CARI DATA"
                                value={search}
                                onChange={(e) => doSearch(e.target.value)}
                                className="h-9 w-full rounded-lg border border-stroke bg-page pl-9 pr-3 text-sm font-medium text-main placeholder:text-muted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-64"
                            />
                        </div>
                        <button type="button" onClick={() => open()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-90">
                            <IconPlus size={16} />
                            Tambah Barang
                        </button>
                    </div>
                {editing !== null && (
                    <Modal
                        title={editing?.id ? "Edit Barang Bibit" : "Tambah Barang Bibit"}
                        onClose={() => setEditing(null)}
                        width="max-w-3xl"
                        position="center"
                    >
                        <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
                            <Field label="Nama Barang">
                                <Input className="uppercase" value={form.nama_barang || ""} onChange={(event) => set("nama_barang", event.target.value.toUpperCase())} placeholder="Masukkan nama barang" error={errors.nama_barang} />
                            </Field>
                            <Field label="Brand">
                                <Select value={form.id_brand || ""} onChange={(event) => set("id_brand", event.target.value)} error={errors.id_brand}>
                                    <option value="">Pilih brand</option>
                                    {brand.map((item) => <option key={item.id} value={item.id}>{item.nama_brand}</option>)}
                                </Select>
                            </Field>
                            <Field label="Tipe Gudang">
                                <Select value={form.tipe_gudang || ""} onChange={(event) => handleGudangTypeChange(event.target.value)} error={errors.tipe_gudang}>
                                    <option value="">Pilih tipe gudang</option>
                                    <option value="BIBIT">BIBIT</option>
                                    <option value="BOTOL">BOTOL</option>
                                </Select>
                            </Field>
                            <Field label="Gudang">
                                <Select value={form.id_gudang || ""} onChange={(event) => handleGudangChange(event.target.value)} error={errors.id_gudang}>
                                    <option value="">Pilih gudang</option>
                                    {filteredGudang.map((item) => <option key={item.id} value={item.id}>{item.nama_gudang}</option>)}
                                </Select>
                            </Field>
                            <Field label="Status">
                                <Select value={form.status || "AKTIF"} onChange={(event) => set("status", event.target.value)} error={errors.status}>
                                    <option>AKTIF</option>
                                    <option>NONAKTIF</option>
                                </Select>
                            </Field>
                            <Field label="Jenis Barang">
                                <Select value={form.jenis_barang || ""} onChange={(event) => set("jenis_barang", event.target.value)} error={errors.jenis_barang}>
                                    <option value="">Pilih jenis</option>
                                    <option value="BIBIT">Bibit</option>
                                    <option value="ABSOLUTE">Absolute</option>
                                </Select>
                            </Field>
                            <Field label="Harga Beli / ML"><CurrencyInput value={form.harga_beli_per_ml || ""} onChange={(event) => set("harga_beli_per_ml", event.target.value)} error={errors.harga_beli_per_ml} /></Field>
                            <Field label="Harga Retail / ML"><CurrencyInput value={form.harga_jual_retail_per_ml || ""} onChange={(event) => set("harga_jual_retail_per_ml", event.target.value)} error={errors.harga_jual_retail_per_ml} /></Field>
                            <Field label="Harga Sales / ML"><CurrencyInput value={form.harga_jual_grosir_per_ml || ""} onChange={(event) => set("harga_jual_grosir_per_ml", event.target.value)} error={errors.harga_jual_grosir_per_ml} /></Field>
                            <Field label="Minimum Stok ML"><CurrencyInput value={form.minimum_stok_ml ?? ""} onChange={(event) => set("minimum_stok_ml", event.target.value)} error={errors.minimum_stok_ml} /></Field>
                            <div className="flex justify-end gap-2 border-t border-stroke pt-4 md:col-span-3">
                                <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Batal</Button>
                                <Button type="submit" size="sm">Simpan Data</Button>
                            </div>
                        </form>
                    </Modal>
                )}
                <SimpleTable
                    rows={search ? filteredRows : rows}
                    columns={[
                        { key: "kode_barang", label: "Kode" },
                        { key: "nama_barang", label: "Barang" },
                        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                        { key: "jenis_barang", label: "Jenis" },
                        { key: "harga_beli_per_ml", label: "Beli/ML", render: (row) => money(row.harga_beli_per_ml) },
                        { key: "harga_jual_retail_per_ml", label: "Retail/ML", render: (row) => money(row.harga_jual_retail_per_ml) },
                        { key: "harga_jual_grosir_per_ml", label: "Sales/ML", render: (row) => money(row.harga_jual_grosir_per_ml) },
                        { key: "minimum_stok_ml", label: "Min Stok", render: (row) => number(row.minimum_stok_ml) },
                        { key: "status", label: "Status" },
                    ]}
                    renderActions={(row) => (
                        <RowActions onEdit={() => open(row)} onDelete={() => submitDelete(`/admin/barang-bibit/${row.id}`, `Hapus ${row.kode_barang}?`)} />
                    )}
                />
                </div>
            </div>
        </ProtectedLayout>
    );
}
