import axios from 'axios';
import toast from "react-hot-toast";
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

async function sha256Hex(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

function normalizeRequestUrl(url) {
    if (!url) {
        return "";
    }

    try {
        const parsed = new URL(url, window.location.origin);

        return `${parsed.pathname}${parsed.search}`;
    } catch {
        return url;
    }
}

window.axios.interceptors.request.use(async (config) => {
    const hasCryptoSubtle = typeof crypto !== "undefined" && !!crypto.subtle;
    const nonce =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timestamp = Date.now().toString();
    const method = (config.method ?? "get").toUpperCase();
    const url = normalizeRequestUrl(config.url ?? "");

    // CSRF token is included to bind signature to current browser session.
    const csrf =
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") ?? "";

    // Body is excluded to avoid serializer mismatch between axios and Inertia form payloads.
    const rawSignature = `${method}|${url}|${timestamp}|${nonce}|${csrf}`;
    const signature = hasCryptoSubtle
        ? await sha256Hex(rawSignature)
        : rawSignature;

    config.headers = config.headers ?? {};
    config.headers["X-Timestamp"] = timestamp;
    config.headers["X-Nonce"] = nonce;
    config.headers["X-Signature"] = signature;

    return config;
});

