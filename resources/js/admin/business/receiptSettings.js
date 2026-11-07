const receiptSettingKeys = [
    "store_name",
    "store_address",
    "store_phone",
    "receipt_footer",
    "receipt_template",
    "payment_receipt_template",
    "item_template",
];

const d = "=".repeat(32);
const s = "-".repeat(32);

export const defaultReceiptTemplate = [
    d,
    "{{store_name_center}}",
    "{{store_address_center}}",
    "{{store_phone_center}}",
    d,
    "{{title_center}}",
    s,
    "No     : {{number}}",
    "Tgl    : {{date}}",
    "{{party_label}} : {{party_name}}",
    "Gudang : {{warehouse}}",
    s,
    "{{items}}",
    s,
    "Total Qty  : {{total_qty}} ML",
    "Grand Total : {{grand_total}}",
    "{{payment_line}}",
    "Status     : {{payment_status}}",
    s,
    "{{footer_center}}",
    s,
    "",
].join("\n");

export const defaultPaymentReceiptTemplate = [
    d,
    "{{store_name_center}}",
    "{{store_address_center}}",
    "{{store_phone_center}}",
    d,
    "{{title_center}}",
    s,
    "No       : {{number}}",
    "Ref      : {{source_number}}",
    "Tgl      : {{date}}",
    "{{party_label}} : {{party_name}}",
    s,
    "{{items}}",
    s,
    "Tagihan  : {{total}}",
    "Bayar    : {{amount}}",
    "Terbayar : {{paid}}",
    "Sisa     : {{remaining}}",
    "Status   : {{status}}",
    s,
    "{{footer_center}}",
    s,
    "",
].join("\n");

export const defaultItemTemplate = [
    "NAMA BARANG : {{name}}",
    "JUMLAH      : {{qty}} x {{price}}",
    "{{variant}}",
].join("\n");

export function withReceiptSettings(receipt, settings = {}) {
    const configuredReceipt = { ...receipt };

    receiptSettingKeys.forEach((key) => {
        if (settings[key] !== null && settings[key] !== undefined) {
            configuredReceipt[key] = settings[key];
        }
    });

    configuredReceipt.store_name ||= "PARIS PARFUM";
    configuredReceipt.receipt_footer ||= "Terima kasih";

    return configuredReceipt;
}

export function renderReceiptTemplate(template, values) {
    return String(template || "")
        .replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (placeholder, key) => {
            const normalizedKey = key.toLowerCase();

            if (!Object.prototype.hasOwnProperty.call(values, normalizedKey)) {
                return placeholder;
            }

            return values[normalizedKey] ?? "";
        })
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function renderItemTemplate(template, item) {
    const rendered = String(template || defaultItemTemplate)
        .replace(/\{\{\s*name\s*\}\}/gi, item.name || "-")
        .replace(/\{\{\s*qty\s*\}\}/gi, item.qty ?? "")
        .replace(/\{\{\s*price\s*\}\}/gi, item.price ?? "")
        .replace(/\{\{\s*unit\s*\}\}/gi, item.unit ?? "")
        .replace(/\{\{\s*variant\s*\}\}/gi, (match) => item.variant || "")
        .replace(/^\n+|\n+$/g, "")
        .replace(/\n{3,}/g, "\n\n");

    return rendered
        .split("\n")
        .filter((line) => line !== undefined)
        .flatMap((line) => wrapLine(line, 32))
        .join("\n");
}

function wrapLine(line, width = 32) {
    if (line.length <= width) return [line];

    const sep = " : ";
    const sepIndex = line.indexOf(sep);
    const hasLabel = sepIndex !== -1;

    if (hasLabel) {
        const prefix = line.slice(0, sepIndex + sep.length);
        const indent = " ".repeat(prefix.length);
        const value = line.slice(sepIndex + sep.length);
        const words = value.split(" ");
        const lines = [];
        let current = "";

        for (const word of words) {
            const test = current ? `${current} ${word}` : word;
            if (test.length <= width - prefix.length) {
                current = test;
            } else {
                if (current) lines.push(current);
                current = word.length > width - prefix.length ? word : word;
            }
        }
        if (current) lines.push(current);

        return lines.map((l, i) => i === 0 ? `${prefix}${l}` : `${indent}${l}`);
    }

    // No label — plain line, just wrap
    const words = line.split(" ");
    const lines = [];
    let current = "";

    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (test.length <= width) {
            current = test;
        } else {
            if (current) lines.push(current);
            current = word;
        }
    }
    if (current) lines.push(current);

    return lines.length > 0 ? lines : [line.slice(0, width)];
}
