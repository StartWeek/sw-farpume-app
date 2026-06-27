import React, { useEffect } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} [props.confirmLabel='Hapus']
 * @param {string} [props.cancelLabel='Batal']
 * @param {'danger' | 'primary'} [props.variant='danger']
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 */
export default function ConfirmDialog({
    open,
    title = "Konfirmasi",
    message = "Apakah Anda yakin?",
    confirmLabel = "Hapus",
    cancelLabel = "Batal",
    variant = "danger",
    onConfirm,
    onCancel,
}) {
    useEffect(() => {
        if (!open) return;
        const handleEsc = (e) => {
            if (e.key === "Escape") onCancel();
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [open, onCancel]);

    if (!open) return null;

    const confirmClass =
        variant === "danger"
            ? "bg-red-600 hover:bg-red-700 focus:ring-red-500/30"
            : "bg-primary hover:opacity-90 focus:ring-primary/30";

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/50"
                onClick={onCancel}
            />
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-stroke bg-card shadow-2xl">
                <div className="px-6 pt-6 pb-4 text-center">
                    <div
                        className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
                            variant === "danger"
                                ? "bg-red-50 text-red-600"
                                : "bg-primary/10 text-primary"
                        }`}
                    >
                        <IconAlertTriangle size={28} />
                    </div>
                    <h3 className="text-lg font-extrabold text-main">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                        {message}
                    </p>
                </div>
                <div className="flex border-t border-stroke">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 text-sm font-bold text-muted transition hover:bg-page hover:text-main"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-3 text-sm font-bold text-white transition focus:outline-none focus:ring-2 ${confirmClass}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
