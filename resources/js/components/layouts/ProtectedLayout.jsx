import React, { useEffect } from "react";
import CustomerSlipModal from "@/admin/business/CustomerSlipModal";
import Sidebar from "./Sidebar";
import Navigation from "./Navigation";
import { useIsMobile } from "@/utils/isMobile";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { Head, Link, usePage } from "@inertiajs/react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useConfirmStore } from "@/store/confirmStore";

export default function ProtectedLayout({ children, title = "Halaman Admin" }) {
    const { open, title: confirmTitle, message, confirmLabel, cancelLabel, variant, onConfirm, onCancel } = useConfirmStore();
    const { flash = {}, errors = {}, csrf_token } = usePage().props;

    useEffect(() => {
        document.title = title;
    }, [title]);

    // Keep CSRF token in sync with the session after session regeneration (login, etc.)
    useEffect(() => {
        if (csrf_token) {
            document.querySelector('meta[name="csrf-token"]')?.setAttribute('content', csrf_token);
        }
    }, [csrf_token]);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
        if (errors.submission_key) {
            toast.error(errors.submission_key, { duration: 8000 });
        }
    }, [flash.success, flash.error, errors]);

    const isMobile = useIsMobile();
    return (
        <>
            <Head title={title} />
            <div className="flex h-screen overflow-hidden bg-page text-main transition-colors duration-300">
                {/* Fixed Sidebar */}
                <Sidebar />

                {/* Main Content Area */}
                <div className={"flex-1 flex flex-col overflow-hidden"}>
                    <Navigation />
                    <main
                        className={`flex-1 overflow-y-auto ${
                            isMobile ? "p-4" : "p-6"
                        } bg-content transition-colors duration-300`}
                    >
                        {errors.submission_key && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"><p className="font-bold">{errors.submission_key}</p><p className="mt-2">Periksa <Link href="/admin/validasi-transaksi" className="font-bold underline">menu Validasi</Link> terlebih dahulu. Muat ulang halaman jika ingin memulai pengajuan baru.</p></div>}
                        {(flash.transactionPdf || (flash.pendingValidation?.receipt_url || flash.pendingValidation?.pdf_url)) && <div className="mb-4 rounded-xl border border-stroke bg-card px-5 py-4 text-sm text-main"><a href={flash.transactionPdf || (flash.pendingValidation.receipt_url || flash.pendingValidation.pdf_url)} target="_blank" rel="noreferrer" className="font-bold text-primary underline">Buka Bukti Transaksi</a><span className="ml-3 text-muted">Gunakan tautan ini jika tab bukti tidak terbuka otomatis.</span></div>}
                        {flash.pendingValidation && (
                            <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950">
                                <div><p className="text-sm font-bold">{flash.pendingValidation.number} · {flash.pendingValidation.status === "APPROVED" ? "Sudah disetujui" : flash.pendingValidation.status === "REJECTED" ? "Ditolak" : "Menunggu validasi"}</p><p className="mt-1 text-xs">{flash.pendingValidation.status === "APPROVED" ? "Pengajuan ini sudah diproses dan masuk laporan." : "Pengajuan yang belum disetujui tidak mengubah stok, kas, hutang/piutang, dan laporan."}</p></div>
                                <Link href="/admin/validasi-transaksi" className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Buka Validasi</Link>
                            </div>
                        )}
                        {children}
                    </main>
                </div>
            </div>
            <Toaster position="top-right" reverseOrder={false} />
            <CustomerSlipModal receiptUrl={flash.transactionPdf || flash.pendingValidation?.receipt_url} />
            <ConfirmDialog
                open={open}
                title={confirmTitle}
                message={message}
                confirmLabel={confirmLabel}
                cancelLabel={cancelLabel}
                variant={variant}
                onConfirm={onConfirm}
                onCancel={onCancel}
            />
        </>
    );
}
