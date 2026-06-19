import React, { useMemo, useState } from "react";
import {
    IconAlertTriangle,
    IconBell,
    IconBox,
    IconCheck,
    IconChevronRight,
    IconClick,
    IconClock,
    IconCreditCard,
    IconEdit,
    IconEye,
    IconFilter,
    IconGift,
    IconHeart,
    IconHome,
    IconInbox,
    IconInfoCircle,
    IconKey,
    IconLayoutDashboard,
    IconLogin,
    IconLogout,
    IconMenu2,
    IconMoon,
    IconPlus,
    IconReceipt,
    IconSearch,
    IconSettings,
    IconShield,
    IconShoppingBag,
    IconShoppingCart,
    IconStar,
    IconSun,
    IconTrash,
    IconUpload,
    IconUser,
    IconUsers,
    IconWallet,
    IconWorld,
    IconX,
} from "@tabler/icons-react";

/**
 * @param {Object} props
 * @param {string} props.value
 * @param {(value: string) => void} props.onChange
 * @param {Function} props.onClose
 */
const ICON_ITEMS = [
    {
        name: "IconClick",
        component: IconClick,
        category: "Interface",
        keywords: ["click", "cursor"],
    },
    {
        name: "IconHome",
        component: IconHome,
        category: "Interface",
        keywords: ["home"],
    },
    {
        name: "IconLayoutDashboard",
        component: IconLayoutDashboard,
        category: "Interface",
        keywords: ["dashboard", "layout"],
    },
    {
        name: "IconSettings",
        component: IconSettings,
        category: "Interface",
        keywords: ["settings", "gear"],
    },
    {
        name: "IconUser",
        component: IconUser,
        category: "Interface",
        keywords: ["user", "profile"],
    },
    {
        name: "IconUsers",
        component: IconUsers,
        category: "Interface",
        keywords: ["users", "team"],
    },
    {
        name: "IconBell",
        component: IconBell,
        category: "Interface",
        keywords: ["bell", "notification"],
    },
    {
        name: "IconSearch",
        component: IconSearch,
        category: "Interface",
        keywords: ["search"],
    },
    {
        name: "IconFilter",
        component: IconFilter,
        category: "Interface",
        keywords: ["filter"],
    },
    {
        name: "IconInfoCircle",
        component: IconInfoCircle,
        category: "Interface",
        keywords: ["info"],
    },
    {
        name: "IconAlertTriangle",
        component: IconAlertTriangle,
        category: "Interface",
        keywords: ["alert", "warning"],
    },
    {
        name: "IconCheck",
        component: IconCheck,
        category: "Interface",
        keywords: ["check", "success"],
    },
    {
        name: "IconX",
        component: IconX,
        category: "Interface",
        keywords: ["close", "x"],
    },
    {
        name: "IconPlus",
        component: IconPlus,
        category: "Interface",
        keywords: ["plus", "add"],
    },
    {
        name: "IconEdit",
        component: IconEdit,
        category: "Interface",
        keywords: ["edit", "pencil"],
    },
    {
        name: "IconTrash",
        component: IconTrash,
        category: "Interface",
        keywords: ["trash", "delete"],
    },
    {
        name: "IconChevronRight",
        component: IconChevronRight,
        category: "Interface",
        keywords: ["chevron", "arrow"],
    },
    {
        name: "IconEye",
        component: IconEye,
        category: "Interface",
        keywords: ["eye", "view"],
    },
    {
        name: "IconLogin",
        component: IconLogin,
        category: "Auth",
        keywords: ["login", "auth"],
    },
    {
        name: "IconLogout",
        component: IconLogout,
        category: "Auth",
        keywords: ["logout", "auth"],
    },
    {
        name: "IconKey",
        component: IconKey,
        category: "Auth",
        keywords: ["key", "password"],
    },
    {
        name: "IconShield",
        component: IconShield,
        category: "Auth",
        keywords: ["shield", "security"],
    },
    {
        name: "IconShoppingCart",
        component: IconShoppingCart,
        category: "Commerce",
        keywords: ["cart", "shopping"],
    },
    {
        name: "IconShoppingBag",
        component: IconShoppingBag,
        category: "Commerce",
        keywords: ["bag", "shopping"],
    },
    {
        name: "IconCreditCard",
        component: IconCreditCard,
        category: "Commerce",
        keywords: ["payment", "card"],
    },
    {
        name: "IconWallet",
        component: IconWallet,
        category: "Commerce",
        keywords: ["wallet", "money"],
    },
    {
        name: "IconReceipt",
        component: IconReceipt,
        category: "Commerce",
        keywords: ["receipt", "invoice"],
    },
    {
        name: "IconGift",
        component: IconGift,
        category: "Commerce",
        keywords: ["gift", "present"],
    },
    {
        name: "IconBox",
        component: IconBox,
        category: "Commerce",
        keywords: ["box", "package"],
    },
    {
        name: "IconUpload",
        component: IconUpload,
        category: "Utility",
        keywords: ["upload", "file"],
    },
    {
        name: "IconMenu2",
        component: IconMenu2,
        category: "Utility",
        keywords: ["menu", "hamburger"],
    },
    {
        name: "IconClock",
        component: IconClock,
        category: "Utility",
        keywords: ["clock", "time"],
    },
    {
        name: "IconStar",
        component: IconStar,
        category: "Utility",
        keywords: ["star", "favorite"],
    },
    {
        name: "IconHeart",
        component: IconHeart,
        category: "Utility",
        keywords: ["heart", "like"],
    },
    {
        name: "IconWorld",
        component: IconWorld,
        category: "Utility",
        keywords: ["world", "global"],
    },
    {
        name: "IconSun",
        component: IconSun,
        category: "Utility",
        keywords: ["sun", "light"],
    },
    {
        name: "IconMoon",
        component: IconMoon,
        category: "Utility",
        keywords: ["moon", "dark"],
    },
];

const CATEGORIES = [
    "All",
    ...Array.from(new Set(ICON_ITEMS.map((item) => item.category))),
];

const IconPicker = ({ value, onChange, onClose }) => {
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("All");

    const filteredIcons = useMemo(() => {
        const q = search.trim().toLowerCase();

        return ICON_ITEMS.filter((item) => {
            const matchesCategory =
                activeTab === "All" || item.category === activeTab;
            const matchesSearch =
                q === "" ||
                item.name.toLowerCase().includes(q) ||
                item.keywords.some((keyword) => keyword.includes(q));

            return matchesCategory && matchesSearch;
        });
    }, [search, activeTab]);

    const selectedItem = useMemo(
        () => ICON_ITEMS.find((item) => item.name === value) ?? null,
        [value],
    );

    return (
        <div
            className="flex w-full flex-col overflow-hidden rounded-2xl border border-stroke bg-card shadow-premium"
            style={{ height: 450 }}
        >
            <div className="z-10 border-b border-stroke bg-card p-3">
                <div className="relative mb-3">
                    <IconSearch
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                        size={18}
                    />
                    <input
                        type="text"
                        placeholder="Cari ikon (misal: burger, coffee, card...)"
                        className="w-full rounded-xl border border-stroke bg-page py-2 pl-10 pr-4 text-sm text-main placeholder:text-muted transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveTab(cat)}
                            className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${
                                activeTab === cat
                                    ? "border-primary bg-primary text-white shadow-premium shadow-primary/15"
                                    : "border-stroke bg-card text-main hover:border-primary/40 hover:bg-page"
                            }`}
                            aria-pressed={activeTab === cat}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {filteredIcons.map((item) => {
                        const IconComponent = item.component;
                        const isActive = value === item.name;

                        return (
                            <button
                                key={item.name}
                                type="button"
                                onClick={() => {
                                    onChange(item.name);
                                    if (onClose) onClose();
                                }}
                                title={item.name}
                                className={`group flex flex-col items-center justify-center rounded-xl border p-2 transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 ${
                                    isActive
                                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                                        : "border-stroke bg-card text-muted hover:border-primary/30 hover:bg-page hover:text-primary"
                                }`}
                            >
                                <IconComponent size={24} />
                                <span className="mt-1.5 w-full truncate text-center text-[8px] transition-colors group-hover:text-primary">
                                    {item.name.replace("Icon", "")}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {filteredIcons.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center py-10 text-muted">
                        <IconInbox size={48} stroke={1} />
                        <p className="mt-2 text-sm font-medium">
                            Ikon tidak ditemukan
                        </p>
                    </div>
                )}
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-stroke bg-page px-3 py-2">
                <span className="text-[10px] font-medium text-muted">
                    {filteredIcons.length} Ikon ditemukan
                </span>
                {value && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-stroke bg-card px-2 py-1">
                        <span className="text-[10px] text-muted">
                            Terpilih:
                        </span>
                        {selectedItem
                            ? (() => {
                                  const SelectedIcon = selectedItem.component;

                                  return (
                                      <SelectedIcon
                                          size={14}
                                          className="text-primary"
                                      />
                                  );
                              })()
                            : null}
                        <span className="text-[10px] font-bold text-main">
                            {value.replace("Icon", "")}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IconPicker;
