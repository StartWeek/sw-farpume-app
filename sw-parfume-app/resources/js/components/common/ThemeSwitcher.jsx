import React from "react";
import { useThemeStore } from "@/store/themeStore";
import { IconCheck, IconMoon, IconSun } from "@tabler/icons-react";

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

const ThemeSwitcher = () => {
    const {
        primaryColor,
        setPrimaryColor,
        lightTheme,
        setLightTheme,
        darkTheme,
        setDarkTheme,
        isDarkMode,
        toggleDarkMode,
    } = useThemeStore();

    return (
        <div className="space-y-10 p-1">
            {/* Primary Color Picker */}
            <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-muted mb-6 flex items-center gap-2">
                    Primary Colors
                </h3>
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-6 gap-4">
                    {primaryColors.map((cp) => (
                        <button
                            key={cp.name}
                            onClick={() => setPrimaryColor(cp.name)}
                            className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 ${
                                primaryColor === cp.name
                                    ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                                    : "border-stroke bg-card hover:border-muted/30"
                            }`}
                        >
                            <div
                                className="w-10 h-10 rounded-xl shadow-inner mb-2 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
                                style={{ backgroundColor: cp.color }}
                            >
                                {primaryColor === cp.name && (
                                    <IconCheck
                                        size={20}
                                        className="text-white drop-shadow-md animate-scale-up"
                                    />
                                )}
                            </div>
                            <span
                                className={`text-[10px] font-black uppercase tracking-wider transition-colors ${
                                    primaryColor === cp.name
                                        ? "text-primary"
                                        : "text-muted"
                                }`}
                            >
                                {cp.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Light Theme Picker */}
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted mb-6">
                        Light Base Layer
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {lightThemes.map((t) => (
                            <button
                                key={t.name}
                                onClick={() => setLightTheme(t.name)}
                                className={`flex-1 min-w-[80px] px-4 py-3 rounded-xl text-xs font-black transition-all duration-300 border ${
                                    lightTheme === t.name
                                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                                        : "bg-page text-muted border-stroke hover:bg-page/80 active:scale-95"
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dark Theme Picker */}
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted mb-6">
                        Dark Base Layer
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {darkThemes.map((t) => (
                            <button
                                key={t.name}
                                onClick={() => setDarkTheme(t.name)}
                                className={`flex-1 min-w-[80px] px-4 py-3 rounded-xl text-xs font-black transition-all duration-300 border ${
                                    darkTheme === t.name
                                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                                        : "bg-page text-muted border-stroke hover:bg-page/80 active:scale-95"
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="pt-6 border-t border-stroke">
                <div className="flex items-center justify-between p-6 bg-page rounded-2xl border border-stroke/50">
                    <div>
                        <h4 className="font-black text-main text-lg">
                            Dark Mode
                        </h4>
                        <p className="text-sm text-muted font-medium">
                            Switch between light and dark visual styles
                        </p>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className={`relative inline-flex h-10 w-18 items-center rounded-full transition-all duration-500 focus:outline-none focus:ring-4 focus:ring-primary/20 ${
                            isDarkMode
                                ? "bg-primary shadow-inner"
                                : "bg-gray-300"
                        }`}
                    >
                        <span
                            className={`h-8 w-8 transform rounded-full bg-white shadow-xl transition-all duration-500 ease-spring flex items-center justify-center ${
                                isDarkMode
                                    ? "translate-x-9 rotate-0"
                                    : "translate-x-1 -rotate-180"
                            }`}
                        >
                            {isDarkMode ? (
                                <IconMoon
                                    size={18}
                                    className="text-primary animate-pulse"
                                />
                            ) : (
                                <IconSun size={18} className="text-amber-500" />
                            )}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ThemeSwitcher;
