import { create } from "zustand";

export const useConfirmStore = create((set, get) => ({
    open: false,
    title: "Konfirmasi",
    message: "Apakah Anda yakin?",
    confirmLabel: "Hapus",
    cancelLabel: "Batal",
    variant: "danger",
    resolve: null,

    confirm: (options = {}) =>
        new Promise((resolve) => {
            set({
                open: true,
                title: options.title || "Konfirmasi",
                message: options.message || "Apakah Anda yakin?",
                confirmLabel: options.confirmLabel || "Hapus",
                cancelLabel: options.cancelLabel || "Batal",
                variant: options.variant || "danger",
                resolve,
            });
        }),

    onConfirm: () => {
        const { resolve } = get();
        set({ open: false, resolve: null });
        if (resolve) resolve(true);
    },

    onCancel: () => {
        const { resolve } = get();
        set({ open: false, resolve: null });
        if (resolve) resolve(false);
    },
}));
