import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import Button from "@/components/common/Button";
import { PaginationBar, Card, Field, Input, Select, SimpleTable, PageHeader, number } from "./_components";

export default function SupplierStockReportPage({ type, title, filters = {}, rows = [], botolRows = [], searched, suppliers = [], warehouses = [] }) {
    const { errors = {} } = usePage().props;
    const [form, setForm] = useState({ tanggal_dari: filters.tanggal_dari || "", tanggal_sampai: filters.tanggal_sampai || "", id_supplier: filters.id_supplier || "", id_gudang: filters.id_gudang || "", barcode: filters.barcode || "", jenis_barang: filters.jenis_barang || "", stok_status: filters.stok_status || "", tipe_mutasi: filters.tipe_mutasi || "" });
    const [orientation, setOrientation] = useState("landscape");
    const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
    const submit = (event) => { event.preventDefault(); router.get(window.location.pathname, { ...form, search: 1 }, { preserveScroll: true, preserveState: true }); };
    const url = (format) => { const params = new URLSearchParams(window.location.search); params.set("export", format); params.set("orientation", orientation); return `${window.location.pathname}?${params}`; };
    const columns = [
        { key: "kode_barang", label: "Barcode" }, { key: "nama_barang", label: "Barang" },
        { key: "supplier_name", label: "Supplier Asal" }, { key: "nama_gudang", label: "Gudang" },
        { key: "unit", label: "Satuan" },
        ...(type === "barang-summary" ? [{ key: "opening", label: "Awal", render: (row) => number(row.opening) }, { key: "incoming", label: "Masuk", render: (row) => number(row.incoming) }, { key: "outgoing", label: "Keluar", render: (row) => number(row.outgoing) }] : []),
        ...(type === "mutasi-stok" ? [{ key: "tanggal", label: "Tanggal" }, { key: "direction", label: "Arah" }, { key: "reference", label: "Referensi" }] : []),
        { key: "quantity", label: type === "mutasi-stok" ? "Jumlah" : "Stok Akhir", render: (row) => number(row.quantity) },
    ];
    return <ProtectedLayout title={title}><div className="space-y-5"><PageHeader title={title} /><Card><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 md:grid-cols-3">
        {type !== "stok" && <><Field label="Tanggal Dari"><Input type="date" value={form.tanggal_dari} onChange={(e) => set("tanggal_dari", e.target.value)} /></Field><Field label="Tanggal Sampai"><Input type="date" value={form.tanggal_sampai} onChange={(e) => set("tanggal_sampai", e.target.value)} /></Field></>}
        <Field label="Supplier"><Select value={form.id_supplier} onChange={(e) => set("id_supplier", e.target.value)}><option value="">Semua supplier</option>{suppliers.map((row) => <option key={row.id} value={row.id}>{row.nama_supplier}</option>)}</Select></Field>
        <Field label="Gudang"><Select value={form.id_gudang} onChange={(e) => set("id_gudang", e.target.value)}><option value="">Semua gudang</option>{warehouses.map((row) => <option key={row.id} value={row.id}>{row.nama_gudang}</option>)}</Select></Field>
        <Field label="Kode / Barcode"><Input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="Kode barang atau botol" /></Field>
        <Field label="Jenis Barang"><Select value={form.jenis_barang} onChange={(e) => set("jenis_barang", e.target.value)}><option value="">Semua jenis</option><option value="BIBIT">Bibit</option><option value="ABSOLUTE">Absolute</option><option value="BOTOL">Botol Kosong</option></Select></Field>
        {type === "stok" && <Field label="Status Stok"><Select value={form.stok_status} onChange={(e) => set("stok_status", e.target.value)}><option value="">Semua status</option><option value="TERSEDIA">Tersedia</option><option value="HABIS">Habis</option></Select></Field>}
        {type === "mutasi-stok" && <Field label="Arah"><Select value={form.tipe_mutasi} onChange={(e) => set("tipe_mutasi", e.target.value)}><option value="">Semua arah</option><option value="MASUK">Masuk</option><option value="KELUAR">Keluar</option></Select></Field>}
        </div>{Object.entries(errors).map(([key, value]) => <p key={key} role="alert" className="text-sm text-red-600">{value}</p>)}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => router.get(window.location.pathname)}>Reset</Button><Button type="submit">Cari Laporan</Button></div></form></Card>
        {searched ? <><Card><h2 className="mb-3 font-bold text-main">Cairan (ML)</h2><SimpleTable rows={rows} columns={columns} /></Card><Card><h2 className="mb-3 font-bold text-main">Botol Kosong (PCS)</h2><SimpleTable rows={botolRows} columns={columns} hidePagination />{!Array.isArray(botolRows) && <PaginationBar pagination={botolRows} pageName="botol_page" />}</Card><div className="flex flex-wrap items-end justify-end gap-3"><Field label="Orientasi PDF"><Select value={orientation} onChange={(e) => setOrientation(e.target.value)}><option value="landscape">Landscape</option><option value="portrait">Portrait</option></Select></Field><a href={url("pdf")} target="_blank" rel="noreferrer" className="rounded-xl border border-stroke px-4 py-3 font-bold text-primary">PDF</a><a href={url("excel")} className="rounded-xl border border-stroke px-4 py-3 font-bold text-primary">Excel</a></div></> : <Card>Atur filter, lalu klik Cari Laporan.</Card>}
        </div></ProtectedLayout>;
}
