import "./bootstrap";
import "../css/app.css";

import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";

import { useThemeStore } from "./store/themeStore";

const appName = import.meta.env.VITE_APP_NAME || "Laravel";

const caseSensitiveAutocompleteValues = new Set([
    "username",
    "current-password",
    "new-password",
    "one-time-code",
]);

const shouldUppercaseInput = (element) => {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
        return false;
    }

    if (element.dataset.uppercase === "false") {
        return false;
    }

    if (element instanceof HTMLInputElement) {
        const type = element.type.toLowerCase();
        const fieldName = `${element.name} ${element.id}`;

        if (!["text", "search"].includes(type) || /password/i.test(fieldName)) {
            return false;
        }

        if (caseSensitiveAutocompleteValues.has(element.autocomplete)) {
            return false;
        }
    }

    return true;
};

const UppercaseInputScope = ({ children }) => (
    <div
        className="contents"
        onChangeCapture={(event) => {
            if (shouldUppercaseInput(event.target)) {
                event.target.value = event.target.value.toLocaleUpperCase("id-ID");
            }
        }}
    >
        {children}
    </div>
);

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./${name}.jsx`,
            import.meta.glob("./**/*.jsx", { eager: false }),
        ),
    setup({ el, App, props }) {
        useThemeStore
            .getState()
            .init(props.initialPage.props.appSettings ?? null);

        const root = createRoot(el);

        root.render(
            <Suspense
                fallback={
                    <div className="p-4 text-sm text-gray-600">
                        Loading page...
                    </div>
                }
            >
                <UppercaseInputScope>
                    <App {...props} />
                </UppercaseInputScope>
            </Suspense>,
        );
    },
    progress: {
        color: "#4B5563",
    },
});
