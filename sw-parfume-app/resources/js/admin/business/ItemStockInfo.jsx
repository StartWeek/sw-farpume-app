import React from "react";
import { number } from "./_components";

export function itemStockLabel(details) {
    return `Gudang: ${details.warehouse} · Stok: ${details.stock == null ? "Tidak tersedia" : `${number(details.stock)} ${details.unit}`}${details.unit !== "BOTOL" ? ` · Supplier: ${details.suppliers.join(", ") || "Belum ditentukan"}` : ""}`;
}

export default function ItemStockInfo({ details, incoming = false }) {
    return <span className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs">
        <span className="min-w-0 text-muted">
            <span className="block break-words">{incoming ? "Gudang tujuan" : "Gudang"}: {details.warehouse}</span>
            {details.unit !== "BOTOL" && <span className="mt-1 block break-words">Supplier barang: {details.suppliers.join(", ") || "Belum ditentukan"}</span>}
        </span>
        <span className="font-bold tabular-nums text-main">Stok: {details.stock == null ? "Tidak tersedia" : `${number(details.stock)} ${details.unit}`}</span>
    </span>;
}
