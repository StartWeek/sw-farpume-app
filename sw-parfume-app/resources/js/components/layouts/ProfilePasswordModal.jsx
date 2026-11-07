import React, { useState } from "react";
import { useForm } from "@inertiajs/react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import {
    IconEye,
    IconEyeOff,
    IconKey,
    IconLock,
    IconShieldCheck,
    IconUser,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import DefaultFoto from "@/assets/images/defaultfoto.jpg";

const ROLE_LABELS = {
    superadmin: "SUPER USER",
    owner: "OWNER",
    admin: "ADMINISTRATOR",
    manager: "MANAGER",
    kepala_toko: "KEPALA TOKO",
    kasir: "KASIR",
};

export default function ProfilePasswordModal({ user, onClose }) {
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    const handleClose = () => {
        reset();
        clearErrors();
        onClose();
    };

    const submit = (e) => {
        e.preventDefault();
        put("/admin/profile/password", {
            preserveScroll: true,
            onSuccess: () => {
                toast.success("Password berhasil diperbarui!");
                handleClose();
            },
            onError: (errs) => {
                if (errs.current_password) {
                    toast.error(errs.current_password);
                } else if (errs.password) {
                    toast.error(errs.password);
                } else {
                    toast.error("Gagal mengubah password. Silakan periksa kembali isian Anda.");
                }
            },
        });
    };

    return (
        <Modal title="Profil & Ubah Password" onClose={handleClose} width="max-w-lg" position="center">
            <div className="space-y-5">
                {/* User Summary Card */}
                <div className="flex items-center gap-3.5 rounded-xl border border-stroke bg-page p-3.5">
                    <img
                        src={
                            user?.profile_photo
                                ? `/storage/${user.profile_photo}`
                                : DefaultFoto
                        }
                        alt="Avatar"
                        className="size-12 rounded-xl border border-stroke object-cover shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-extrabold text-main text-sm truncate">
                                {user?.name || user?.username || "Admin"}
                            </span>
                            <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                                {ROLE_LABELS[user?.role] || user?.role || "USER"}
                            </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted flex items-center gap-1.5">
                            <IconUser size={13} />
                            <span>Username: <strong className="text-main font-semibold">{user?.username || "-"}</strong></span>
                        </div>
                    </div>
                </div>

                {/* Password Change Form */}
                <form onSubmit={submit} className="space-y-4">
                    <div className="border-t border-stroke pt-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-3">
                            <IconLock size={15} className="text-primary" />
                            Ganti Password
                        </h4>

                        {/* Current Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-main">
                                Password Saat Ini <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={data.current_password}
                                    onChange={(e) => setData("current_password", e.target.value)}
                                    placeholder="Masukkan password saat ini"
                                    required
                                    className={`w-full rounded-xl border bg-card px-3.5 py-2.5 pr-10 text-sm text-main outline-none transition focus:ring-2 ${
                                        errors.current_password
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                            : "border-stroke focus:border-primary focus:ring-primary/20"
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main focus:outline-none"
                                    tabIndex={-1}
                                >
                                    {showCurrentPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                                </button>
                            </div>
                            {errors.current_password && (
                                <p className="text-xs text-red-500 mt-1">{errors.current_password}</p>
                            )}
                        </div>

                        {/* New Password */}
                        <div className="space-y-1.5 mt-3">
                            <label className="text-xs font-semibold text-main">
                                Password Baru <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    value={data.password}
                                    onChange={(e) => setData("password", e.target.value)}
                                    placeholder="Minimal 6 karakter"
                                    required
                                    className={`w-full rounded-xl border bg-card px-3.5 py-2.5 pr-10 text-sm text-main outline-none transition focus:ring-2 ${
                                        errors.password
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                            : "border-stroke focus:border-primary focus:ring-primary/20"
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main focus:outline-none"
                                    tabIndex={-1}
                                >
                                    {showNewPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5 mt-3">
                            <label className="text-xs font-semibold text-main">
                                Konfirmasi Password Baru <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={data.password_confirmation}
                                    onChange={(e) => setData("password_confirmation", e.target.value)}
                                    placeholder="Ketik ulang password baru"
                                    required
                                    className={`w-full rounded-xl border bg-card px-3.5 py-2.5 pr-10 text-sm text-main outline-none transition focus:ring-2 ${
                                        errors.password_confirmation
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                            : "border-stroke focus:border-primary focus:ring-primary/20"
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main focus:outline-none"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                                </button>
                            </div>
                            {errors.password_confirmation && (
                                <p className="text-xs text-red-500 mt-1">{errors.password_confirmation}</p>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2.5 border-t border-stroke pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            loading={processing}
                            disabled={processing}
                            className="inline-flex items-center gap-1.5"
                        >
                            <IconKey size={16} />
                            Simpan Password
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

