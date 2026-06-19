import React, { useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import {
    IconLayoutDashboard,
    IconBriefcase,
    IconUsers,
    IconFileText,
    IconX,
    IconUser,
    IconChevronDown,
    IconSettings,
    IconClipboardList,
    IconList,
    IconUserPlus,
    IconShield,
    IconMail,
    IconBell,
    IconWorld,
    IconLock,
    IconKey,
    IconLogout,
    IconUserCircle,
} from "@tabler/icons-react";
import LogoImg from "../../assets/images/logo.jpg";
import AvatarImg from "../../assets/images/Avatar.png";
import DefaultFoto from "../../assets/images/defaultfoto.jpg";
import { useSidebarStore } from "@/store/sidebarStore";
import { useIsMobile } from "@/utils/isMobile";
import { menuAdmin } from "../menu";


export default function Sidebar() {
    const { auth } = usePage().props;
    const { isOpen, setSidebarOpen, searchQuery } = useSidebarStore();
    const isMobile = useIsMobile();

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const userAccess = Array.isArray(auth?.user?.akses_menu)
        ? auth.user.akses_menu
        : [];
    const shouldLimitAccess =
        auth?.user &&
        auth.user.role !== "superadmin" &&
        userAccess.length > 0;
    const isSuperAdmin = auth?.user?.role === "superadmin";

    const filterMenuByAccess = (items) => {
        return items
            .map((item) => {
                if (item.superOnly && !isSuperAdmin) {
                    return null;
                }

                if (!item.children?.length) {
                    if (!shouldLimitAccess) {
                        return item;
                    }

                    return !item.accessKey || userAccess.includes(item.accessKey)
                        ? item
                        : null;
                }

                const children = item.children.filter(
                    (child) =>
                        (!child.superOnly || isSuperAdmin) &&
                        (!shouldLimitAccess ||
                            !child.accessKey ||
                            userAccess.includes(child.accessKey)),
                );

                if (children.length > 0) {
                    return { ...item, children };
                }

                return null;
            })
            .filter(Boolean);
    };

    const filterMenuTree = (items) => {
        if (!normalizedQuery) {
            return items;
        }

        return items
            .map((item) => {
                const itemLabel = (item.label || "").toLowerCase();
                const itemMatches = itemLabel.includes(normalizedQuery);

                if (!item.children?.length) {
                    return itemMatches ? item : null;
                }

                const filteredChildren = item.children.filter((child) =>
                    (child.label || "").toLowerCase().includes(normalizedQuery),
                );

                if (itemMatches || filteredChildren.length > 0) {
                    return {
                        ...item,
                        children: itemMatches
                            ? item.children
                            : filteredChildren,
                    };
                }

                return null;
            })
            .filter(Boolean);
    };

    const menuData = filterMenuTree(filterMenuByAccess(menuAdmin));

    const url = window.location.pathname;

    const isActive = (href) => {
        return url === href || url?.startsWith(`${href}/`);
    };

    const handleMenuClick = () => {
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    // Mobile Overlay
    if (isMobile && isOpen) {
        return (
            <>
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setSidebarOpen(false)}
                />
                <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-emerald-950/70 bg-[linear-gradient(165deg,#071f1d_0%,#102d2b_42%,#1f2a24_100%)] text-stone-100 shadow-premium transition-transform duration-300 transform translate-x-0">
                    <SidebarContent
                        auth={auth}
                        menuData={menuData}
                        isActive={isActive}
                        onMenuClick={handleMenuClick}
                        onClose={() => setSidebarOpen(false)}
                        isMobile={true}
                        searchQuery={searchQuery}
                    />
                </aside>
            </>
        );
    }

    // Mobile Closed
    if (isMobile && !isOpen) {
        return null;
    }

    // Desktop Closed
    if (!isMobile && !isOpen) {
        return null; // Or render a mini sidebar if desired
    }

    // Desktop Open
    return (
        <aside className="w-64 h-screen flex flex-col border-r border-emerald-950/70 bg-[linear-gradient(165deg,#071f1d_0%,#102d2b_42%,#1f2a24_100%)] text-stone-100 transition-all duration-300">
            <SidebarContent
                auth={auth}
                menuData={menuData}
                isActive={isActive}
                onMenuClick={handleMenuClick}
                isMobile={false}
                searchQuery={searchQuery}
            />
        </aside>
    );
}

// MenuItem Component with Multi-Level Support
const MenuItem = ({
    item,
    isActive,
    onMenuClick,
    level = 0,
    searchQuery = "",
}) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;

    // Check if current item or any of its children is active
    const isItemActive = item.href ? isActive(item.href) : false;
    const hasActiveChild =
        hasChildren &&
        item.children.some((child) => child.href && isActive(child.href));
    const [isExpanded, setIsExpanded] = useState(() => hasActiveChild);
    const shouldHighlight = isItemActive || hasActiveChild;

    // Calculate padding for nested levels
    const paddingLeftValue = level === 0 ? 16 : 16 + level * 24;

    // Keep manual toggle state, but still allow initial open when route is active.
    const isSearchMode = searchQuery.trim().length > 0;
    const expanded = isSearchMode ? true : isExpanded;

    const handleParentClick = (e) => {
        if (hasChildren) {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
        }
    };

    // Auto-open when route enters this submenu, but don't force close/open afterwards.
    React.useEffect(() => {
        if (hasActiveChild) {
            setIsExpanded(true);
        }
    }, [hasActiveChild]);

    return (
        <div className="w-full">
            {/* Parent Menu Item */}
            {hasChildren ? (
                <button
                    onClick={handleParentClick}
                    style={{ paddingLeft: `${paddingLeftValue}px` }}
                    className={`w-full flex items-center justify-between gap-3 pr-3 py-2 rounded-xl text-sm transition-all duration-300 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0 ${
                        shouldHighlight
                            ? "bg-white/10 text-amber-100 font-semibold shadow-[inset_3px_0_0_rgba(251,191,36,0.9)]"
                            : "text-emerald-50/80 hover:bg-white/10 hover:text-white font-medium"
                    }`}
                >
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <Icon
                                size={18}
                                className={
                                    shouldHighlight
                                        ? "text-amber-200"
                                        : "text-emerald-100/45"
                                }
                            />
                        )}
                        <span className="tracking-tight">{item.label}</span>
                    </div>
                    <IconChevronDown
                        size={16}
                        className={`transition-transform duration-300 ${
                            expanded ? "rotate-0" : "-rotate-90 opacity-40"
                        } ${shouldHighlight ? "text-amber-200 opacity-100" : "text-emerald-100/40"}`}
                    />
                </button>
            ) : (
                <Link
                    href={item.href}
                    onClick={onMenuClick}
                    style={{ paddingLeft: `${paddingLeftValue}px` }}
                    className={`flex items-center gap-3 pr-3 py-2 rounded-xl text-sm transition-all duration-300 cursor-pointer focus:outline-none focus-visible:outline-none focus:ring-0 ${
                        isItemActive
                            ? "bg-amber-300 text-emerald-950 font-semibold shadow-[0_12px_28px_-18px_rgba(251,191,36,0.85)]"
                            : "text-emerald-50/80 hover:bg-white/10 hover:text-white font-medium"
                    }`}
                >
                    {Icon && (
                        <Icon
                            size={18}
                            className={
                                isItemActive
                                    ? "text-emerald-950"
                                    : "text-emerald-100/45"
                            }
                        />
                    )}
                    <span className="tracking-tight">{item.label}</span>
                </Link>
            )}

            {/* Submenu Items */}
            {hasChildren && (
                <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        expanded ? "max-h-125 opacity-100" : "max-h-0 opacity-0"
                    }`}
                >
                    <div className="mt-1 space-y-0.5 py-1">
                        {item.children.map((child, index) => (
                            <MenuItem
                                key={index}
                                item={child}
                                isActive={isActive}
                                onMenuClick={onMenuClick}
                                level={level + 1}
                                searchQuery={searchQuery}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};;

const SidebarContent = ({
    auth,
    menuData,
    isActive,
    onMenuClick,
    onClose,
    isMobile,
    searchQuery,
}) => {
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    return (
        <>
            {/* Header / Logo */}
            <div className="px-4 flex justify-between h-18 items-center border-b border-white/10 bg-white/[0.03] shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden border border-amber-300/35 bg-white/10 shrink-0">
                        <img
                            src={LogoImg}
                            alt="Logo"
                            className="w-full h-full object-cover p-1"
                        />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white leading-tight tracking-tight">
                            Paris Parfum Admin
                        </div>
                        <div className="text-[10px] text-amber-100/80 leading-tight">
                            Admin Panel
                        </div>
                    </div>
                </div>
                {isMobile && onClose && (
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-emerald-50/60 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <IconX size={18} />
                    </button>
                )}
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto pt-2 bg-transparent">
                {menuData.length > 0 ? (
                    menuData.map((menu, index) => (
                        <MenuItem
                            key={index}
                            item={menu}
                            isActive={isActive}
                            onMenuClick={onMenuClick}
                            level={0}
                            searchQuery={searchQuery}
                        />
                    ))
                ) : (
                    <div className="px-3 py-4 text-sm text-emerald-50/55">
                        Menu tidak ditemukan.
                    </div>
                )}
            </nav>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/10 bg-black/10">
                <div className="text-[10px] font-bold text-emerald-50/40 text-center tracking-widest uppercase">
                    Paris Parfum Admin v1.0
                </div>
            </div>
        </>
    );
};
