import React, { useEffect, useState } from "react";
import { IconBarcode, IconSearch } from "@tabler/icons-react";
import Button from "@/components/common/Button";
import { Field, Input, Select, number } from "./_components";
import { TransactionDialog } from "./TransactionDialogs";
import { filterBarcodeItems, isBarcodeShortcut } from "./barcode";

const pageSize = 20;
const types = { BIBIT: "Bibit", ABSOLUTE: "Absolute", BOTOL: "Botol Kosong" };

export default function BarcodeLookup({ items, onSelect, onOpen, enabled = true }) {
    const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [type, setType] = useState("");
    const [page, setPage] = useState(1);
    const openLookup = () => {
        if (!enabled || open || onOpen?.() === false) return;
        setSearch("");
        setType("");
        setPage(1);
        setOpen(true);
    };

    useEffect(() => {
        if (!enabled || open) return;
        const handleShortcut = (event) => {
            if (!isBarcodeShortcut(event, isMac)) return;
            event.preventDefault();
            event.stopPropagation();
            openLookup();
        };
        window.addEventListener("keydown", handleShortcut);
        return () => window.removeEventListener("keydown", handleShortcut);
    }, [enabled, open, onOpen, isMac]);

    const filtered = filterBarcodeItems(items, search, type);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="space-y-1.5">
            <Button variant="outline" icon={IconBarcode} onClick={openLookup} disabled={!enabled} aria-haspopup="dialog" aria-keyshortcuts={isMac ? "F1" : "Control+F1"}>Cari Barcode</Button>
            <p className="text-xs text-muted">Ctrl+F1 · Mac: Fn+F1</p>
            {open && <TransactionDialog title="Cari Barcode Barang" description="Pilih barang dengan stok tersedia untuk mengisi transaksi." onClose={() => setOpen(false)} width="max-w-2xl">
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
                        <Field label="Cari nama / barcode">
                            <div className="relative">
                                <IconSearch size={17} className="pointer-events-none absolute left-3 top-3 text-muted" aria-hidden="true" />
                                <Input data-autofocus type="search" aria-label="Cari nama atau barcode" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Nama barang atau kode barcode" className="pl-10" />
                            </div>
                        </Field>
                        <Field label="Jenis Barang">
                            <Select aria-label="Filter jenis barang" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
                                <option value="">Semua jenis</option>
                                {Object.entries(types).filter(([key]) => items.some((item) => item.type === key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </Select>
                        </Field>
                    </div>
                    <p className="text-xs text-muted" role="status">{filtered.length} barang tersedia</p>
                    <div className="space-y-2">
                        {visible.map((item) => <button key={item.id} type="button" onClick={() => { if (onSelect(item) !== false) setOpen(false); }} className="flex min-h-16 w-full items-center justify-between gap-3 rounded-lg border border-stroke px-4 py-3 text-left hover:bg-page focus-visible:outline-2 focus-visible:outline-primary">
                            <span className="min-w-0">
                                <span className="block break-all font-mono text-xs font-bold text-primary">{item.code}</span>
                                <span className="mt-1 block break-words text-sm font-bold text-main">{item.name}</span>
                                <span className="mt-1 block break-words text-xs text-muted">{types[item.type]} · {item.warehouse}</span>
                            </span>
                            <span className="shrink-0 text-right text-xs font-bold tabular-nums text-main">{number(item.stock)} {item.unit}</span>
                        </button>)}
                        {!visible.length && <p className="py-6 text-center text-sm text-muted">{items.length ? "Tidak ada barang yang sesuai pencarian." : "Tidak ada barcode barang dengan stok tersedia untuk transaksi ini."}</p>}
                    </div>
                    {totalPages > 1 && <div className="flex items-center justify-between gap-2">
                        <Button variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Sebelumnya</Button>
                        <span className="text-xs text-muted">{currentPage} / {totalPages}</span>
                        <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Berikutnya</Button>
                    </div>}
                </div>
            </TransactionDialog>}
        </div>
    );
}
