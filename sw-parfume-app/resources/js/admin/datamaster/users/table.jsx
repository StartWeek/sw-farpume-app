import DataTable from "@/components/common/DataTable";
import { IconTrash } from "@tabler/icons-react";
import { IconEdit } from "@tabler/icons-react";
import { IconPlus } from "@tabler/icons-react";
import React, { useEffect, useMemo, useState } from "react";
import { useModalGlobal } from "@/store/modalStore";
import { router } from "@inertiajs/react";

const TableUsers = ({ users, filters = {} }) => {
    const { openModal: openCreateModal } = useModalGlobal("users-create");
    const { openModal: openEditModal } = useModalGlobal("users-edit");
    const isServerPaginated =
        !Array.isArray(users) && Array.isArray(users?.data);

    const [search, setSearch] = useState(filters.search || "");
    const [perPage, setPerPage] = useState(filters.per_page || 10);

    const rows = useMemo(() => {
        return Array.isArray(users) ? users : users?.data || [];
    }, [users]);

    const currentPage = users?.current_page || 1;
    const lastPage = users?.last_page || 1;
    const total = users?.total || rows.length;
    const from = users?.from || (rows.length > 0 ? 1 : 0);
    const to = users?.to || rows.length;

    useEffect(() => {
        setSearch(filters.search || "");
        setPerPage(filters.per_page || 10);
    }, [filters.search, filters.per_page]);

    useEffect(() => {
        if (!isServerPaginated) {
            return undefined;
        }

        const timeoutId = setTimeout(() => {
            router.get(
                "/admin/users",
                {
                    search,
                    per_page: perPage,
                    page: 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    preserveUrl: true,
                    only: ["users", "filters"],
                },
            );
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [search, perPage, isServerPaginated]);

    const goToPage = (page) => {
        if (!isServerPaginated) {
            return;
        }

        const nextPage = Math.min(Math.max(page, 1), lastPage);

        router.get(
            "/admin/users",
            {
                search,
                per_page: perPage,
                page: nextPage,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                preserveUrl: true,
                only: ["users", "filters"],
            },
        );
    };

    const handleDelete = (row) => {
        if (!window.confirm(`Hapus user ${row.original.username}?`)) {
            return;
        }

        router.delete(`/admin/users/${row.original.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <DataTable
            title="Daftar Pengguna"
            searchPlaceholder="Cari username, nama, role..."
            pagination={false}
            remote={{
                onSearchChange: setSearch,
                pagination: {
                    currentPage,
                    lastPage,
                    total,
                    from,
                    to,
                    perPage,
                    onPageChange: goToPage,
                    onPerPageChange: setPerPage,
                },
            }}
            columns={[
                { header: "Username", accessorKey: "username" },
                { header: "Name", accessorKey: "name" },
                { header: "Role", accessorKey: "role" },
                {
                    header: "Hak Akses",
                    accessorKey: "akses_menu",
                    cell: ({ row }) =>
                        `${row.original.akses_menu?.length || 0} menu`,
                },
            ]}
            data={rows}
            emptyMessage="Data user belum ada"
            actions={{
                toolbar: [
                    {
                        key: "create",
                        icon: <IconPlus size={18} />,
                        label: "Tambah User",
                        variant: "primary",
                        onClick: () => openCreateModal(),
                    },
                ],
                row: [
                    {
                        key: "edit",
                        icon: <IconEdit size={18} />,
                        label: "Edit",
                        onClick: ({ row }) => openEditModal(row.original, true),
                    },
                    {
                        key: "delete",
                        icon: <IconTrash size={18} />,
                        label: "Hapus",
                        variant: "danger",
                        onClick: ({ row }) => handleDelete(row),
                    },
                ],
            }}
        />
    );
};

export default TableUsers;
