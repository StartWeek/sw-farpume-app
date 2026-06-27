import React, { useEffect } from "react";
import Sidebar from "./Sidebar";
import Navigation from "./Navigation";
import { useIsMobile } from "@/utils/isMobile";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { Head, usePage } from "@inertiajs/react";
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
                        {children}
                    </main>
                </div>
            </div>
            <Toaster position="top-right" reverseOrder={false} />
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
