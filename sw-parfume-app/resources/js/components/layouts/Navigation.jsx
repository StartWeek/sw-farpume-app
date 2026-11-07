import React, { useState, useRef, useEffect } from "react";
import { useForm, usePage } from "@inertiajs/react";
import {
    IconLogout,
    IconUser,
    IconMenu2,
    IconChevronDown,
    IconKey,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { AnimatePresence } from "framer-motion";
import { useSidebarStore } from "@/store/sidebarStore";
import DefaultFoto from "@/assets/images/defaultfoto.jpg";
import { formatBusinessDate } from "@/admin/business/formatters";
import ProfilePasswordModal from "./ProfilePasswordModal";

export default function Navigation() {
    const { auth, systemDate } = usePage().props;
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const userDropdownRef = useRef(null);
    const { toggleSidebar } = useSidebarStore();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                userDropdownRef.current &&
                !userDropdownRef.current.contains(event.target)
            ) {
                setShowUserDropdown(false);
            }
        };

        if (showUserDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showUserDropdown]);

    const { post } = useForm();

    const handleLogout = async (e) => {
        e.preventDefault();

        try {
            await post("/admin/logout");
        } catch (error) {
            toast.error("Logout gagal!");
        }
    };

    return (
        <header className="w-full flex h-18 items-center justify-between border-b border-stroke bg-white px-5 text-main transition-colors duration-300">
            {/* Left Side: Toggle */}
            <div className="flex items-center gap-3">
                <button
                    onClick={toggleSidebar}
                    aria-label="Buka atau tutup menu"
                    className="p-2 rounded-xl cursor-pointer text-muted hover:bg-page hover:text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
                >
                    <IconMenu2 size={20} />
                </button>
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center gap-1">
                <div className="hidden text-right sm:block">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">Tanggal System</div>
                    <div className="text-xs font-extrabold text-main">{formatBusinessDate(systemDate)}</div>
                </div>

                {/* Divider */}
                <div className="mx-2 h-6 w-px bg-stroke" />

                {/* User Avatar + Dropdown */}
                <div className="relative" ref={userDropdownRef}>
                    <button
                        type="button"
                        onClick={() => setShowUserDropdown((v) => !v)}
                        aria-expanded={showUserDropdown}
                        className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            showUserDropdown ? "bg-page" : "hover:bg-page"
                        }`}
                    >
                        <img
                            src={
                                auth?.user?.profile_photo
                                    ? `/storage/${auth?.user?.profile_photo}`
                                    : DefaultFoto
                            }
                            alt="Avatar"
                            className="w-7 h-7 rounded-lg object-cover border border-stroke"
                        />
                        <div className="hidden md:block text-left">
                            <div className="text-xs font-semibold text-main leading-tight">
                                {auth?.user?.username || "Admin"}
                            </div>
                            <div className="text-[10px] text-muted leading-tight">
                                {auth?.user?.user_type === "admin"
                                    ? "Administrator"
                                    : "User"}
                            </div>
                        </div>
                        <IconChevronDown
                            size={14}
                            className={`hidden md:block text-muted transition-transform duration-200 ${
                                showUserDropdown ? "rotate-180" : ""
                            }`}
                        />
                    </button>

                    {showUserDropdown && (
                        <div className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-premium-lg border border-stroke py-1.5 z-50 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUserDropdown(false);
                                    setShowPasswordModal(true);
                                }}
                                className="w-full flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-main hover:bg-page transition-colors text-left"
                            >
                                <IconKey size={16} className="text-primary" />
                                <span>Profil & Ubah Password</span>
                            </button>

                            <hr className="my-1.5 border-stroke" />

                            <button
                                type="button"
                                onClick={(e) => {
                                    setShowUserDropdown(false);
                                    handleLogout(e);
                                }}
                                className="w-full flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50/50 transition-colors text-left"
                            >
                                <IconLogout size={16} />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Profile & Change Password Modal */}
            <AnimatePresence>
                {showPasswordModal && (
                    <ProfilePasswordModal
                        user={auth?.user}
                        onClose={() => setShowPasswordModal(false)}
                    />
                )}
            </AnimatePresence>
        </header>
    );
}
