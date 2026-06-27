import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React from "react";
import TableUsers from "./table";
import ModalGlobal from "@/components/common/GlobalModal";
import FormUsers from "./form";
import { usePage } from "@inertiajs/react";
import { PageHeader } from "@/admin/business/_components";

const Users = () => {
    const { users, filters = {} } = usePage().props;

    return (
        <ProtectedLayout title={"Data Users"}>
            <div className="space-y-5">
                <PageHeader title="Data Users" />
                <div className="overflow-hidden rounded-2xl border border-stroke shadow-premium" style={{ backgroundColor: "var(--color-card)" }}>
                    <TableUsers users={users} filters={filters} />
                </div>
            </div>

            <ModalGlobal name="users-create" title="Tambah Pengguna">
                <FormUsers modalName="users-create" />
            </ModalGlobal>

            <ModalGlobal name="users-edit" title="Edit Pengguna">
                <FormUsers modalName="users-edit" />
            </ModalGlobal>
        </ProtectedLayout>
    );
};

export default Users;
