import { useRef } from "react";

function submissionKey() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Reserve the PDF tab while the submit still has a user gesture. The banner
// retains a direct link when the browser blocks popups.
export function withPdfProof(options = {}, previewSlip = false) {
    let proofTab = null;
    const closeEmptyTab = () => {
        if (proofTab && !proofTab.closed) proofTab.close();
        proofTab = null;
    };
    return {
        ...options,
        onBefore: (visit) => {
            if (options.onBefore?.(visit) === false) return false;
            if (previewSlip) return;
            proofTab = window.open("about:blank", "_blank");
            if (proofTab) {
                proofTab.opener = null;
                proofTab.document.title = "Menyiapkan bukti transaksi";
                proofTab.document.body.textContent = "Menyiapkan bukti transaksi. Tunggu sampai pengajuan selesai.";
            }
        },
        onSuccess: (page) => {
            const url = page.props.flash?.transactionPdf || page.props.flash?.pendingValidation?.receipt_url || page.props.flash?.pendingValidation?.pdf_url;
            if (url && new URL(url, window.location.origin).pathname.endsWith("/slip")) {
                closeEmptyTab();
            } else if (url && proofTab && !proofTab.closed) {
                proofTab.location.replace(url);
                proofTab = null;
            } else {
                closeEmptyTab();
            }
            return options.onSuccess?.(page);
        },
        onFinish: (visit) => {
            closeEmptyTab();
            return options.onFinish?.(visit);
        },
    };
}

export default function useTransactionSubmissionOptions() {
    const keys = useRef(new Map());

    return (url, options = {}) => {
        if (!keys.current.has(url)) keys.current.set(url, submissionKey());
        return withPdfProof({
            ...options,
            headers: { ...options.headers, "Idempotency-Key": keys.current.get(url) },
            onSuccess: (page) => {
                keys.current.delete(url);
                return options.onSuccess?.(page);
            },
        }, /^\/admin\/(penjualan(?:-botol-kosong)?$|piutang\/)/.test(url));
    };
}
