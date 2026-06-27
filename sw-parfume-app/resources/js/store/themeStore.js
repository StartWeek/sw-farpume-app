import { create } from "zustand";
import { persist } from "zustand/middleware";

const legacyPrimaryColors = {
    indigo: "#4F46E5",
    blue: "#2563EB",
    green: "#16A34A",
    amber: "#D97706",
    purple: "#9333EA",
    rose: "#E11D48",
};

const primaryShadeMixes = {
    50: ["#FFFFFF", 0.95],
    100: ["#FFFFFF", 0.88],
    200: ["#FFFFFF", 0.72],
    300: ["#FFFFFF", 0.52],
    400: ["#FFFFFF", 0.28],
    500: ["#FFFFFF", 0.12],
    600: ["#000000", 0],
    700: ["#000000", 0.16],
    800: ["#000000", 0.3],
    900: ["#000000", 0.44],
    950: ["#000000", 0.58],
};

function normalizePrimaryColor(color) {
    const value = String(color || "").trim();
    const legacyColor = legacyPrimaryColors[value.toLowerCase()];

    if (legacyColor) return legacyColor;
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toUpperCase();

    return legacyPrimaryColors.amber;
}

function mixHex(source, target, amount) {
    const parse = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
    const sourceRgb = parse(source);
    const targetRgb = parse(target);
    const mixed = sourceRgb.map((channel, index) =>
        Math.round(channel * (1 - amount) + targetRgb[index] * amount),
    );

    return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function applyPrimaryColor(color) {
    const normalizedColor = normalizePrimaryColor(color);
    const root = document.documentElement;

    root.setAttribute("data-theme-primary", normalizedColor);
    Object.entries(primaryShadeMixes).forEach(([shade, [target, amount]]) => {
        root.style.setProperty(
            `--color-primary-${shade}`,
            mixHex(normalizedColor, target, amount),
        );
    });
}

export const useThemeStore = create(
    persist(
        (set) => ({
            primaryColor: legacyPrimaryColors.amber,
            lightTheme: "slate",
            darkTheme: "navy",
            isDarkMode: false,

            setPrimaryColor: (color) => {
                const primaryColor = normalizePrimaryColor(color);
                set({ primaryColor });
                applyPrimaryColor(primaryColor);
            },

            setLightTheme: (theme) => {
                set({ lightTheme: theme });
                document.documentElement.setAttribute(
                    "data-theme-light",
                    theme,
                );
            },

            setDarkTheme: (theme) => {
                set({ darkTheme: theme });
                document.documentElement.setAttribute("data-theme-dark", theme);
            },

            toggleDarkMode: () => {
                set((state) => {
                    const newMode = !state.isDarkMode;
                    if (newMode) {
                        document.documentElement.classList.add("dark");
                    } else {
                        document.documentElement.classList.remove("dark");
                    }
                    return { isDarkMode: newMode };
                });
            },

            // Initialize themes on load. Server settings win over stale local storage.
            init: (settings = null) => {
                const state = settings
                    ? {
                          primaryColor: normalizePrimaryColor(settings.primary_color),
                          lightTheme: settings.light_theme || "slate",
                          darkTheme: settings.dark_theme || "navy",
                          isDarkMode: Boolean(settings.is_dark_mode),
                      }
                    : useThemeStore.getState();

                if (settings) {
                    set(state);
                }

                applyPrimaryColor(state.primaryColor);
                document.documentElement.setAttribute(
                    "data-theme-light",
                    state.lightTheme,
                );
                document.documentElement.setAttribute(
                    "data-theme-dark",
                    state.darkTheme,
                );
                if (state.isDarkMode) {
                    document.documentElement.classList.add("dark");
                } else {
                    document.documentElement.classList.remove("dark");
                }
            },
        }),
        {
            name: "theme-storage",
        },
    ),
);
