import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useState } from "react";
import { router } from "@inertiajs/react";
import Button from "@/components/common/Button";
import { Card, Field, Input, PageHeader, Select, SimpleTable, money, number, todayDate, useFlashMessages } from "./_components";

const titles = {
    pembelian: "Laporan Pembelian",
    penjualan: "Laporan Penjualan",
    stok: "Laporan Stok",
    "mutasi-stok": "Laporan Mutasi Stok",
    "barang-summary": "Laporan Barang Summary",
    hutang: "Laporan Hutang Supplier",
    piutang: "Laporan Piutang Customer",
    "piutang-supplier": "Laporan Piutang Supplier",
    "laba-kotor": "Laporan Laba Kotor",
    kas: "Laporan Kas",
};

export default function ReportPage({ type, rows = [], filters = {}, refs = {}, searched = false }) {
    useFlashMessages();
    const [form, setForm] = useState({
        tanggal_dari: filters.tanggal_dari || todayDate(),
        tanggal_sampai: filters.tanggal_sampai || todayDate(),
        id_supplier: filters.id_supplier || "",
        id_customer: filters.id_customer || "",
        id_gudang: filters.id_gudang || "",
        id_barang: filters.id_barang || "",
        status: filters.status || "",
        tipe_mutasi: filters.tipe_mutasi || "",
        tipe_penjualan: filters.tipe_penjualan || "",
        stok_status: filters.stok_status || "",
        jenis_barang: filters.jenis_barang || "",
        id_botol: filters.id_botol || "",
    });
    const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

    const submit = (event) => {
        event.preventDefault();
        const params = Object.fromEntries(
            Object.entries({ ...form, search: 1 })
                .filter(([, value]) => value !== "" && value !== null && value !== undefined),
        );

        router.get(window.location.pathname, params, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const reset = () => {
        router.get(window.location.pathname, {}, {
            preserveScroll: true,
            replace: true,
        });
    };

    const exportUrl = (format) => {
        const params = new URLSearchParams(window.location.search);
        params.set("export", format);
        return `${window.location.pathname}?${params.toString()}`;
    };

    return (
        <ProtectedLayout title={titles[type] || "Laporan"}>
            <div className="space-y-5">
                <PageHeader title={titles[type] || "Laporan"} subtitle="Data laporan mengikuti transaksi dan inventory terbaru." />
                <Card>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-4">
                            {dateFilters(type, form, set)}
                            {type === "pembelian" || type === "hutang" || type === "piutang-supplier" ? (
                                <Field label="Supplier">
                                    <Select value={form.id_supplier} onChange={(event) => set("id_supplier", event.target.value)}>
                                        <option value="">Semua supplier</option>
                                        {(refs.supplier || []).map((row) => <option key={row.id} value={row.id}>{row.nama_supplier}</option>)}
                                    </Select>
                                </Field>
                            ) : null}
                            {type === "penjualan" || type === "laba-kotor" || type === "piutang" ? (
                                <Field label="Customer">
                                    <Select value={form.id_customer} onChange={(event) => set("id_customer", event.target.value)}>
                                        <option value="">Semua customer</option>
                                        {(refs.customer || []).map((row) => <option key={row.id} value={row.id}>{row.nama_customer} ({row.tipe_customer})</option>)}
                                    </Select>
                                </Field>
                            ) : null}
                            {["pembelian", "penjualan", "laba-kotor", "stok", "mutasi-stok", "barang-summary"].includes(type) ? (
                                <Field label="Gudang">
                                    <Select value={form.id_gudang} onChange={(event) => set("id_gudang", event.target.value)}>
                                        <option value="">Semua gudang</option>
                                        {(refs.gudang || []).map((row) => <option key={row.id} value={row.id}>{row.nama_gudang}</option>)}
                                    </Select>
                                </Field>
                            ) : null}
                            {["pembelian", "penjualan", "laba-kotor", "stok", "mutasi-stok", "barang-summary"].includes(type) ? (
                                <Field label="Barang">
                                    <Select value={form.id_barang} onChange={(event) => set("id_barang", event.target.value)}>
                                        <option value="">Semua barang</option>
                                        {(refs.barang || []).map((row) => <option key={row.id} value={row.id}>{row.nama_barang}</option>)}
                                    </Select>
                                </Field>
                            ) : null}
                            {type === "stok" ? (
                                <Field label="Jenis Barang">
                                    <Select value={form.jenis_barang} onChange={(event) => set("jenis_barang", event.target.value)}>
                                        <option value="">Semua jenis</option>
                                        <option value="BIBIT">Cairan/Bibit</option>
                                        <option value="ABSOLUTE">Absolute</option>
                                        <option value="BOTOL">Botol</option>
                                    </Select>
                                </Field>
                            ) : null}
                            {type === "stok" ? (
                                <Field label="Varian Botol">
                                    <Select value={form.id_botol} onChange={(event) => set("id_botol", event.target.value)}>
                                        <option value="">Semua botol</option>
                                        {(refs.botol || []).map((row) => <option key={row.id} value={row.id}>{row.nama_botol}</option>)}
                                    </Select>
                                </Field>
                            ) : null}
                            {["pembelian", "penjualan", "laba-kotor"].includes(type) ? (
                                <Field label="Status Bayar">
                                    <Select value={form.status} onChange={(event) => set("status", event.target.value)}>
                                        <option value="">Semua status</option>
                                        <option value="LUNAS">LUNAS</option>
                                        <option value="BELUM_LUNAS">BELUM LUNAS</option>
                                    </Select>
                                </Field>
                            ) : null}
                            {type === "hutang" ? (
                                <Field label="Status Hutang">
                                    <Select value={form.status} onChange={(event) => set("status", event.target.value)}>
                                        <option value="">Semua status</option>
                                        <option value="OPEN">OPEN</option>
                                        <option value="PARTIAL">PARTIAL</option>
                                        <option value="LUNAS">LUNAS</option>
                                    </Select>
                                </Field>
                            ) : null}
                            {type === "kas" ? (
                                <Field label="Jenis Kas">
                                    <Select value={form.status} onChange={(event) => set("status", event.target.value)}>
                                        <option value="">Semua kas</option>
                                        <option value="MASUK">MASUK</option>
                                        <option value="KELUAR">KELUAR</option>
                                    </Select>
                                </Field>
                            ) : null}
                            {type === "piutang" ? (
                                <Field label="Status Piutang">
                                    <Select value={form.status} onChange={(event) => set("status", event.target.value)}>
                                        <option value="">Semua status</option>
                                        <option value="OPEN">OPEN</option>
                                        <option value="PARTIAL">PARTIAL</option>
                                        <option value="LUNAS">LUNAS</option>
                                    </Select>
                                </Field>
                            ) : null}
                            {type === "piutang-supplier" ? (
                                <Field label="Status Piutang Supplier">
                                    <Select value={form.status} onChange={(event) => set("status", event.target.value)}>
                                        <option value="">Semua status</option>
                                        <option value="OPEN">OPEN</option>
                                        <option value="PARTIAL">PARTIAL</option>
                                        <option value="LUNAS">LUNAS</option>
                                    </Select>
                                </Field>
                            ) : null}
                            {["mutasi-stok", "barang-summary"].includes(type) ? (
                                <Field label="Tipe Mutasi">
                                    <Select value={form.tipe_mutasi} onChange={(event) => set("tipe_mutasi", event.target.value)}>
                                        <option value="">Semua mutasi</option>
                                        <option value="MASUK">MASUK</option>
                                        <option value="KELUAR">KELUAR</option>
                                    </Select>
                                </Field>
                            ) : null}
                            {type === "penjualan" || type === "laba-kotor" ? (
                                <Field label="Tipe Penjualan">
                                    <Select value={form.tipe_penjualan} onChange={(event) => set("tipe_penjualan", event.target.value)}>
                                        <option value="">Semua tipe</option>
                                        <option value="RETAIL">RETAIL</option>
                                        <option value="GROSIR">SALES</option>
                                    </Select>
                                </Field>
                            ) : null}
                            {type === "stok" ? (
                                <Field label="Status Stok">
                                    <Select value={form.stok_status} onChange={(event) => set("stok_status", event.target.value)}>
                                        <option value="">Semua stok</option>
                                        <option value="TERSEDIA">TERSEDIA</option>
                                        <option value="MENIPIS">MENIPIS</option>
                                    </Select>
                                </Field>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                            <Button variant="outline" onClick={reset}>Reset</Button>
                            <Button type="submit">Cari Laporan</Button>
                        </div>
                    </form>
                </Card>

                {searched ? (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <a href={exportUrl("pdf")} target="_blank" rel="noreferrer">
                                <Button type="button" variant="outline">
                                    Export PDF
                                </Button>
                            </a>
                            <a href={exportUrl("excel")} target="_blank" rel="noreferrer">
                                <Button type="button" variant="outline">
                                    Export Excel
                                </Button>
                            </a>
                        </div>
                        <SimpleTable rows={rows} columns={columns(type)} />
                    </div>
                ) : (
                    <Card className="py-10 text-center text-sm font-semibold text-muted">
                        Data laporan belum dicari.
                    </Card>
                )}
            </div>
        </ProtectedLayout>
    );
}

function dateFilters(type, form, set) {
    if (type === "stok") return null;

    return (
        <>
            <Field label="Tanggal Dari">
                <Input type="date" value={form.tanggal_dari} onChange={(event) => set("tanggal_dari", event.target.value)} />
            </Field>
            <Field label="Tanggal Sampai">
                <Input type="date" value={form.tanggal_sampai} onChange={(event) => set("tanggal_sampai", event.target.value)} />
            </Field>
        </>
    );
}

function columns(type) {
    if (type === "pembelian") return [
        { key: "no_pembelian", label: "No Pembelian" },
        { key: "supplier", label: "Supplier", render: (row) => row.supplier?.nama_supplier || "-" },
        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
        { key: "total_qty_ml", label: "Qty ML", render: (row) => number(row.total_qty_ml) },
        { key: "total_pembelian", label: "Total", render: (row) => money(row.total_pembelian) },
        { key: "status_pembayaran", label: "Status" },
    ];
    if (type === "penjualan" || type === "laba-kotor") return [
        { key: "no_penjualan", label: "No Penjualan" },
        { key: "customer", label: "Customer", render: (row) => row.customer?.nama_customer || "-" },
        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
        { key: "total_penjualan", label: "Penjualan", render: (row) => money(row.total_penjualan) },
        { key: "total_modal", label: "Modal", render: (row) => money(row.total_modal) },
        { key: "laba_kotor", label: "Laba", render: (row) => money(row.laba_kotor) },
    ];
    if (type === "stok") return [
        { key: "jenis_barang", label: "Jenis" },
        { key: "nama_item", label: "Barang" },
        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
        { key: "stok_ml", label: "Stok ML", render: (row) => row.jenis_barang === "BOTOL" ? "-" : number(row.stok_ml) },
        { key: "liter", label: "Liter/Sisa ML", render: (row) => row.jenis_barang === "BOTOL" ? "-" : `${number(row.liter)} liter ${number(row.sisa_ml)} ml` },
        { key: "stok_botol", label: "Stok Botol", render: (row) => row.jenis_barang === "BOTOL" ? number(row.stok_botol) : "-" },
        { key: "dus", label: "Dus/Sisa Botol", render: (row) => row.jenis_barang === "BOTOL" ? `${number(row.dus)} dus ${number(row.sisa_botol)} botol` : "-" },
        { key: "minimum_stok_ml", label: "Minimum", render: (row) => row.minimum_stok_ml ? number(row.minimum_stok_ml) : "-" },
    ];
    if (type === "mutasi-stok") return [
        { key: "tanggal", label: "Tanggal" },
        { key: "no_transaksi", label: "No Transaksi" },
        { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
        { key: "tipe_mutasi", label: "Tipe" },
        { key: "qty_ml", label: "Qty ML", render: (row) => number(row.qty_ml) },
    ];
    if (type === "barang-summary") return [
        { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
        { key: "total_masuk_ml", label: "Masuk ML", render: (row) => number(row.total_masuk_ml) },
        { key: "total_keluar_ml", label: "Keluar ML", render: (row) => number(row.total_keluar_ml) },
        { key: "selisih_ml", label: "Net ML", render: (row) => number(row.selisih_ml) },
        { key: "stok_akhir_ml", label: "Stok Akhir", render: (row) => number(row.stok_akhir_ml) },
        { key: "minimum_stok_ml", label: "Minimum", render: (row) => number(row.minimum_stok_ml) },
        { key: "total_mutasi", label: "Transaksi", render: (row) => number(row.total_mutasi) },
        { key: "terakhir_mutasi", label: "Terakhir" },
    ];
    if (type === "hutang") return [
        { key: "no_hutang", label: "No Hutang" },
        { key: "supplier", label: "Supplier", render: (row) => row.supplier?.nama_supplier || "-" },
        { key: "total_hutang", label: "Total", render: (row) => money(row.total_hutang) },
        { key: "sisa_hutang", label: "Sisa", render: (row) => money(row.sisa_hutang) },
        { key: "status_hutang", label: "Status" },
    ];
    if (type === "piutang-supplier") return [
        { key: "no_piutang_supplier", label: "No Piutang" },
        { key: "supplier", label: "Supplier", render: (row) => row.supplier?.nama_supplier || "-" },
        { key: "total_piutang", label: "Total", render: (row) => money(row.total_piutang) },
        { key: "sisa_piutang", label: "Sisa", render: (row) => money(row.sisa_piutang) },
        { key: "status_piutang", label: "Status" },
    ];
    if (type === "kas") return [
        { key: "tanggal", label: "Tanggal" },
        { key: "no_transaksi", label: "No Transaksi" },
        { key: "jenis_transaksi", label: "Jenis" },
        { key: "sumber_transaksi", label: "Sumber" },
        { key: "pihak", label: "Customer/Sales/Supplier" },
        { key: "kas_masuk", label: "Kas Masuk", render: (row) => money(row.kas_masuk) },
        { key: "kas_keluar", label: "Kas Keluar", render: (row) => money(row.kas_keluar) },
        { key: "saldo_akhir", label: "Saldo Akhir", render: (row) => money(row.saldo_akhir) },
        { key: "keterangan", label: "Keterangan" },
    ];
    return [
        { key: "no_piutang", label: "No Piutang" },
        { key: "customer", label: "Customer", render: (row) => row.customer?.nama_customer || "-" },
        { key: "total_piutang", label: "Total", render: (row) => money(row.total_piutang) },
        { key: "sisa_piutang", label: "Sisa", render: (row) => money(row.sisa_piutang) },
        { key: "status_piutang", label: "Status" },
    ];
}
