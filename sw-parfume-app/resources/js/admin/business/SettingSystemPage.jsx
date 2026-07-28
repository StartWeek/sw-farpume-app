import { Link, useForm, usePage } from "@inertiajs/react";
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
import ProtectedLayout from "@/components/layouts/ProtectedLayout";

const primaryColors = [
    { name: "Indigo", color: "#4F46E5" },
    { name: "Blue", color: "#2563EB" },
    { name: "Green", color: "#16A34A" },
    { name: "Amber", color: "#D97706" },
    { name: "Purple", color: "#9333EA" },
    { name: "Rose", color: "#E11D48" },
];

const legacyPrimaryColors = Object.fromEntries(
    primaryColors.map(({ name, color }) => [name.toLowerCase(), color]),
);

const normalizePrimaryColor = (color) => {
    const value = String(color || "").trim();

    return legacyPrimaryColors[value.toLowerCase()]
        || (/^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : "#D97706");
};

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
        primary_color: normalizePrimaryColor(settings.primary_color),
        light_theme: settings.light_theme || "slate",
        dark_theme: settings.dark_theme || "navy",
        is_dark_mode: settings.is_dark_mode || false,
    });
    const isCustomPrimary = !primaryColors.some(
        ({ color }) => color === data.primary_color,
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        put("/admin/setting-system", {
            onSuccess: () => {
                useThemeStore.getState().init(data);
            },
        });
    };

    return (
        <ProtectedLayout title="Setting System">
            <div className="space-y-6">
                <PageHeader
                    title="Setting System"
                    subtitle="Atur logo, nama aplikasi, dan tema warna"
                />

                <Link
                    href="/admin/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-card px-4 py-2.5 text-sm font-bold text-muted shadow-sm transition-colors hover:border-primary hover:text-primary"
                >
                    <IconArrowLeft size={18} />
                    Kembali
                </Link>

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
                                uploadType="sidebar_logo"
                            />
                            <ImageUpload
                                label="Logo Halaman Login"
                                value={data.login_logo_path}
                                onChange={(v) => setData("login_logo_path", v)}
                                apiUrl="/admin/upload/image"
                                currentPath={settings.login_logo_path}
                                accept=".jpg,.jpeg,.png,.gif,.webp,.svg"
                                maxSizeMB={2}
                                uploadType="login_logo"
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
                        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted">
                                    Warna Utama
                                </h3>
                                <p className="mt-1 text-xs font-medium text-muted">
                                    Pilih warna cepat atau tentukan warna khusus.
                                </p>
                            </div>
                            <code className="rounded-lg border border-stroke bg-page px-3 py-1.5 text-xs font-bold text-main">
                                {data.primary_color}
                            </code>
                        </div>
                        <div className="flex flex-wrap items-start gap-4">
                            {primaryColors.map((colorOption) => {
                                const isActive = data.primary_color === colorOption.color;

                                return (
                                <button
                                    key={colorOption.name}
                                    type="button"
                                    onClick={() => setData("primary_color", colorOption.color)}
                                    className="group flex min-w-16 flex-col items-center gap-2 rounded-xl px-2 py-2 text-center outline-none transition-transform duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95"
                                    aria-pressed={isActive}
                                >
                                    <div
                                        className="flex size-12 items-center justify-center rounded-full border-4 border-card shadow-md transition-transform duration-150 group-hover:scale-105"
                                        style={{
                                            backgroundColor: colorOption.color,
                                            boxShadow: isActive
                                                ? `0 0 0 3px ${colorOption.color}, 0 4px 10px rgba(15, 23, 42, 0.16)`
                                                : undefined,
                                        }}
                                    >
                                        {isActive && (
                                            <IconCheck
                                                size={20}
                                                stroke={3}
                                                className="text-white drop-shadow-md"
                                            />
                                        )}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                                        {colorOption.name}
                                    </span>
                                </button>
                                );
                            })}

                            <label className="group relative flex min-w-28 cursor-pointer flex-col items-center gap-2 rounded-xl px-2 py-2 text-center outline-none transition-transform duration-150 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-primary/30 active:scale-95">
                                <input
                                    type="color"
                                    value={data.primary_color}
                                    onChange={(event) => setData("primary_color", event.target.value.toUpperCase())}
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    aria-label="Pilih warna utama khusus"
                                />
                                <span
                                    className="flex size-12 items-center justify-center rounded-full border-4 border-card text-lg font-black text-white shadow-md transition-transform duration-150 group-hover:scale-105"
                                    style={{
                                        backgroundColor: data.primary_color,
                                        boxShadow: isCustomPrimary
                                            ? `0 0 0 3px ${data.primary_color}, 0 4px 10px rgba(15, 23, 42, 0.16)`
                                            : undefined,
                                    }}
                                >
                                    {isCustomPrimary ? (
                                        <IconCheck size={20} stroke={3} />
                                    ) : "+"}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted">
                                    Pilih Warna Lain
                                </span>
                            </label>
                        </div>
                        {errors.primary_color ? (
                            <p className="mt-3 text-sm font-medium text-red-500">{errors.primary_color}</p>
                        ) : null}
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
        </ProtectedLayout>
    );
}
