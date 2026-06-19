import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React from "react";
import { Card, PageHeader, SimpleTable, money, number, useFlashMessages } from "./_components";

export default function DashboardPage({ metrics = {} }) {
    useFlashMessages();
    const cards = [
        ["Omzet Hari Ini", money(metrics.omzet_hari_ini)],
        ["Pembelian Hari Ini", money(metrics.pembelian_hari_ini)],
        ["Inventory ML", number(metrics.total_inventory_ml)],
        ["Total Piutang", money(metrics.total_piutang)],
        ["Total Hutang", money(metrics.total_hutang)],
        ["Laba Hari Ini", money(metrics.laba_kotor_hari_ini)],
        ["Laba Bulan Ini", money(metrics.laba_kotor_bulan_ini)],
        ["Stok Menipis", number((metrics.stok_menipis || []).length)],
    ];

    return (
        <ProtectedLayout title="Dasbor">
            <div className="space-y-5">
                <PageHeader title="Dasbor Owner" subtitle="Ringkasan omzet, stok, hutang, piutang, dan laba kotor." />
                <div className="grid gap-4 md:grid-cols-4">
                    {cards.map(([label, value]) => (
                        <Card key={label}>
                            <div className="text-[11px] font-bold uppercase tracking-widest text-muted">{label}</div>
                            <div className="mt-2.5 text-xl font-extrabold tracking-tight text-main">{value}</div>
                        </Card>
                    ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <h2 className="mb-4 text-[13px] font-bold uppercase tracking-widest text-muted">Inventory per Gudang</h2>
                        <SimpleTable rows={metrics.inventory_per_gudang || []} columns={[
                            { key: "name", label: "Gudang" },
                            { key: "stok_ml", label: "Stok ML", render: (row) => number(row.stok_ml) },
                        ]} />
                    </Card>
                    <Card>
                        <h2 className="mb-4 text-[13px] font-bold uppercase tracking-widest text-muted">Stok Menipis</h2>
                        <SimpleTable rows={metrics.stok_menipis || []} columns={[
                            { key: "barang", label: "Barang", render: (row) => row.barang?.nama_barang || "-" },
                            { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                            { key: "stok_ml", label: "Stok ML", render: (row) => number(row.stok_ml) },
                        ]} />
                    </Card>
                </div>
            </div>
        </ProtectedLayout>
    );
}
