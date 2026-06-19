import Button from "@/components/common/Button";
import { useModalGlobal } from "@/store/modalStore";
import { useForm } from "@inertiajs/react";
import React, { useEffect } from "react";
import InertiaTextInput from "@/components/input/RenderTextInput";
import AsyncSelectInput from "@/components/input/AsyncSelectInput";

const defaultValues = {
    username: "",
    name: "",
    role: "admin",
    password: "",
};

const ROLE_OPTIONS = [
    { label: "admin", value: "admin" },
    { label: "superadmin", value: "superadmin" },
    { label: "manager", value: "manager" },
    { label: "kepala_toko", value: "kepala_toko" },
];

const FormUsers = ({ modalName }) => {
    const { data: modalData, isEdit, closeModal } = useModalGlobal(modalName);
    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(defaultValues);

    useEffect(() => {
        if (isEdit && modalData) {
            setData({
                username: modalData.username || "",
                name: modalData.name || "",
                role: modalData.role || "admin",
                password: "",
            });
            return;
        }

        reset();
    }, [isEdit, modalData, setData, reset]);

    const submit = (e) => {
        e.preventDefault();

        const onSuccess = () => {
            reset();
            clearErrors();
            closeModal();
        };

        if (isEdit && modalData?.id) {
            put(`/admin/users/${modalData.id}`, {
                preserveScroll: true,
                onSuccess,
            });
            return;
        }

        post("/admin/users", {
            preserveScroll: true,
            onSuccess,
        });
    };

    const selectedRole =
        ROLE_OPTIONS.find((option) => option.value === data.role) || null;

    return (
        <form onSubmit={submit} className="space-y-4">
            <InertiaTextInput
                name="username"
                label="Username"
                placeholder="Masukkan username"
                value={data.username}
                readOnly={isEdit}
                onChange={(value) => setData("username", value)}
                error={errors.username}
            />

            <InertiaTextInput
                name="name"
                label="Nama"
                placeholder="Masukkan nama lengkap"
                value={data.name}
                onChange={(value) => setData("name", value)}
                error={errors.name}
            />

            <AsyncSelectInput
                label="Role"
                value={selectedRole}
                options={ROLE_OPTIONS}
                onChange={(option) => setData("role", option?.value || "")}
                error={errors.role}
                placeholder="Pilih role user"
                isSearchable={false}
            />

            <InertiaTextInput
                name="password"
                label={`Password ${isEdit ? "(opsional)" : ""}`}
                type="text"
                placeholder={isEdit ? "Kosongkan jika tidak diubah" : "Masukkan password"}
                value={data.password}
                onChange={(value) => setData("password", value)}
                error={errors.password}
            />

            <div className="flex justify-end gap-2 pt-2">
                <Button
                    type="button"
                    variant="default"
                    onClick={closeModal}
                    disabled={processing}
                >
                    Batal
                </Button>
                <Button type="submit" variant="primary" loading={processing}>
                    {isEdit ? "Update" : "Simpan"}
                </Button>
            </div>
        </form>
    );
};

export default FormUsers;
