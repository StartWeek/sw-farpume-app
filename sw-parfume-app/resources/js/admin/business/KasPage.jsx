import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useState } from "react";
import { router, useForm } from "@inertiajs/react";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import { AnimatePresence } from "framer-motion";
import {
    Card,
    CurrencyInput,
    Field,
    Input,
    PageHeader,
    Select,
    SimpleTable,
    Textarea,
    money,
    todayDate,
    useFlashMessages,
} from "./_components";
import {
    IconArrowDownLeft,
    IconArrowUpRight,
    IconPlus,
    IconWallet,
} from "@tabler/icons-react";
import useTransactionSubmissionOptions from "./useTransactionSubmissionOptions";

export default function KasPage({ rows, operationalDate = todayDate(), summary = {} }) {
    useFlashMessages();
    const submissionOptions = useTransactionSubmissionOptions();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const saldo = Number(summary?.saldo_saat_ini ?? 0);
    const kasMasuk = Number(summary?.kas_masuk_hari_ini ?? 0);
    const kasKeluar = Number(summary?.kas_keluar_hari_ini ?? 0);

    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        tanggal: operationalDate,
        jenis_transaksi: "MASUK",
        jumlah: "",
        pihak: "",
        keterangan: "",
    });

    const openModal = () => {
        reset();
        clearErrors();
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const submit = (e) => {
        e.preventDefault();
        post('/admin/kas', submissionOptions('/admin/kas', {
            onSuccess: () => closeModal(),
        }));
    };

    const columns = [
        { key: "tanggal", label: "Tanggal" },
        { key: "no_transaksi", label: "No Transaksi" },
        {
            key: "jenis_transaksi",
            label: "Jenis",
            render: (row) => (
                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${row.jenis_transaksi === "MASUK" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {row.jenis_transaksi}
                </span>
            ),
        },
        { key: "sumber_transaksi", label: "Sumber" },
        { key: "pihak", label: "Pihak" },
        { key: "keterangan", label: "Keterangan" },
        { key: "kas_masuk", label: "Masuk", render: (row) => <span className="font-bold text-green-600">{money(row.kas_masuk)}</span> },
        { key: "kas_keluar", label: "Keluar", render: (row) => <span className="font-bold text-red-600">{money(row.kas_keluar)}</span> },
        { key: "saldo_akhir", label: "Saldo Akhir", render: (row) => <span className="font-extrabold">{money(row.saldo_akhir)}</span> },
    ];

    return (
        <ProtectedLayout title="Uang Kas">
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <PageHeader
                        title="Uang Kas"
                        subtitle="Pencatatan arus kas operasional toko, pemasukan kasir, dan pengeluaran manual."
                    />
                    <button
                        type="button"
                        onClick={openModal}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
                    >
                        <IconPlus size={18} />
                        Tambah Transaksi Kas
                    </button>
                </div>

                {/* 3 Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card className="flex items-center gap-4">
                        <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${saldo < 0 ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
                            <IconWallet size={24} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                Saldo Kas Saat Ini
                            </span>
                            <div className={`text-xl font-extrabold truncate ${saldo < 0 ? "text-rose-600 dark:text-rose-400" : "text-main"}`}>
                                {money(saldo)}
                            </div>
                            <span className="text-xs text-muted">
                                {saldo < 0 ? "Saldo kas defisit" : "Posisi kas aktif"}
                            </span>
                        </div>
                    </Card>

                    <Card className="flex items-center gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <IconArrowDownLeft size={24} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                Kas Masuk Hari Ini
                            </span>
                            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                                {money(kasMasuk)}
                            </div>
                            <span className="text-xs text-muted">
                                Total arus kas masuk
                            </span>
                        </div>
                    </Card>

                    <Card className="flex items-center gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            <IconArrowUpRight size={24} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                Kas Keluar Hari Ini
                            </span>
                            <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 truncate">
                                {money(kasKeluar)}
                            </div>
                            <span className="text-xs text-muted">
                                Total arus kas keluar
                            </span>
                        </div>
                    </Card>
                </div>

                {/* Table Card */}
                <div className="overflow-hidden rounded-2xl border border-stroke shadow-premium" style={{ backgroundColor: "var(--color-card)" }}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-stroke">
                        <div>
                            <h3 className="text-sm font-bold text-main">Riwayat Mutasi Kas Manual</h3>
                            <p className="text-xs text-muted">Daftar transaksi kas manual tanggal {operationalDate}</p>
                        </div>
                    </div>
                    <SimpleTable columns={columns} rows={rows} />
                </div>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <Modal title="Tambah Transaksi Kas" onClose={closeModal}>
                        <form onSubmit={submit} className="space-y-4">
                            <Field label="Tanggal">
                                <Input
                                    type="date"
                                    value={data.tanggal}
                                    readOnly
                                    required
                                />
                                {errors.tanggal && <div className="mt-1 text-xs text-red-500">{errors.tanggal}</div>}
                            </Field>

                            <Field label="Jenis Transaksi">
                                <Select
                                    value={data.jenis_transaksi}
                                    onChange={(e) => setData("jenis_transaksi", e.target.value)}
                                    searchable={false}
                                >
                                    <option value="MASUK">Pemasukan (Masuk)</option>
                                    <option value="KELUAR">Pengeluaran (Keluar)</option>
                                </Select>
                                {errors.jenis_transaksi && <div className="mt-1 text-xs text-red-500">{errors.jenis_transaksi}</div>}
                            </Field>

                            <Field label="Jumlah Uang (Rp)">
                                <CurrencyInput
                                    value={data.jumlah}
                                    onChange={(e) => setData("jumlah", e.target.value)}
                                    placeholder="Masukkan jumlah uang"
                                    required
                                />
                                {errors.jumlah && <div className="mt-1 text-xs text-red-500">{errors.jumlah}</div>}
                            </Field>

                            <Field label="Pihak (Opsional)">
                                <Input
                                    value={data.pihak}
                                    onChange={(e) => setData("pihak", e.target.value)}
                                    placeholder="Nama orang/perusahaan terkait"
                                />
                                {errors.pihak && <div className="mt-1 text-xs text-red-500">{errors.pihak}</div>}
                            </Field>

                            <Field label="Keterangan">
                                <Textarea
                                    value={data.keterangan}
                                    onChange={(e) => setData("keterangan", e.target.value)}
                                    placeholder="Tambahkan keterangan transaksi"
                                    rows={3}
                                />
                                {errors.keterangan && <div className="mt-1 text-xs text-red-500">{errors.keterangan}</div>}
                            </Field>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={closeModal}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    Ajukan Validasi
                                </Button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>
        </ProtectedLayout>
    );
}
