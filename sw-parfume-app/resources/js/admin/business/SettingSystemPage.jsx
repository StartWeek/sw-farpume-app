import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import {
    IconCheck,
    IconArrowLeft,
    IconDeviceFloppy,
    IconMoon,
    IconSun,
} from "@tabler/icons-react";
import { PageHeader, Card, Field, Input } from "./_components";
import ImageUpload from "@/components/input/ImageUpload";
import { useThemeStore } from "@/store/themeStore";

const primaryColors = [
    { name: "indigo", color: "#4f46e5" },
    { name: "blue", color: "#2563eb" },
    { name: "green", color: "#16a34a" },
    { name: "amber", color: "#d97706" },
    { name: "purple", color: "#9333ea" },
    { name: "rose", color: "#e11d48" },
];

const lightThemes = [
    { name: "slate", label: "Slate" },
    { name: "gray", label: "Gray" },
    { name: "neutral", label: "Neutral" },
];

const darkThemes = [
    { name: "navy", label: "Navy" },
    { name: "mirage", label: "Mirage" },
    { name: "mint", label: "Mint" },
    { name: "black", label: "Black" },
    { name: "cinder", label: "Cinder" },
];

export default function SettingSystemPage() {
    const { settings } = usePage().props;

    const { data, setData, put, processing, errors } = useForm({
        logo_path: settings.logo_path || "",
        login_logo_path: settings.login_logo_path || "",
        app_name: settings.app_name || "",
        primary_color: settings.primary_color || "amber",
        light_theme: settings.light_theme || "slate",
        dark_theme: settings.dark_theme || "navy",
        is_dark_mode: settings.is_dark_mode || false,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put("/admin/setting-system", {
            onSuccess: () => {
                useThemeStore.getState().init(data);
            },
        });
    };

    return (
        <>
            <Head title="Setting System" />
            <div className="space-y-6">
                <Link
                    href="/admin/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-card px-4 py-2.5 text-sm font-bold text-muted shadow-sm transition-colors hover:border-primary hover:text-primary"
                >
                    <IconArrowLeft size={18} />
                    Kembali
                </Link>

                <PageHeader
                    title="Setting System"
                    subtitle="Atur logo, nama aplikasi, dan tema warna"
                />

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Logo & Nama */}
                    <Card>
                        <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-muted">
                            Identitas Aplikasi
                        </h3>
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <ImageUpload
                                label="Logo Aplikasi (Sidebar)"
                                value={data.logo_path}
                                onChange={(v) => setData("logo_path", v)}
                                apiUrl="/admin/upload/image"
                                currentPath={settings.logo_path}
                                accept=".jpg,.jpeg,.png,.gif,.webp,.svg"
                                maxSizeMB={2}
                            />
                            <ImageUpload
                                label="Logo Halaman Login"
                                value={data.login_logo_path}
                                onChange={(v) => setData("login_logo_path", v)}
                                apiUrl="/admin/upload/image"
                                currentPath={settings.login_logo_path}
                                accept=".jpg,.jpeg,.png,.gif,.webp,.svg"
                                maxSizeMB={2}
                            />
                        </div>
                        <div className="mt-5 max-w-md">
                            <Field label="Nama Aplikasi">
                                <Input
                                    value={data.app_name}
                                    onChange={(e) =>
                                        setData("app_name", e.target.value)
                                    }
                                    placeholder="Paris Parfum Admin"
                                />
                            </Field>
                        </div>
                    </Card>

                    {/* Warna Utama */}
                    <Card>
                        <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-muted">
                            Warna Utama
                        </h3>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                            {primaryColors.map((cp) => (
                                <button
                                    key={cp.name}
                                    type="button"
                                    onClick={() =>
                                        setData("primary_color", cp.name)
                                    }
                                    className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 p-3 transition-all duration-300 ${
                                        data.primary_color === cp.name
                                            ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                                            : "border-stroke bg-card hover:border-muted/30"
                                    }`}
                                >
                                    <div
                                        className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
                                        style={{ backgroundColor: cp.color }}
                                    >
                                        {data.primary_color === cp.name && (
                                            <IconCheck
                                                size={20}
                                                className="animate-scale-up text-white drop-shadow-md"
                                            />
                                        )}
                                    </div>
                                    <span
                                        className={`text-[10px] font-black uppercase tracking-wider transition-colors ${
                                            data.primary_color === cp.name
                                                ? "text-primary"
                                                : "text-muted"
                                        }`}
                                    >
                                        {cp.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Tema */}
                    <Card>
                        <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-muted">
                            Tema Tampilan
                        </h3>
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div>
                                <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
                                    Tema Terang
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {lightThemes.map((t) => (
                                        <button
                                            key={t.name}
                                            type="button"
                                            onClick={() =>
                                                setData("light_theme", t.name)
                                            }
                                            className={`min-w-[80px] flex-1 rounded-xl border px-4 py-3 text-xs font-black transition-all duration-300 ${
                                                data.light_theme === t.name
                                                    ? "scale-[1.02] border-primary bg-primary text-white shadow-lg shadow-primary/20"
                                                    : "border-stroke bg-page text-muted hover:bg-page/80 active:scale-95"
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
                                    Tema Gelap
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {darkThemes.map((t) => (
                                        <button
                                            key={t.name}
                                            type="button"
                                            onClick={() =>
                                                setData("dark_theme", t.name)
                                            }
                                            className={`min-w-[80px] flex-1 rounded-xl border px-4 py-3 text-xs font-black transition-all duration-300 ${
                                                data.dark_theme === t.name
                                                    ? "scale-[1.02] border-primary bg-primary text-white shadow-lg shadow-primary/20"
                                                    : "border-stroke bg-page text-muted hover:bg-page/80 active:scale-95"
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Dark Mode Toggle */}
                        <div className="mt-6 border-t border-stroke pt-6">
                            <div className="flex items-center justify-between rounded-2xl border border-stroke/50 bg-page p-6">
                                <div>
                                    <h4 className="text-lg font-black text-main">
                                        Dark Mode
                                    </h4>
                                    <p className="text-sm font-medium text-muted">
                                        Mode gelap sebagai default tampilan
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setData(
                                            "is_dark_mode",
                                            !data.is_dark_mode,
                                        )
                                    }
                                    className={`relative inline-flex h-10 w-18 items-center rounded-full transition-all duration-500 focus:outline-none focus:ring-4 focus:ring-primary/20 ${
                                        data.is_dark_mode
                                            ? "bg-primary shadow-inner"
                                            : "bg-gray-300"
                                    }`}
                                >
                                    <span
                                        className={`flex h-8 w-8 transform items-center justify-center rounded-full bg-white shadow-xl transition-all duration-500 ${
                                            data.is_dark_mode
                                                ? "translate-x-9 rotate-0"
                                                : "translate-x-1 -rotate-180"
                                        }`}
                                    >
                                        {data.is_dark_mode ? (
                                            <IconMoon
                                                size={18}
                                                className="animate-pulse text-primary"
                                            />
                                        ) : (
                                            <IconSun
                                                size={18}
                                                className="text-amber-500"
                                            />
                                        )}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </Card>

                    {/* Save */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                            <IconDeviceFloppy size={18} />
                            {processing ? "Menyimpan..." : "Simpan Pengaturan"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
