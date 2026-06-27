import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React from "react";
import TableUsers from "./table";
import ModalGlobal from "@/components/common/GlobalModal";
import FormUsers from "./form";
import { usePage } from "@inertiajs/react";
import { IconUsers } from "@tabler/icons-react";

const Users = () => {
    const { users, filters = {} } = usePage().props;

    return (
        <ProtectedLayout title={"Data Users"}>
            <div className="space-y-5">
                <div className="overflow-hidden rounded-2xl border border-stroke shadow-premium" style={{ backgroundColor: "var(--color-card)" }}>
                    <div className="flex items-center px-6 py-4" style={{ backgroundColor: "var(--color-card-header, #1e293b)" }}>
                        <IconUsers size={18} className="text-white mr-3" />
                        <h2 className="text-base font-bold text-white">Data Users</h2>
                    </div>
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
