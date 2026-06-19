import "./bootstrap";
import "../css/app.css";

import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";

import { useThemeStore } from "./store/themeStore";

const appName = import.meta.env.VITE_APP_NAME || "Laravel";

// Initialize theme
useThemeStore.getState().init();

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./${name}.jsx`,
            import.meta.glob("./**/*.jsx", { eager: false }),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <Suspense
                fallback={
                    <div className="p-4 text-sm text-gray-600">
                        Loading page...
                    </div>
                }
            >
                <App {...props} />
            </Suspense>,
        );
    },
    progress: {
        color: "#4B5563",
    },
});
