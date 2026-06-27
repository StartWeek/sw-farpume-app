import Button from "@/components/common/Button";
import { useModalGlobal } from "@/store/modalStore";
import { useForm } from "@inertiajs/react";
import React from "react";
import InertiaTextInput from "@/components/input/RenderTextInput";
import AsyncSelectInput from "@/components/input/AsyncSelectInput";

const defaultValues = {
    username: "",
    name: "",
    role: "admin",
    password: "",
};

const ROLE_OPTIONS = [
    { label: "OWNER", value: "owner" },
    { label: "ADMIN", value: "admin" },
    { label: "MANAGER", value: "manager" },
    { label: "KEPALA TOKO", value: "kepala_toko" },
    { label: "KASIR", value: "kasir" },
];

const FormUsers = ({ modalName }) => {
    const { data: modalData, isEdit, closeModal } = useModalGlobal(modalName);

    const init = isEdit && modalData
        ? {
            username: modalData.username || "",
            name: modalData.name || "",
            role: modalData.role || "admin",
            password: "",
        }
        : { ...defaultValues };

    const { data, setData, post, put, processing, errors, reset } = useForm(init);
    // Reset tidak dipanggil via useEffect — GlobalModal remount komponen tiap buka

    const submit = (e) => {
        e.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => closeModal(),
        };
        if (isEdit && modalData?.id) {
            put(`/admin/users/${modalData.id}`, options);
            return;
        }
        post("/admin/users", options);
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
                onChange={(value) =>
                    setData("username", value.toLocaleUpperCase("id-ID"))
                }
                error={errors.username}
            />

            <InertiaTextInput
                name="name"
                label="Nama"
                placeholder="Masukkan nama lengkap"
                value={data.name}
                onChange={(value) =>
                    setData("name", value.toLocaleUpperCase("id-ID"))
                }
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
