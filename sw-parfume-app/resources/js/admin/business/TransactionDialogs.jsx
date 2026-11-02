import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from "@headlessui/react";
import { IconCheck, IconChevronRight, IconSearch, IconX } from "@tabler/icons-react";
import Button from "@/components/common/Button";
import { Field, Input } from "./_components";

export function TransactionChoiceButton({ label, value, hint, icon: Icon, error, disabled = false, onClick }) {
    return (
        <div className="min-w-0">
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                aria-haspopup="dialog"
                aria-label={`${label}: ${value}`}
                aria-invalid={!!error}
                className={`flex min-h-24 w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${error ? "border-red-500" : "border-stroke"}`}
            >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-page text-primary"><Icon size={21} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold uppercase tracking-widest text-muted">{label}</span>
                    <span className="mt-1 block break-words text-sm font-bold text-main">{value}</span>
                    <span className="mt-1 block text-xs text-muted">{hint}</span>
                </span>
                <IconChevronRight size={17} className="shrink-0 text-muted" aria-hidden="true" />
            </button>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
    );
}

export function TransactionDialog({ title, description, onClose, children, width = "max-w-md" }) {
    return (
        <Dialog open onClose={onClose} className="relative z-50">
            <DialogBackdrop className="fixed inset-0 bg-black/50" />
            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                    <DialogPanel className={`my-8 flex max-h-[85vh] w-full ${width} flex-col rounded-2xl border border-stroke bg-card shadow-premium-lg`}>
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stroke px-6 py-3">
                            <div className="min-w-0"><DialogTitle className="text-base font-extrabold text-main">{title}</DialogTitle>{description && <Description className="mt-1 text-xs leading-5 text-muted">{description}</Description>}</div>
                            <button type="button" onClick={onClose} aria-label="Tutup modal" className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-page focus-visible:outline-2 focus-visible:outline-primary"><IconX size={19} aria-hidden="true" /></button>
                        </div>
                        <div data-transaction-dialog-scroll className="overflow-y-auto px-6 py-5">{children}</div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
}

export function TransactionPickerModal({ title, options, selectedValue, onSelect, onClose, manualName = "", onManualConfirm, error, searchLabel = onManualConfirm ? "Customer" : "Sales" }) {
    const [search, setSearch] = useState("");
    const [manualMode, setManualMode] = useState(!!manualName && !selectedValue);
    const [name, setName] = useState(manualName);
    const [nameError, setNameError] = useState("");
    const manualInputRef = useRef(null);
    const query = search.trim().toLowerCase();
    const filteredOptions = options.filter((option) => `${option.label} ${option.description || ""}`.toLowerCase().includes(query));

    useEffect(() => {
        if (manualMode) manualInputRef.current?.focus();
    }, [manualMode]);

    const confirmName = (event) => {
        event.preventDefault();
        const value = name.trim().toUpperCase();
        if (!value) {
            setNameError("Isi nama customer terlebih dahulu.");
            manualInputRef.current?.focus();
            return;
        }
        onManualConfirm(value);
    };

    return (
        <TransactionDialog title={title} onClose={onClose} width="max-w-lg">
            <div className="space-y-4">
                {onManualConfirm && (
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Cara memilih customer">
                        {[{ label: "Customer Terdaftar", manual: false }, { label: "Customer Tanpa Registrasi", manual: true }].map((option) => (
                            <button key={option.label} type="button" aria-pressed={manualMode === option.manual} onClick={() => setManualMode(option.manual)} className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${manualMode === option.manual ? "border-primary bg-primary/10 text-primary" : "border-stroke text-muted hover:bg-page"}`}>
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
                {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
                {manualMode && onManualConfirm ? (
                    <form onSubmit={confirmName} className="space-y-4">
                        <label className="block space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Nama Customer</span>
                            <input ref={manualInputRef} data-autofocus value={name} onChange={(event) => { setName(event.target.value.toUpperCase()); setNameError(""); }} maxLength={255} aria-invalid={!!nameError} placeholder="Contoh: IBU RINA" className="w-full rounded-lg border border-stroke bg-card px-3.5 py-3 text-sm font-medium uppercase text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                        </label>
                        {nameError && <p role="alert" className="text-xs text-red-500">{nameError}</p>}
                        <p className="text-xs text-muted">Nama hanya untuk transaksi ini, tidak disimpan ke master customer.</p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={onClose}>Batal</Button>
                            <Button type="submit">Gunakan Nama Ini</Button>
                        </div>
                    </form>
                ) : (
                    <>
                        {onManualConfirm && <p className="text-sm text-muted">Klik customer untuk memilih dan melanjutkan.</p>}
                        <Field label={`Cari ${searchLabel}`}>
                            <div className="relative">
                                <IconSearch size={17} className="pointer-events-none absolute left-3 top-3 text-muted" aria-hidden="true" />
                                <Input data-autofocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau kode…" className="pl-10" />
                            </div>
                        </Field>
                        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                            {filteredOptions.length ? filteredOptions.map((option) => {
                                const selected = String(selectedValue ?? "") === String(option.value);
                                return (
                                    <button key={option.value} type="button" aria-pressed={selected} onClick={() => onSelect(option.value)} className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${selected ? "border-primary bg-primary/10" : "border-stroke hover:bg-page"}`}>
                                        <span className="min-w-0"><span className="block break-words text-sm font-bold text-main">{option.label}</span>{option.description && <span className="mt-1 block break-words text-xs text-muted">{option.description}</span>}</span>
                                        {selected && <IconCheck size={19} className="shrink-0 text-primary" aria-hidden="true" />}
                                    </button>
                                );
                            }) : <p className="py-8 text-center text-sm text-muted">Tidak ada pilihan yang sesuai.</p>}
                        </div>
                        <div className="flex justify-end border-t border-stroke pt-4"><Button variant="outline" onClick={onClose}>{onManualConfirm ? "Batal" : "Kembali"}</Button></div>
                    </>
                )}
            </div>
        </TransactionDialog>
    );
}
