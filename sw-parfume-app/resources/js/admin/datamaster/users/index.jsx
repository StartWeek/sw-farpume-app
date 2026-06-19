import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React from "react";
import TableUsers from "./table";
import ModalGlobal from "@/components/common/GlobalModal";
import FormUsers from "./form";
import { usePage } from "@inertiajs/react";

const Users = () => {
    const { users, filters = {} } = usePage().props;

    return (
        <ProtectedLayout title={"Data Users"}>
            <TableUsers users={users} filters={filters} />

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
