import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import {
    Card,
    Field,
    Input,
    PageHeader,
    RowActions,
    Select,
    SimpleTable,
    Textarea,
    submitDelete,
    useFlashMessages,
} from "./_components";
import Button from "@/components/common/Button";

const codeByResource = {
    wangi: "kode_wangi",
    brand: "kode_brand",
    gudang: "kode_gudang",
    supplier: "kode_supplier",
    customer: "kode_customer",
    sales: "kode_sales",
};

export default function MasterPage({ resource, title, rows = [], fields = [] }) {
    useFlashMessages();
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});
    const columns = useMemo(
        () => [
            { key: codeByResource[resource], label: "Kode" },
            ...fields
                .filter((field) => field.name !== "status")
                .slice(0, 4)
                .map((field) => ({ key: field.name, label: field.label })),
            { key: "status", label: "Status" },
        ],
        [fields, resource],
    );

    const emptyForm = () =>
        Object.fromEntries(
            fields.map((field) => [
                field.name,
                field.name === "status" ? "AKTIF" : "",
            ]),
        );

    const openCreate = () => {
        setEditing({});
        setForm(emptyForm());
    };

    const openEdit = (row) => {
        setEditing(row);
        setForm(
            Object.fromEntries(
                fields.map((field) => [
                    field.name,
                    row[field.name] ?? (field.name === "status" ? "AKTIF" : ""),
                ]),
            ),
        );
    };

    const submit = (event) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setEditing(null) };
        if (editing?.id) {
            router.put(`/admin/master/${resource}/${editing.id}`, form, options);
            return;
        }
        router.post(`/admin/master/${resource}`, form, options);
    };

    return (
        <ProtectedLayout title={title}>
            <div className="space-y-5">
                <PageHeader
                    title={title}
                    subtitle="Kelola data referensi utama untuk pembelian, penjualan, dan inventory."
                    actionLabel="Tambah Data"
                    onAction={openCreate}
                />

                {editing !== null ? (
                    <Card>
                        <form
                            onSubmit={submit}
                            className="grid gap-4 md:grid-cols-2"
                        >
                            {fields.map((field) => (
                                <Field key={field.name} label={field.label}>
                                    {field.type === "select" ? (
                                        <Select
                                            value={form[field.name] || ""}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    [field.name]:
                                                        event.target.value,
                                                })
                                            }
                                        >
                                            {field.options.map((option) => (
                                                <option
                                                    key={option}
                                                    value={option}
                                                >
                                                    {option}
                                                </option>
                                            ))}
                                        </Select>
                                    ) : field.type === "textarea" ? (
                                        <Textarea
                                            value={form[field.name] || ""}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    [field.name]:
                                                        event.target.value,
                                                })
                                            }
                                        />
                                    ) : (
                                        <Input
                                            type={field.type || "text"}
                                            value={form[field.name] || ""}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    [field.name]:
                                                        event.target.value,
                                                })
                                            }
                                        />
                                    )}
                                </Field>
                            ))}
                            <div className="flex justify-end gap-2 md:col-span-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setEditing(null)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit">Simpan</Button>
                            </div>
                        </form>
                    </Card>
                ) : null}

                <SimpleTable
                    columns={columns}
                    rows={rows}
                    renderActions={(row) => (
                        <RowActions
                            onEdit={() => openEdit(row)}
                            onDelete={() =>
                                submitDelete(
                                    `/admin/master/${resource}/${row.id}`,
                                    `Hapus ${row[codeByResource[resource]]}?`,
                                )
                            }
                        />
                    )}
                />
            </div>
        </ProtectedLayout>
    );
}
