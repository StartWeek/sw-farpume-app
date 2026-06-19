import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
    plugins: [
        laravel({
            input: ["resources/css/app.css", "resources/js/app.jsx"],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    server: {
        host: process.env.VITE_DEV_SERVER_HOST || "127.0.0.1",
        port: Number(process.env.VITE_DEV_SERVER_PORT || 5173),
        strictPort: true,
        cors: true,
        origin: `http://${process.env.VITE_DEV_SERVER_HOST || "127.0.0.1"}:${process.env.VITE_DEV_SERVER_PORT || 5173}`,
        hmr: {
            host: process.env.VITE_DEV_SERVER_HOST || "127.0.0.1",
            port: Number(process.env.VITE_DEV_SERVER_PORT || 5173),
        },
        watch: {
            ignored: ["**/storage/framework/views/**"],
        },
    },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./resources/js", import.meta.url)),
            "@tabler/icons-react":
                "@tabler/icons-react/dist/esm/icons/index.mjs",
        },
    },
});
