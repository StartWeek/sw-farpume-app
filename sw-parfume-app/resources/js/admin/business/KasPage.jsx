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
import { IconPlus } from "@tabler/icons-react";

export default function KasPage({ rows, operationalDate = todayDate() }) {
    useFlashMessages();
    const [isModalOpen, setIsModalOpen] = useState(false);

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
        post('/admin/kas', {
            onSuccess: () => closeModal(),
        });
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
            <div className="space-y-5">
                <PageHeader title="Uang Kas" />
                <div className="overflow-hidden rounded-2xl border border-stroke shadow-premium" style={{ backgroundColor: "var(--color-card)" }}>
                    <div className="flex items-center justify-end px-5 py-3 border-b border-stroke">
                        <button type="button" onClick={openModal} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-90">
                            <IconPlus size={16} />
                            Tambah Transaksi
                        </button>
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
                                    Simpan Transaksi
                                </Button>
                            </div>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>
        </ProtectedLayout>
    );
}
