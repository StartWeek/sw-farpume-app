import React, { useState, useRef, useEffect } from "react";
import { Link, useForm, usePage } from "@inertiajs/react";
import {
    IconSearch,
    IconLogout,
    IconUser,
    IconMenu2,
    IconChevronDown,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useSidebarStore } from "@/store/sidebarStore";
import DefaultFoto from "@/assets/images/defaultfoto.jpg";
import { formatBusinessDate } from "@/admin/business/formatters";

export default function Navigation() {
    const { auth, systemDate } = usePage().props;
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const userDropdownRef = useRef(null);
    const { toggleSidebar, searchQuery, setSearchQuery } = useSidebarStore();

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
        <header className="w-full flex h-18 items-center justify-between border-b border-stroke bg-card px-5 shadow-premium transition-colors duration-300">
            {/* Left Side: Toggle & Search */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
                <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-xl cursor-pointer text-main hover:bg-page focus:outline-none transition-colors"
                >
                    <IconMenu2 size={20} />
                </button>

                {/* Search Bar */}
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Search here..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-stroke bg-page py-2 pl-10 pr-4 text-sm text-main transition-all duration-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <IconSearch
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted opacity-50"
                    />
                </div>
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
                        className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors focus:outline-none ${
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
                        <div className="absolute right-0 mt-2 w-52 bg-card rounded-xl shadow-premium-lg border border-stroke py-1.5 z-50 overflow-hidden">
                            <Link
                                href="/profile"
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-main hover:bg-page transition-colors"
                                onClick={() => setShowUserDropdown(false)}
                            >
                                <IconUser size={16} className="text-muted" />
                                <span>Profile</span>
                            </Link>

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
        </header>
    );
}
