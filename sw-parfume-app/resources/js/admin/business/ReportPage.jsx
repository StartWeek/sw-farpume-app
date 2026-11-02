import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useEffect, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import toast from "react-hot-toast";
import Button from "@/components/common/Button";
import AsyncSelectInput from "@/components/input/AsyncSelectInput";
import { Card, Field, Input, PageHeader, PaginationBar, Select, SimpleTable, formatBusinessDate, money, number, todayDate, useFlashMessages } from "./_components";
import { transactionItemCode } from "./barcode";

const validationStatuses = { PENDING: "Menunggu", APPROVED: "Disetujui", REJECTED: "Ditolak" };
const reportData = (rows) => Array.isArray(rows) ? rows : rows?.data || [];
const reportTotal = (rows) => Array.isArray(rows) ? rows.length : Number(rows?.total || 0);
const grossProfitFilterKeys = ["tanggal_dari", "tanggal_sampai", "id_gudang", "tipe_penjualan"];
const titles = {
    "validasi-transaksi": "Laporan Validasi Transaksi",
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

/* ── Inline SVG Icons ── */

const PdfIcon = ({ size = 18 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 15v-2h2a1.5 1.5 0 0 1 0 3H9zm0 0v2" />
    </svg>
);

const ExcelIcon = ({ size = 18 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
);

const PortraitIcon = ({ size = 14 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    </svg>
);

const LandscapeIcon = ({ size = 14 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
    </svg>
);

export default function ReportPage({ type, rows = [], botolStock = [], botolStockTotal = 0, botolSummary = [], filters = {}, refs = {}, searched = false, reportAvailable, summary = {}, groups = [] }) {
    useFlashMessages();
    useEffect(() => {
        if (searched || typeof reportAvailable !== "boolean") return;
        const options = { id: "report-availability" };
        if (reportAvailable) {
            toast.success("Laporan tersedia sesuai periode dan filter awal. Klik Cari Laporan untuk menampilkan.", options);
        } else {
            toast.error("Laporan tidak tersedia sesuai periode dan filter awal. Coba ubah periode atau filter.", options);
        }
    }, [type, searched, reportAvailable]);
    const { systemDate, errors = {} } = usePage().props;
    const [orientation, setOrientation] = useState("landscape");
    const [form, setForm] = useState({
        tanggal_dari: filters.tanggal_dari ?? (searched ? "" : systemDate || todayDate()),
        tanggal_sampai: filters.tanggal_sampai ?? (searched ? "" : systemDate || todayDate()),
        id_supplier: filters.id_supplier || "",
        id_customer: filters.id_customer || "",
        tipe_gudang: filters.tipe_gudang || "",
        id_gudang: filters.id_gudang || "",
        id_barang: filters.id_barang || "",
        status: filters.status || "",
        validation_type: filters.validation_type || "",
        tipe_mutasi: filters.tipe_mutasi || "",
        tipe_penjualan: filters.tipe_penjualan || "",
        stok_status: filters.stok_status || "",
        jenis_barang: filters.jenis_barang || "",
        id_botol: filters.id_botol || "",
        barcode: filters.barcode || "",
    });
    const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
    const handleGudangTypeChange = (value) => {
        set("tipe_gudang", value);
        set("id_gudang", "");
    };
    const handleGudangChange = (value, option) => {
        set("id_gudang", value);
        if (option) set("tipe_gudang", option.tipe_gudang || "");
    };
    const masterFilter = (resource, field, label, onChange = (value) => set(field, value)) => (
        <ReportMasterSelect
            key={`${type}-${resource}`}
            type={type}
            resource={resource}
            label={label}
            value={form[field]}
            initialRows={refs[resource] || []}
            warehouseType={resource === "gudang" && type !== "laba-kotor" ? form.tipe_gudang : ""}
            onChange={onChange}
        />
    );

    const submit = (event) => {
        event.preventDefault();
        const params = Object.fromEntries(
            Object.entries({ ...(type === "laba-kotor" ? Object.fromEntries(grossProfitFilterKeys.map((key) => [key, form[key]])) : form), search: 1, per_page: rows?.per_page || 10 })
                .filter(([, value]) => value !== "" && value !== null && value !== undefined),
        );

        router.get(window.location.pathname, params, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
            onError: () => toast.error("Filter laporan tidak valid. Periksa pesan di bawah form."),
            onSuccess: (page) => {
                const fetchedRows = page.props.rows || [];
                const hasBottleStock = type === "stok" && reportTotal(page.props.botolStock) > 0;
                const hasBottleSummary = type === "barang-summary" && reportTotal(page.props.botolSummary) > 0;
                if (reportTotal(fetchedRows) > 0 || hasBottleStock || hasBottleSummary) {
                    toast.success("Laporan tersedia.");
                } else {
                    toast.error("Laporan tidak tersedia sesuai periode dan filter yang dipilih.");
                }
            }
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
        if (type === "laba-kotor") {
            for (const key of [...params.keys()]) {
                if (!grossProfitFilterKeys.includes(key)) params.delete(key);
            }
        }
        params.set("export", format);
        params.set("orientation", orientation);
        params.set("search", "1");
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== "" && value != null) params.set(key, String(value));
        });
        ["page", "botol_page", "groups_page", "per_page"].forEach((key) => params.delete(key));
        return `${window.location.pathname}?${params.toString()}`;
    };

    let dynamicSubtitle = "Atur filter lalu tekan Cari Laporan untuk memuat data.";
    if (searched) {
        dynamicSubtitle = `Menampilkan hasil sesuai filter untuk ${titles[type] || "laporan"}.`;
        if (filters.id_supplier) {
            const sup = refs.supplier?.find((s) => String(s.id) === String(filters.id_supplier));
            if (sup) dynamicSubtitle = `Menampilkan laporan untuk Supplier: ${sup.nama_supplier}`;
        } else if (filters.id_customer) {
            const cus = refs.customer?.find((c) => String(c.id) === String(filters.id_customer));
            if (cus) dynamicSubtitle = `Menampilkan laporan untuk Customer: ${cus.nama_customer}`;
        }
    }

    const rowsArray = reportData(rows);
    const summaryFooter = type === "barang-summary" && rowsArray.length > 0 ? (
        <tr className="bg-amber-50 dark:bg-amber-900/20 font-semibold">
            <td className="px-4 py-2 text-center text-[11px] uppercase tracking-widest text-muted" colSpan={3}>GRAND TOTAL</td>
            <td className="px-4 py-2 text-right text-[11px] tabular-nums">{number(summary?.["Total Stok Awal ML"] || 0)}</td>
            <td className="px-4 py-2 text-right text-[11px] tabular-nums">{number(summary?.["Total Masuk ML"] || 0)}</td>
            <td className="px-4 py-2 text-right text-[11px] tabular-nums">{number(summary?.["Total Keluar ML"] || 0)}</td>
            <td className="px-4 py-2 text-right text-[11px] tabular-nums">{number(summary?.["Total Stok Akhir ML"] || 0)}</td>
            <td className="px-4 py-2"></td>
            <td className="px-4 py-2"></td>
            <td className="px-4 py-2"></td>
        </tr>
    ) : null;

    return (
        <ProtectedLayout title={titles[type] || "Laporan"}>
            <div className="space-y-5">
                <PageHeader title={titles[type] || "Laporan"} subtitle={dynamicSubtitle} />
                <Card>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-4">
                            {dateFilters(type, form, set)}
                            {["stok", "mutasi-stok", "barang-summary"].includes(type) && (
                                <Field label="Kode / Barcode">
                                    <Input value={form.barcode} onChange={(event) => set("barcode", event.target.value)} placeholder="Scan atau isi kode lengkap, lalu Cari" />
                                </Field>
                            )}
                            {type === "validasi-transaksi" && <>
                                <Field label="Jenis Transaksi"><Select value={form.validation_type} onChange={(event) => set("validation_type", event.target.value)}><option value="">Semua transaksi</option>{(refs.validation_types || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
                                <Field label="Status Validasi"><Select value={form.status} onChange={(event) => set("status", event.target.value)}><option value="">Semua status</option>{Object.entries(validationStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
                            </>}
                            {type === "pembelian" || type === "hutang" || type === "piutang-supplier" ? (
                                <Field label="Supplier">
                                    {masterFilter("supplier", "id_supplier", "Supplier")}
                                </Field>
                            ) : null}
                            {type === "penjualan" || type === "piutang" ? (
                                <Field label="Customer">
                                    {masterFilter("customer", "id_customer", "Customer")}
                                </Field>
                            ) : null}
                            {["pembelian", "penjualan", "stok", "mutasi-stok", "barang-summary"].includes(type) ? (
                                <Field label="Tipe Gudang">
                                    <Select value={form.tipe_gudang} onChange={(event) => handleGudangTypeChange(event.target.value)}>
                                        <option value="">Semua tipe</option>
                                        <option value="BIBIT">BIBIT</option>
                                        <option value="BOTOL">BOTOL</option>
                                    </Select>
                                </Field>
                            ) : null}
                            {["pembelian", "penjualan", "laba-kotor", "stok", "mutasi-stok", "barang-summary"].includes(type) ? (
                                <Field label="Gudang">
                                    {masterFilter("gudang", "id_gudang", "Gudang", handleGudangChange)}
                                </Field>
                            ) : null}
                            {["pembelian", "penjualan", "stok", "mutasi-stok", "barang-summary"].includes(type) ? (
                                <Field label="Barang">
                                    {masterFilter("barang", "id_barang", "Barang")}
                                </Field>
                            ) : null}
                            {["pembelian", "penjualan", "stok", "mutasi-stok", "barang-summary"].includes(type) ? (
                                <Field label="Jenis Barang">
                                    <Select value={form.jenis_barang} onChange={(event) => { set("jenis_barang", event.target.value); set("id_botol", ""); }}>
                                        <option value="">Semua jenis</option>
                                        <option value="BIBIT">Cairan/Bibit</option>
                                        <option value="ABSOLUTE">Absolute</option>
                                        <option value="BOTOL">Botol Kosong</option>
                                    </Select>
                                </Field>
                            ) : null}
                            {["pembelian", "penjualan", "stok", "mutasi-stok", "barang-summary"].includes(type) ? (
                                <Field label="Varian Botol">
                                    {masterFilter(form.jenis_barang === "BOTOL" ? "botol_kosong" : "botol", "id_botol", "Botol")}
                                </Field>
                            ) : null}
                            {["pembelian", "penjualan"].includes(type) ? (
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
                                        <option value="TERSEDIA">Ada Stok</option>
                                        <option value="HABIS">Stok Habis</option>
                                    </Select>
                                    <p className="text-xs text-muted">Ada Stok: jumlah lebih dari 0. Stok Habis: jumlah 0.</p>
                                </Field>
                            ) : null}
                        </div>

                        {Object.keys(errors).length > 0 && <div role="alert" className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">{Object.entries(errors).map(([key, message]) => <p key={key}>{message}</p>)}</div>}
                        <div className="flex flex-wrap justify-end gap-2">
                            {type === "laba-kotor" && <Button variant="outline" onClick={() => {
                                const date = systemDate || todayDate();
                                setForm((previous) => ({ ...previous, tanggal_dari: date, tanggal_sampai: date }));
                            }}>Hari Ini</Button>}
                            <Button variant="outline" onClick={reset}>Reset</Button>
                            <Button type="submit">Cari Laporan</Button>
                        </div>
                    </form>
                </Card>

                {searched ? (
                    <div className="space-y-3 pb-4">
                        {type === "laba-kotor" && <GrossProfitSummary summary={summary} filters={filters} systemDate={systemDate} />}
                        {type === "kas" && (
                            <>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    {Object.entries(summary).map(([label, value]) => <Card key={label}><p className="text-sm text-muted">{label}</p><p className="mt-2 text-xl font-extrabold tabular-nums text-main">{money(value)}</p></Card>)}
                                </div>
                                <p className="text-xs text-muted">Saldo awal dan akhir mengikuti catatan kas pertama dan terakhir sesuai filter; bukan hanya halaman ini. Jika Jenis Kas dipilih, Kas Masuk/Keluar hanya menjumlahkan jenis tersebut, sedangkan saldo merupakan saldo toko yang tercatat pada transaksi.</p>
                            </>
                        )}
                        {type !== "barang-summary" && reportTotal(rows) === 0 && reportTotal(botolStock) === 0 && reportTotal(groups) === 0 && (
                            <Card className="space-y-2 border-amber-200 text-sm">
                                <h2 className="font-bold text-main">Belum ada data laporan sesuai filter</h2>
                                {type !== "stok" && <p className="text-muted">Periode: {formatBusinessDate(filters.tanggal_dari)} sampai {formatBusinessDate(filters.tanggal_sampai)}. Tanggal kosong berarti tanpa batas tanggal.</p>}
                                <p className="text-muted">Coba perluas periode atau hapus filter, lalu tekan Cari Laporan. Reset mengembalikan periode ke tanggal operasional toko.</p>
                                {type !== "validasi-transaksi" && <p className="text-xs text-muted">Transaksi yang belum disetujui belum masuk ke laporan operasional. Hasil kosong bukan error sistem.</p>}
                            </Card>
                        )}
                        {type === "barang-summary" && reportTotal(rows) === 0 && reportTotal(botolSummary) === 0 && (
                            <Card className="space-y-2 border-amber-200 text-sm">
                                <h2 className="font-bold text-main">Belum ada saldo atau pergerakan stok sesuai filter</h2>
                                <p className="text-muted">Periode: {formatBusinessDate(filters.tanggal_dari)} sampai {formatBusinessDate(filters.tanggal_sampai)}. Coba perluas tanggal atau hapus filter barang/gudang, lalu tekan Cari Laporan.</p>
                                <p className="text-xs text-muted">Periksa juga apakah transaksi sudah disetujui. Hasil kosong bukan berarti seluruh stok gudang habis; gunakan Laporan Stok untuk melihat stok saat ini.</p>
                            </Card>
                        )}
                        {type === "validasi-transaksi" && <>
                            <div className="grid gap-3 sm:grid-cols-3">{Object.entries(summary).map(([label, value]) => <Card key={label}><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-extrabold tabular-nums text-main">{number(value)}</p></Card>)}</div>
                            <p className="text-sm text-muted">Riwayat pengajuan sesuai tanggal operasional. Pengajuan menunggu dan ditolak hanya tampil di laporan validasi; laporan operasional berubah setelah disetujui.</p>
                        </>}
                        {type === "stok" && (
                            <>
                                <Card>
                                    <section aria-labelledby="stock-content-heading" className="space-y-4">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <h2 id="stock-content-heading" className="text-lg font-extrabold text-main">Stok Isi / Cairan</h2>
                                                <p className="mt-1 text-sm text-muted">Stok Inventory dan Pembelian dijumlahkan per barang/barcode di gudang yang sama, dalam mililiter (ML).</p>
                                            </div>
                                        </div>
                                        <SimpleTable rows={rows} columns={columns("stok")} hidePagination />
                                        <p className="text-xs leading-5 text-muted">Buka rincian untuk melihat saldo tiap varian botol. Perkiraan wadah dijumlahkan per catatan varian yang memiliki kapasitas; botol terakhir bisa terisi sebagian. Gudang berbeda tidak digabung.</p>
                                        {!Array.isArray(rows) && rows ? <PaginationBar pagination={rows} /> : null}
                                    </section>
                                </Card>
                                <Card>
                                    <section aria-labelledby="stock-empty-heading" className="space-y-4">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <h2 id="stock-empty-heading" className="text-lg font-extrabold text-main">Stok Botol Kosong</h2>
                                                <p className="mt-1 text-sm text-muted">Persediaan kemasan botol tanpa isi, dicatat dalam buah (PCS).</p>
                                            </div>
                                            <div className="rounded-xl border border-stroke bg-page px-4 py-3">
                                                <div className="text-xs font-bold text-muted">Total botol kosong sesuai filter</div>
                                                <div className="mt-1 text-xl font-extrabold tabular-nums text-main">{number(botolStockTotal)} <span className="text-sm">PCS</span></div>
                                            </div>
                                        </div>
                                        <SimpleTable rows={botolStock} columns={[
                                            { key: "kode_botol", label: "Kode / Barcode" },
                                            { key: "nama_item", label: "Nama Botol Kosong" },
                                            { key: "gudang", label: "Gudang" },
                                            { key: "stok_botol", label: "Stok Kosong (PCS)", render: (row) => <span className="block text-right font-bold tabular-nums">{number(row.stok_botol)}</span> },
                                        ]} hidePagination />
                                        {!Array.isArray(botolStock) && <PaginationBar pagination={botolStock} pageName="botol_page" label="Halaman stok botol kosong" />}
                                    </section>
                                </Card>
                            </>
                        )}

                        {type === "barang-summary" && reportTotal(botolSummary) > 0 && (
                            <Card>
                                <div className="mb-3 text-sm font-bold">Summary Botol Kosong</div>
                                <SimpleTable rows={botolSummary} columns={[
                                    { key: "kode_botol", label: "Kode / Barcode" },
                                    { key: "nama_item", label: "Botol" },
                                    { key: "gudang", label: "Gudang" },
                                    { key: "stok_awal", label: "Stok Awal", render: (row) => number(row.stok_awal) },
                                    { key: "total_masuk", label: "Masuk (PCS)", render: (row) => number(row.total_masuk) },
                                    { key: "total_keluar", label: "Keluar (PCS)", render: (row) => number(row.total_keluar) },
                                    { key: "stok_akhir", label: "Stok Akhir", render: (row) => number(row.stok_akhir) },
                                    { key: "total_mutasi", label: "Transaksi", render: (row) => number(row.total_mutasi) },
                                    { key: "terakhir_mutasi", label: "Terakhir" },
                                ]} hidePagination />
                                {!Array.isArray(botolSummary) && <PaginationBar pagination={botolSummary} pageName="botol_page" label="Halaman summary botol kosong" />}
                            </Card>
                        )}

                        {reportTotal(groups) > 0 && (
                            <Card>
                                <div className="mb-3 text-sm font-bold">Rekap per Customer/Supplier</div>
                                <SimpleTable rows={groups} columns={[
                                    { key: "pihak", label: "Customer/Supplier" },
                                    { key: "total", label: "Total", render: (row) => money(row.total) },
                                    { key: "sisa", label: "Sisa", render: (row) => money(row.sisa) },
                                ]} hidePagination />
                                {!Array.isArray(groups) && <PaginationBar pagination={groups} pageName="groups_page" label="Halaman rekap customer/supplier" />}
                            </Card>
                        )}

                        {/* Main data table — tanpa pagination, pagination render manual di paling bawah */}
                        {type === "laba-kotor" ? (
                            <Card className="space-y-3">
                                <h2 className="text-sm font-bold text-main">Rincian laba per transaksi</h2>
                                <SimpleTable rows={rows} columns={columns(type)} hidePagination />
                            </Card>
                        ) : type !== "stok" && <div className="uppercase"><SimpleTable rows={rows} columns={columns(type)} hidePagination footer={summaryFooter} /></div>}

                        {/* Export Bar & Pagination — sticky di bawah agar selalu terlihat */}
                        <div className="sticky bottom-0 z-30 -mx-1 px-1 py-2 bg-page/95 backdrop-blur-sm border-t border-stroke">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                {/* Orientation Toggle */}
                                <div className="inline-flex items-center rounded-xl border border-stroke overflow-hidden text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setOrientation("portrait")}
                                        aria-pressed={orientation === "portrait"}
                                        className={`inline-flex min-h-10 items-center gap-1.5 px-3 py-2 font-semibold transition-colors ${
                                            orientation === "portrait"
                                                ? "bg-primary text-white"
                                                : "bg-card text-muted hover:text-main hover:bg-page"
                                        }`}
                                    >
                                        <PortraitIcon size={14} />
                                        Portrait
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOrientation("landscape")}
                                        aria-pressed={orientation === "landscape"}
                                        className={`inline-flex min-h-10 items-center gap-1.5 px-3 py-2 font-semibold transition-colors ${
                                            orientation === "landscape"
                                                ? "bg-primary text-white"
                                                : "bg-card text-muted hover:text-main hover:bg-page"
                                        }`}
                                    >
                                        <LandscapeIcon size={14} />
                                        Landscape
                                    </button>
                                </div>

                                {/* Export Buttons */}
                                <div className="flex items-center gap-2">
                                    <a href={exportUrl("pdf")} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 no-underline transition-colors hover:bg-red-100 hover:border-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
                                        <PdfIcon size={16} />
                                        PDF
                                    </a>
                                    <a href={exportUrl("excel")} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-600 no-underline transition-colors hover:bg-green-100 hover:border-green-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
                                        <ExcelIcon size={16} />
                                        Excel
                                    </a>
                                </div>
                            </div>

                            {/* Pagination — posisi paling bawah */}
                            {type !== "stok" && !Array.isArray(rows) && rows ? <PaginationBar pagination={rows} /> : null}
                        </div>
                    </div>
                ) : (
                    <Card className="py-10 text-center text-sm font-semibold text-muted">
                        Pilih periode dan filter, lalu tekan Cari Laporan. Data dan total belum dimuat.
                    </Card>
                )}
            </div>
        </ProtectedLayout>
    );
}

export function GrossProfitSummary({ summary, filters, systemDate }) {
    const profit = Number(summary["Laba Kotor"] || 0);
    const singleDay = Boolean(filters.tanggal_dari && filters.tanggal_dari === filters.tanggal_sampai);
    const period = singleDay ? formatBusinessDate(filters.tanggal_dari)
        : `${filters.tanggal_dari ? formatBusinessDate(filters.tanggal_dari) : "Awal data"} sampai ${filters.tanggal_sampai ? formatBusinessDate(filters.tanggal_sampai) : "Akhir data"}`;
    const title = singleDay ? filters.tanggal_dari === systemDate ? "Laba Kotor Hari Ini" : "Laba Kotor Harian" : "Laba Kotor Periode";
    return (
        <section aria-label="Ringkasan laba kotor" className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-3">
                <Card>
                    <h2 className="text-sm font-bold text-main">{title}</h2>
                    <p className="mt-2 break-words text-xl font-extrabold tabular-nums text-main">{money(profit)}</p>
                    <p className="mt-2 text-xs text-muted">{profit < 0 ? "Rugi kotor" : "Sebelum biaya operasional"}</p>
                    <p className="mt-1 text-xs text-muted">Periode: {period}</p>
                </Card>
                <Card><p className="text-sm font-bold text-main">Penjualan Setelah Diskon</p><p className="mt-2 break-words text-xl font-extrabold tabular-nums">{money(summary["Total Penjualan"])}</p></Card>
                <Card><p className="text-sm font-bold text-main">Modal Barang Terjual (HPP)</p><p className="mt-2 break-words text-xl font-extrabold tabular-nums">{money(summary.Modal)}</p></Card>
            </div>
            <details className="text-xs text-muted">
                <summary className="w-fit cursor-pointer py-2 font-semibold">Cara baca</summary>
                <div className="space-y-1 pb-2">
                    <p>Laba kotor = penjualan setelah diskon - modal barang terjual.</p>
                    <p>Belum laba bersih: biaya operasional belum dikurangi. Penjualan belum lunas tetap termasuk.</p>
                    <p>Total mencakup seluruh hasil filter, bukan hanya halaman ini. Hari Ini memakai tanggal operasional toko; klik Cari Laporan untuk menerapkan.</p>
                </div>
            </details>
        </section>
    );
}

function ReportMasterSelect({ type, resource, label, value, initialRows, warehouseType, onChange }) {
    const mapOption = (row) => {
        const name = row.nama_barang || row.nama_supplier || row.nama_customer || row.nama_gudang || row.nama_botol;
        const code = row.kode_barang || row.kode_botol || row.kode_gudang;
        return { value: String(row.id), label: `${code ? `${code} - ` : ""}${name}${row.tipe_customer ? ` (${row.tipe_customer})` : ""}`, tipe_gudang: row.tipe_gudang };
    };
    const [chosen, setChosen] = useState(null);
    const selected = chosen?.value === String(value) ? chosen : initialRows.find((row) => String(row.id) === String(value));
    const params = new URLSearchParams({ options: resource });
    if (warehouseType) params.set("tipe_gudang", warehouseType);
    return (
        <AsyncSelectInput
            value={value ? (selected?.label ? selected : selected ? mapOption(selected) : null) : null}
            onChange={(option) => { setChosen(option); onChange(option?.value || "", option); }}
            loadOptionsUrl={`/admin/laporan/${type}?${params.toString()}`}
            mapOption={mapOption}
            ariaLabel={label}
            placeholder={resource === "gudang" ? "Semua gudang · klik untuk memilih" : `Semua ${label.toLowerCase()} · ketik untuk mencari`}
            defaultOptions={false}
            cacheOptions={false}
            loadOnMenuOpen={resource === "gudang"}
            minInputLength={1}
            searchDelay={300}
            isClearable
        />
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

function validationTime(value) {
    return value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value)) : "-";
}

function columns(type) {
    if (type === "validasi-transaksi") return [
        { key: "number", label: "No / Tanggal", render: (row) => <><p className="font-bold">{row.number}</p><p className="mt-1 text-xs text-muted">{formatBusinessDate(row.operational_date)}</p></> },
        { key: "type", label: "Transaksi", render: (row) => <><p>{row.snapshot?.label}</p><p className="mt-1 text-xs text-muted">{row.snapshot?.party || "-"}</p><p className="text-xs text-muted">{row.snapshot?.warehouse}</p></> },
        { key: "items", label: "Detail Barang / Barcode", render: (row) => (row.snapshot?.items || []).map((item, index) => <p key={index}>[{item.code || "-"}] {item.name}</p>) },
        { key: "amount", label: "Nilai / Jumlah", render: (row) => row.snapshot?.amount != null ? money(row.snapshot.amount) : (row.snapshot?.items || []).map((item, index) => <p key={index}>{item.name}: {number(item.qty)} {item.unit}</p>) },
        { key: "status", label: "Status", render: (row) => <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${row.status === "APPROVED" ? "bg-green-50 text-green-800" : row.status === "REJECTED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{validationStatuses[row.status]}</span> },
        { key: "submitted_by_name", label: "Pengaju", render: (row) => <>{row.submitted_by_name}<p className="mt-1 text-xs text-muted">{validationTime(row.created_at)}</p></> },
        { key: "reviewed_by_name", label: "Pemeriksa", render: (row) => <>{row.reviewed_by_name || "-"}<p className="mt-1 text-xs text-muted">{validationTime(row.reviewed_at)}</p></> },
        { key: "result", label: "Hasil / Catatan", render: (row) => <><p>{row.result?.number || "-"}</p><p className="mt-1 max-w-56 whitespace-pre-wrap break-words text-xs text-muted">{row.rejection_reason}</p></> },
        { key: "pdf_url", label: "Bukti", render: (row) => <a href={row.receipt_url || row.pdf_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-stroke px-3 py-2 font-bold text-primary">{row.type.startsWith("penjualan-") || row.type === "bayar-piutang" ? "Cetak Slip" : "Bukti PDF"}</a> },
    ];
    if (type === "pembelian") return [
        { key: "no_pembelian", label: "No Pembelian" },
        { key: "supplier", label: "Supplier", render: (row) => row.supplier?.nama_supplier || "-" },
        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
        { key: "total_qty_ml", label: "Qty ML", render: (row) => number(row.total_qty_ml) },
        { key: "total_qty_botol", label: "Qty Botol", render: (row) => number(row.total_qty_botol) },
        { key: "details", label: "Detail Barang", render: detailItems },
        { key: "discount", label: "Diskon", render: (row) => money(row.discount) },
        { key: "total_pembelian", label: "Total", render: (row) => money(row.total_pembelian) },
        { key: "status_pembayaran", label: "Status" },
    ];
    if (type === "laba-kotor") return [
        { key: "tanggal", label: "Tanggal", render: (row) => formatBusinessDate(row.tanggal) },
        { key: "no_penjualan", label: "No Penjualan" },
        { key: "customer", label: "Customer", render: (row) => row.customer?.nama_customer || row.manual_customer_name || "-" },
        { key: "total_penjualan", label: "Penjualan Setelah Diskon", render: (row) => <span className="block text-right tabular-nums">{money(row.total_penjualan)}</span> },
        { key: "total_modal", label: "Modal Barang (HPP)", render: (row) => <span className="block text-right tabular-nums">{money(row.total_modal)}</span> },
        { key: "laba_kotor", label: "Laba Kotor", render: (row) => <span className="block text-right font-bold tabular-nums text-main">{money(row.laba_kotor)}</span> },
    ];
    if (type === "penjualan") return [
        { key: "no_penjualan", label: "No Penjualan" },
        { key: "customer", label: "Customer", render: (row) => row.customer?.nama_customer || "-" },
        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
        { key: "details", label: "Detail Barang", render: detailItems },
        { key: "discount", label: "Diskon", render: (row) => money(row.discount) },
        { key: "total_penjualan", label: "Penjualan", render: (row) => money(row.total_penjualan) },
        { key: "total_modal", label: "Modal", render: (row) => money(row.total_modal) },
        { key: "laba_kotor", label: "Laba", render: (row) => money(row.laba_kotor) },
    ];
    if (type === "stok") return [
        { key: "kode_barang", label: "Kode / Barcode" },
        { key: "nama_item", label: "Barang" },
        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
        { key: "variants", label: "Rincian Varian Botol", render: (row) => (
            <details className="min-w-40">
                <summary className="cursor-pointer rounded font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Lihat rincian ({row.variants.length})</summary>
                <ul className="mt-2 space-y-1 text-sm">
                    {row.variants.map((variant) => <li key={variant.id}>
                        {variant.nama_botol || "-"}: <span className="font-semibold tabular-nums">{number(variant.stok_ml)} ML</span>
                        {variant.varian_ml > 0 && <span className="text-muted"> ({number(variant.stok_botol_isi)} botol)</span>}
                    </li>)}
                </ul>
            </details>
        ) },
        { key: "stok_ml", label: "Jumlah Isi (ML)", render: (row) => <span className="block text-right font-bold tabular-nums">{number(row.stok_ml)} ML</span> },
        { key: "stok_botol_isi", label: "Perkiraan Wadah", render: (row) => <span className="block text-right tabular-nums">{row.has_bottle_capacity ? `${number(row.stok_botol_isi)} botol` : "-"}</span> },
    ];
    if (type === "mutasi-stok") return [
        { key: "tanggal", label: "Tanggal" },
        { key: "no_transaksi", label: "No Transaksi" },
        { key: "barcode", label: "Kode / Barcode", render: (row) => row.barang?.kode_barang || "-" },
        { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
        { key: "tipe_mutasi", label: "Tipe" },
        { key: "qty_ml", label: "Qty ML", render: (row) => number(row.qty_ml) },
    ];
    if (type === "barang-summary") return [
        { key: "barcode", label: "Kode / Barcode", render: (row) => row.barang?.kode_barang || "-" },
        { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
        { key: "stok_awal_ml", label: "Stok Awal", render: (row) => number(row.stok_awal_ml) },
        { key: "total_masuk_ml", label: "Masuk ML", render: (row) => number(row.total_masuk_ml) },
        { key: "total_keluar_ml", label: "Keluar ML", render: (row) => number(row.total_keluar_ml) },
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
        { key: "saldo_awal", label: "Saldo Awal", render: (row) => money(row.saldo_awal) },
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

function detailItems(row) {
    return (row.details || []).map((item) => {
        const name = item.nama_item || item.barang?.nama_barang || item.botol?.nama_botol || "-";
        const code = transactionItemCode(item);
        const qty = Number(item.konversi_qty_dasar || item.qty_ml || 0);
        const unit = item.satuan_dasar || "ML";
        const ml = Number(item.qty_ml || 0);
        const perMl = Number(item.harga_jual_per_ml || item.harga_beli_per_ml || 0);
        return `${code ? `[${code}] ` : ""}${name}: ${number(qty)} ${unit}${unit === "BOTOL" ? ` / ${number(ml)} ML` : ""}${perMl ? ` @ ${money(perMl)}/ML` : ""}`;
    }).join("; ") || "-";
}
