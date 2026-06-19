import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useThemeStore = create(
    persist(
        (set) => ({
            primaryColor: "amber",
            lightTheme: "slate",
            darkTheme: "navy",
            isDarkMode: false,

            setPrimaryColor: (color) => {
                set({ primaryColor: color });
                document.documentElement.setAttribute(
                    "data-theme-primary",
                    color,
                );
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

            // Initialize themes on load
            init: () => {
                const state = useThemeStore.getState();
                document.documentElement.setAttribute(
                    "data-theme-primary",
                    state.primaryColor,
                );
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
                }
            },
        }),
        {
            name: "theme-storage",
        },
    ),
);
