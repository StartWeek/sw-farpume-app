import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import Button from "@/components/common/Button";
import { useForm } from "@inertiajs/react";
import { Card, Field, Input, PageHeader, SimpleTable, Textarea, money, useFlashMessages } from "./_components";

export default function UtilityPage({ operationalDate, rows = [] }) {
    useFlashMessages();
    const { data, setData, post, processing, errors } = useForm({
        tanggal_tutup: operationalDate,
        keterangan: "",
    });

    const submit = (event) => {
        event.preventDefault();
        if (window.confirm(`Tutup toko untuk tanggal ${operationalDate}?`)) post("/admin/utility/tutup-toko");
    };

    return (
        <ProtectedLayout title="Utility">
            <div className="space-y-5">
                <PageHeader title="Utility" subtitle="Tutup hari operasional dan teruskan saldo kas ke hari berikutnya." />
                <Card>
                    <form onSubmit={submit} className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
                        <Field label="Tanggal Operasional">
                            <Input type="date" value={data.tanggal_tutup} readOnly />
                            {errors.tanggal_tutup && <div className="mt-1 text-xs text-red-500">{errors.tanggal_tutup}</div>}
                        </Field>
                        <Field label="Keterangan">
                            <Textarea value={data.keterangan} onChange={(event) => setData("keterangan", event.target.value.toUpperCase())} className="uppercase" />
                        </Field>
                        <Button type="submit" disabled={processing}>Tutup Toko</Button>
                    </form>
                </Card>
                <Card>
                    <SimpleTable rows={rows} columns={[
                        { key: "tanggal_tutup", label: "Tanggal Tutup" },
                        { key: "saldo_awal", label: "Saldo Awal", render: (row) => money(row.saldo_awal) },
                        { key: "saldo_akhir", label: "Saldo Akhir", render: (row) => money(row.saldo_akhir) },
                        { key: "total_penjualan", label: "Penjualan", render: (row) => money(row.total_penjualan) },
                        { key: "total_pembelian", label: "Pembelian", render: (row) => money(row.total_pembelian) },
                        { key: "keterangan", label: "Keterangan" },
                    ]} />
                </Card>
            </div>
        </ProtectedLayout>
    );
}
