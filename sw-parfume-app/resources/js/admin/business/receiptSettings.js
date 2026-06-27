const receiptSettingKeys = [
    "store_name",
    "store_address",
    "store_phone",
    "receipt_footer",
    "receipt_template",
    "payment_receipt_template",
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
    "{{total_bottle_line}}",
    "{{subtotal_line}}",
    "{{discount_line}}",
    "Grand Total : {{grand_total}}",
    "{{payment_line}}",
    "Status     : {{payment_status}}",
    "{{due_date_line}}",
    d,
    "{{footer_center}}",
    d,
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
    d,
    "{{footer_center}}",
    d,
    "",
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
