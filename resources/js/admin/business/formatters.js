export function formatInputNumber(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";

    let numericValue;
    if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
        numericValue = Number(text.replaceAll(".", ""));
    } else if (/^-?\d+(?:[.,]\d+)?$/.test(text)) {
        numericValue = Number(text.replace(",", "."));
    } else {
        numericValue = Number(text.replace(/\D/g, ""));
    }

    if (!Number.isFinite(numericValue)) return "";
    return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(numericValue);
}

export function rawInputNumber(value) {
    return String(value ?? "").replace(/\D/g, "");
}

export function formatBusinessDate(value) {
    if (!value) return "-";
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return String(value);
    return `${match[3]}-${match[2]}-${match[1].slice(-2)}`;
}

export function isBusinessDateKey(key) {
    return /tanggal|(^|_)date($|_)|_at$/i.test(String(key || ""));
}
