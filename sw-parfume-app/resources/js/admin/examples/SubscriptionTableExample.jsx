import React, { useState } from "react";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import DataTable from "@/components/common/DataTable";
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { createColumnHelper } from "@tanstack/react-table";
import { IconEdit, IconTrash, IconPlus } from "@tabler/icons-react";
import clsx from "clsx";

// Base data used to generate a larger demo dataset
const baseSubscriptions = [
    {
        subscription_id: 1,
        user_name: "Hilliard Touret",
        user_image: null,
        service_name: "Squarespace",
        license_type: "Standard",
        purchase_date: "2025-02-06",
        renewal_date: "2026-06-06",
        amount: "$988.88",
    },
    {
        subscription_id: 2,
        user_name: "Katalin Readshall",
        user_image:
            "https://xsgames.co/randomusers/assets/avatars/female/12.jpg",
        service_name: "Wix",
        license_type: "Standard",
        purchase_date: "2025-04-16",
        renewal_date: "2026-09-16",
        amount: "$951.83",
    },
    {
        subscription_id: 3,
        user_name: "Tonye Perryn",
        user_image: "https://xsgames.co/randomusers/assets/avatars/male/22.jpg",
        service_name: "Fitbit",
        license_type: "Premium",
        purchase_date: "2025-03-13",
        renewal_date: "2026-02-13",
        amount: "$320.72",
    },
    {
        subscription_id: 4,
        user_name: "Ulrick Hendrikse",
        user_image: "https://xsgames.co/randomusers/assets/avatars/male/34.jpg",
        service_name: "Audible",
        license_type: "Creative",
        purchase_date: "2025-03-27",
        renewal_date: "2026-12-27",
        amount: "$467.97",
    },
    {
        subscription_id: 5,
        user_name: "Twila Philps",
        user_image: null,
        service_name: "Headspace",
        license_type: "Standard",
        purchase_date: "2025-04-12",
        renewal_date: "2026-11-12",
        amount: "$736.05",
    },
    {
        subscription_id: 6,
        user_name: "Raul Colam",
        user_image: null,
        service_name: "Kindle Unlimited",
        license_type: "Premium",
        purchase_date: "2025-04-15",
        renewal_date: "2026-04-15",
        amount: "$15.81",
    },
    {
        subscription_id: 7,
        user_name: "Bjorn Osgar",
        user_image: null,
        service_name: "Squarespace",
        license_type: "Standard",
        purchase_date: "2025-04-23",
        renewal_date: "2026-04-23",
        amount: "$619.86",
    },
];

const formatDate = (date) => date.toISOString().split("T")[0];

const initialSubscriptions = Array.from({ length: 100 }, (_, index) => {
    const template = baseSubscriptions[index % baseSubscriptions.length];
    const purchaseDate = new Date(template.purchase_date);
    purchaseDate.setDate(purchaseDate.getDate() + index * 3);

    const renewalDate = new Date(template.renewal_date);
    renewalDate.setDate(renewalDate.getDate() + index * 3);

    return {
        ...template,
        subscription_id: index + 1,
        user_name: `${template.user_name} ${index + 1}`,
        purchase_date: formatDate(purchaseDate),
        renewal_date: formatDate(renewalDate),
    };
});

const columnHelper = createColumnHelper();

const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
});

const parseAmount = (value) => {
    const amount = Number(String(value).replace(/[^\d.-]/g, ""));
    return Number.isFinite(amount) ? amount : 0;
};

const formatDisplayDate = (value) => {
    const date = new Date(value);
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getValidityMeta = (renewalDateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const renewalDate = new Date(renewalDateString);
    renewalDate.setHours(0, 0, 0, 0);

    const daysLeft = Math.ceil((renewalDate - today) / 86400000);
    const normalizedProgress = Math.max(
        0,
        Math.min(100, Math.round((daysLeft / 365) * 100)),
    );

    if (daysLeft < 0) {
        return {
            daysLeft,
            progress: 0,
            color: "error",
            label: "Expired",
            toneClass: "text-red-600",
        };
    }

    if (daysLeft <= 30) {
        return {
            daysLeft,
            progress: normalizedProgress,
            color: "error",
            label: `${daysLeft} days left`,
            toneClass: "text-red-600",
        };
    }

    if (daysLeft <= 90) {
        return {
            daysLeft,
            progress: normalizedProgress,
            color: "warning",
            label: `${daysLeft} days left`,
            toneClass: "text-amber-600",
        };
    }

    return {
        daysLeft,
        progress: normalizedProgress,
        color: "primary",
        label: `${daysLeft} days left`,
        toneClass: "text-primary",
    };
};

export default function SubscriptionTableExample() {
    const [data, setData] = useState(initialSubscriptions);

    const totalSubscriptions = data.length;
    const totalRevenue = data.reduce(
        (sum, item) => sum + parseAmount(item.amount),
        0,
    );
    const expiringSoon = data.filter((item) => {
        const { daysLeft } = getValidityMeta(item.renewal_date);
        return daysLeft >= 0 && daysLeft <= 30;
    }).length;
    const expiredCount = data.filter(
        (item) => getValidityMeta(item.renewal_date).daysLeft < 0,
    ).length;

    const handleDelete = (id) => {
        setData((prev) => prev.filter((item) => item.subscription_id !== id));
    };

    // const handleBulkDelete = (selectedRows) => {
    //     const idsToDelete = selectedRows.map((r) => r.original.subscription_id);
    //     setData((prev) =>
    //         prev.filter((item) => !idsToDelete.includes(item.subscription_id)),
    //     );
    // };

    const columns = [
        columnHelper.accessor("user_name", {
            header: "Client",
            cell: (info) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        name={info.getValue()}
                        size="md"
                        src={info.row.original.user_image}
                        className="rounded-xl"
                    />
                    <div className="min-w-0">
                        <p className="font-semibold text-main text-sm truncate">
                            {info.getValue()}
                        </p>
                        <p className="text-xs text-muted truncate">
                            {info.row.original.service_name}
                        </p>
                    </div>
                </div>
            ),
        }),
        columnHelper.accessor("service_name", {
            header: "Service",
            cell: (info) => (
                <span className="text-main/80 font-medium text-sm">
                    {info.getValue()}
                </span>
            ),
        }),
        columnHelper.accessor("license_type", {
            header: "License",
            cell: (info) => {
                const val = info.getValue();
                const colors = {
                    Standard: "bg-primary/10 text-primary border-primary/20",
                    Premium:
                        "bg-amber-500/10 text-amber-600 border-amber-500/20",
                    Creative:
                        "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20",
                };
                return (
                    <div
                        className={clsx(
                            "inline-flex items-center rounded-lg border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                            colors[val] || "bg-page text-muted border-stroke",
                        )}
                    >
                        {val}
                    </div>
                );
            },
        }),
        columnHelper.accessor("amount", {
            header: "Amount",
            cell: (info) => (
                <span className="font-semibold text-main text-sm">
                    {currencyFormatter.format(parseAmount(info.getValue()))}
                </span>
            ),
        }),
        columnHelper.accessor("purchase_date", {
            header: "Purchase Date",
            cell: (info) => (
                <span className="text-main/70 font-medium text-sm">
                    {formatDisplayDate(info.getValue())}
                </span>
            ),
        }),
        columnHelper.accessor("renewal_date", {
            id: "validity",
            header: "Validity",
            cell: (info) => {
                const validity = getValidityMeta(info.getValue());

                return (
                    <div className="w-40 space-y-1.5">
                        <Progress
                            value={validity.progress}
                            color={validity.color}
                            className="h-2"
                        />
                        <p
                            className={clsx(
                                "text-xs font-semibold",
                                validity.toneClass,
                            )}
                        >
                            {validity.label}
                        </p>
                    </div>
                );
            },
        }),
    ];

    return (
        <ProtectedLayout title="Subscription Table">
            <div className="space-y-6 pb-12">
                <section className="rounded-2xl border border-stroke bg-card p-5 shadow-premium transition-colors">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-main tracking-tight">
                                Subscription Management
                            </h1>
                            <p className="mt-1 text-sm text-muted">
                                Pantau status lisensi, masa aktif, dan nilai
                                langganan dalam satu tampilan.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-xl border border-stroke bg-page px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                                    Total
                                </p>
                                <p className="mt-1 text-sm font-semibold text-main">
                                    {totalSubscriptions}
                                </p>
                            </div>
                            <div className="rounded-xl border border-stroke bg-page px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                                    Revenue
                                </p>
                                <p className="mt-1 text-sm font-semibold text-main">
                                    {currencyFormatter.format(totalRevenue)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700/80">
                                    Expiring Soon
                                </p>
                                <p className="mt-1 text-sm font-semibold text-amber-700">
                                    {expiringSoon}
                                </p>
                            </div>
                            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-700/80">
                                    Expired
                                </p>
                                <p className="mt-1 text-sm font-semibold text-red-700">
                                    {expiredCount}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <div>
                    <DataTable
                        columns={columns}
                        data={data}
                        actions={{
                            toolbar: [
                                {
                                    key: "create",
                                    icon: <IconPlus size={18} />,
                                    label: "Tambah Subscription",
                                    variant: "primary",
                                    onClick: () =>
                                        alert("Aksi tambah subscription"),
                                },
                            ],
                            row: [
                                {
                                    key: "edit",
                                    icon: <IconEdit size={18} />,
                                    label: "Edit",
                                    onClick: ({ row }) =>
                                        alert(`Edit ${row.original.user_name}`),
                                },
                                {
                                    key: "delete",
                                    icon: <IconTrash size={18} />,
                                    label: "Hapus",
                                    variant: "danger",
                                    onClick: ({ row }) =>
                                        handleDelete(
                                            row.original.subscription_id,
                                        ),
                                },
                            ],
                        }}
                    />
                </div>
            </div>
        </ProtectedLayout>
    );
}
