import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import {
    Card,
    Field,
    Input,
    Select,
    Textarea,
    submitDelete,
    useFlashMessages,
} from "./_components";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import { IconEdit, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";

const codeByResource = {
    brand: "kode_brand",
    gudang: "kode_gudang",
    supplier: "kode_supplier",
    customer: "kode_customer",
    sales: "kode_sales",
    botol: "kode_botol",
};

export default function MasterPage({ resource, title, rows = [], fields = [] }) {
    useFlashMessages();
    const { errors = {} } = usePage().props;
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});
    const [search, setSearch] = useState("");
    const [perPage, setPerPage] = useState(10);

    const tableRows = Array.isArray(rows) ? rows : rows?.data || [];
    const pagination = !Array.isArray(rows) ? rows : null;

    const doSearch = (value) => setSearch(value);

    // Filter client-side — URL tetap bersih
    const filteredRows = search
        ? tableRows.filter((row) => {
            const code = row[codeByResource[resource]] || "";
            const nama = fields
                .filter((f) => f.name.startsWith("nama_"))
                .map((f) => row[f.name] || "")
                .join(" ");
            return (
                code.toLowerCase().includes(search.toLowerCase()) ||
                nama.toLowerCase().includes(search.toLowerCase())
            );
        })
        : tableRows;

    const changePerPage = (value) => {
        setPerPage(Number(value));
        router.get(
            window.location.pathname,
            { search, per_page: value, page: 1 },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const columns = useMemo(
        () => [
            { key: codeByResource[resource], label: "Kode" },
            ...fields
                .filter((f) => f.name !== "status")
                .slice(0, 4)
                .map((f) => ({ key: f.name, label: f.label })),
            { key: "status", label: "Status" },
        ],
        [fields, resource],
    );

    const emptyForm = () =>
        Object.fromEntries(
            fields.map((f) => [f.name, f.name === "status" ? "AKTIF" : ""]),
        );

    const openCreate = () => {
        setEditing({});
        setForm(emptyForm());
    };

    const openEdit = (row) => {
        setEditing(row);
        setForm(
            Object.fromEntries(
                fields.map((f) => [
                    f.name,
                    row[f.name] ?? (f.name === "status" ? "AKTIF" : ""),
                ]),
            ),
        );
    };

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setEditing(null) };
        if (editing?.id) {
            router.put(`/admin/master/${resource}/${editing.id}`, form, options);
            return;
        }
        router.post(`/admin/master/${resource}`, form, options);
    };

    const closeForm = () => setEditing(null);

    const renderForm = (insideModal = false) => (
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            {fields.map((f, index) => (
                <div
                    key={f.name}
                    className={f.type === "textarea" ? "md:col-span-2" : ""}
                >
                    <Field label={f.label}>
                        {f.type === "select" ? (
                            <Select
                                value={form[f.name] || ""}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        [f.name]: e.target.value.toUpperCase(),
                                    })
                                }
                                error={errors[f.name]}
                            >
                                {f.options.map((o) => (
                                    <option key={o} value={o}>{o}</option>
                                ))}
                            </Select>
                        ) : f.type === "textarea" ? (
                            <Textarea
                                value={form[f.name] || ""}
                                placeholder={insideModal ? `MASUKKAN ${f.label.toUpperCase()}` : undefined}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        [f.name]: e.target.value.toUpperCase(),
                                    })
                                }
                                error={errors[f.name]}
                            />
                        ) : (
                            <Input
                                type={f.type || "text"}
                                value={form[f.name] || ""}
                                error={errors[f.name]}
                                autoFocus={insideModal && index === 0}
                                placeholder={insideModal ? `MASUKKAN ${f.label.toUpperCase()}` : undefined}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        [f.name]: e.target.value.toUpperCase(),
                                    })
                                }
                            />
                        )}
                    </Field>
                </div>
            ))}
            <div className="flex justify-end gap-2 border-t border-stroke pt-4 md:col-span-2">
                <Button type="button" variant="outline" size="sm" onClick={closeForm}>
                    Batal
                </Button>
                <Button type="submit" size="sm">
                    Simpan Data
                </Button>
            </div>
        </form>
    );

    return (
        <ProtectedLayout title={title}>
            <div className="space-y-5">
                {editing !== null && (
                    <Modal
                        title={editing?.id ? `Edit ${title}` : `Tambah ${title}`}
                        onClose={closeForm}
                        width="max-w-2xl"
                        position="center"
                    >
                        {renderForm(true)}
                    </Modal>
                )}

                {/* Table Card */}
                <div className="overflow-hidden rounded-2xl border border-stroke shadow-premium"
                    style={{ backgroundColor: "var(--color-card)" }}>
                    {/* Header */}
                    <div
                        className="flex items-center px-6 py-4"
                        style={{ backgroundColor: "var(--color-card-header, #1e293b)" }}
                    >
                        <h2 className="text-base font-bold text-white">{title}</h2>
                    </div>

                    {/* Toolbar */}
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
                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                        >
                            <IconPlus size={16} />
                            Tambah Data
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-stroke bg-page/60">
                                    {columns.map((c, i) => (
                                        <th
                                            key={`${c.key}-${i}`}
                                            className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-muted"
                                        >
                                            {c.label}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center text-[11px] font-black uppercase tracking-wider text-muted w-28">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stroke/60">
                                {filteredRows.length > 0 ? (
                                    filteredRows.map((row, i) => (
                                        <tr
                                            key={row.id || i}
                                            className={`transition-colors hover:bg-page/60 ${
                                                i % 2 === 1 ? "bg-page/30" : ""
                                            }`}
                                        >
                                            {columns.map((c, j) => (
                                                <td
                                                    key={`${c.key}-${j}`}
                                                    className="px-4 py-2.5 font-medium text-main"
                                                >
                                                    {row[c.key] ?? "-"}
                                                </td>
                                            ))}
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(row)}
                                                        className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90"
                                                    >
                                                        <IconEdit size={13} />
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            submitDelete(
                                                                `/admin/master/${resource}/${row.id}`,
                                                                `Hapus ${row[codeByResource[resource]]}?`,
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-red-700"
                                                    >
                                                        <IconTrash size={13} />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={columns.length + 1}
                                            className="px-4 py-16 text-center"
                                        >
                                            <div className="text-sm font-medium text-muted">
                                                Data belum tersedia
                                            </div>
                                            <div className="mt-1 text-xs text-gray-400">
                                                Belum ada data untuk ditampilkan.
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && (
                        <div className="flex flex-col gap-3 border-t border-stroke px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-center text-[11px] font-semibold text-muted sm:text-left">
                                Menampilkan{" "}
                                <span className="font-bold text-main">
                                    {pagination.from || 0}
                                </span>
                                {" – "}
                                <span className="font-bold text-main">
                                    {pagination.to || 0}
                                </span>{" "}
                                dari{" "}
                                <span className="font-bold text-main">
                                    {pagination.total || 0}
                                </span>{" "}
                                data
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={perPage}
                                    onChange={(e) => changePerPage(e.target.value)}
                                    className="rounded-lg border border-stroke bg-card px-2.5 py-1.5 text-xs font-bold text-main outline-none"
                                >
                                    {[10, 25, 50, 100].map((v) => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                                <span className="text-xs text-muted">per halaman</span>
                                <div className="flex gap-1 ml-3">
                                    <button
                                        type="button"
                                        disabled={pagination.current_page <= 1}
                                        onClick={() =>
                                            router.get(
                                                window.location.pathname,
                                                { search, per_page: perPage, page: pagination.current_page - 1 },
                                                { preserveScroll: true, preserveState: true, replace: true },
                                            )
                                        }
                                        className="rounded-md border border-stroke bg-card px-2.5 py-1.5 text-xs font-bold text-main transition hover:bg-page disabled:opacity-40"
                                    >
                                        «
                                    </button>
                                    <span className="flex items-center px-2 text-xs font-bold text-main">
                                        {pagination.current_page} / {pagination.last_page}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={pagination.current_page >= pagination.last_page}
                                        onClick={() =>
                                            router.get(
                                                window.location.pathname,
                                                { search, per_page: perPage, page: pagination.current_page + 1 },
                                                { preserveScroll: true, preserveState: true, replace: true },
                                            )
                                        }
                                        className="rounded-md border border-stroke bg-card px-2.5 py-1.5 text-xs font-bold text-main transition hover:bg-page disabled:opacity-40"
                                    >
                                        »
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedLayout>
    );
}
