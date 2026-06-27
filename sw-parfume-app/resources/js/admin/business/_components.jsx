import React from "react";
import { router } from "@inertiajs/react";
import Button from "@/components/common/Button";
import { useConfirmStore } from "@/store/confirmStore";
import {
    IconCalendarEvent,
    IconCheck,
    IconChevronDown,
    IconPencil,
    IconPlus,
    IconSearch,
    IconTrash,
} from "@tabler/icons-react";
import { formatBusinessDate, formatInputNumber, isBusinessDateKey, rawInputNumber } from "./formatters";

export { formatBusinessDate, formatInputNumber, rawInputNumber } from "./formatters";

export const money = (value) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

export const number = (value) =>
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
        Number(value || 0),
    );

export const todayDate = () => new Date().toLocaleDateString("en-CA");

export function useFlashMessages() {
    return null;
}

export function PageHeader({ title, subtitle, actionLabel, onAction }) {
    return (
        <div className="space-y-3">
            <section
                className="flex min-h-14 items-center rounded-2xl border border-stroke px-6 py-4 shadow-premium"
                style={{ backgroundColor: "var(--color-card-header)" }}
            >
                <h1 className="text-base font-bold text-white text-balance">{title}</h1>
            </section>
            {subtitle || actionLabel ? (
                <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
                    {subtitle ? (
                        <p className="text-[13px] font-medium leading-relaxed text-muted text-pretty">{subtitle}</p>
                    ) : (
                        <span />
                    )}
                    {actionLabel ? (
                        <Button icon={IconPlus} size="sm" onClick={onAction}>
                            {actionLabel}
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

export function Card({ children, className = "" }) {
    return (
        <section
            className={`rounded-xl border border-stroke bg-card p-5 shadow-premium ${className}`}
        >
            {children}
        </section>
    );
}

export function Field({ label, children }) {
    return (
        <label className="space-y-1.5 block">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted">{label}</span>
            {children}
        </label>
    );
}

export function Input({ className = "", type = "text", error, ...props }) {
    const errorClass = error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-stroke focus:border-primary focus:ring-primary/20";
    const baseClass =
        `w-full rounded-lg border bg-card px-3.5 py-2.5 text-sm font-medium text-main outline-none transition-all duration-200 placeholder:text-gray-400 placeholder:font-normal focus:ring-2 ${errorClass}`;

    if (type === "date") {
        return (
            <div>
                <div className="relative">
                    <IconCalendarEvent
                        size={17}
                        stroke={2}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary"
                    />
                    <input
                        {...props}
                        type="date"
                        className={`${baseClass} h-10 cursor-pointer pl-10 pr-9 font-semibold text-main shadow-sm [color-scheme:light] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${className}`}
                    />
                    <IconChevronDown
                        size={15}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                    />
                </div>
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
        );
    }

    return (
        <div>
            <input
                {...props}
                type={type}
                className={`${baseClass} ${className}`}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
}

export function CurrencyInput({ value, onChange, error, ...props }) {
    return (
        <Input
            {...props}
            error={error}
            type="text"
            inputMode="numeric"
            value={formatInputNumber(value)}
            onChange={(event) => {
                onChange?.({
                    ...event,
                    target: {
                        ...event.target,
                        value: rawInputNumber(event.target.value),
                    },
                });
            }}
        />
    );
}

export function Textarea({ error, ...props }) {
    const errorClass = error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-stroke focus:border-primary focus:ring-primary/20";
    return (
        <div>
            <textarea
                {...props}
                className={`min-h-20 w-full rounded-lg border bg-card px-3.5 py-2.5 text-sm font-medium text-main outline-none transition-all duration-200 placeholder:text-gray-400 placeholder:font-normal focus:ring-2 ${errorClass}`}
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
}

function optionText(label) {
    if (typeof label === "string" || typeof label === "number") {
        return String(label);
    }

    if (Array.isArray(label)) {
        return label.map(optionText).join(" ");
    }

    if (React.isValidElement(label)) {
        return optionText(label.props.children);
    }

    return "";
}

export function Select({ children, value, onChange, placeholder = "Pilih data", disabled = false, searchable = true, error, ...props }) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const wrapperRef = React.useRef(null);
    const options = React.Children.toArray(children)
        .filter((child) => React.isValidElement(child))
        .map((child) => ({
            value: String(child.props.value ?? child.props.children ?? ""),
            label: child.props.children,
            text: optionText(child.props.children).toLowerCase(),
            disabled: Boolean(child.props.disabled),
        }));
    const selected = options.find((option) => option.value === String(value ?? ""));
    const menuOptions = options.filter((option) => option.value !== "");
    const filteredOptions = search.trim()
        ? menuOptions.filter((option) => option.text.includes(search.trim().toLowerCase()))
        : menuOptions;

    React.useEffect(() => {
        const close = (event) => {
            if (!wrapperRef.current?.contains(event.target)) {
                setOpen(false);
                setSearch("");
            }
        };

        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const pick = (option) => {
        if (option.disabled) return;
        onChange?.({ target: { value: option.value, name: props.name } });
        setOpen(false);
        setSearch("");
    };

    const errorClass = error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : "border-stroke hover:border-primary/60 focus:border-primary focus:ring-primary/20";

    return (
        <div ref={wrapperRef} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
                className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border bg-card px-3.5 py-2.5 text-left text-sm font-medium text-main shadow-sm outline-none transition-all duration-200 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${errorClass}`}
            >
                <span className={selected?.value ? "" : "text-muted"}>
                    {selected?.label || placeholder}
                </span>
                <IconChevronDown
                    size={16}
                    className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open ? (
                <div className="absolute z-40 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-stroke bg-card p-1.5 text-sm shadow-premium">
                    {searchable ? (
                        <div className="sticky top-0 z-10 bg-card p-1">
                            <div className="relative">
                                <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    autoFocus
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Cari..."
                                    className="w-full rounded-lg border border-stroke bg-page py-2 pl-8 pr-3 text-sm font-medium text-main outline-none transition-all duration-200 placeholder:font-normal focus:border-primary focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>
                    ) : null}
                    {filteredOptions.length ? filteredOptions.map((option) => {
                        const active = option.value === String(value ?? "");
                        return (
                            <button
                                key={`${option.value}-${option.label}`}
                                type="button"
                                disabled={option.disabled}
                                onClick={() => pick(option)}
                                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left font-medium transition-colors duration-150 ${
                                    active
                                        ? "bg-primary text-white"
                                        : "text-main hover:bg-page"
                                } ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`}
                            >
                                <span>{option.label}</span>
                                {active ? <IconCheck size={15} /> : null}
                            </button>
                        );
                    }) : (
                        <div className="px-3 py-4 text-center text-sm text-muted">
                            Data tidak ditemukan.
                        </div>
                    )}
                </div>
            ) : null}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
}

export function SimpleTable({ columns, rows, renderActions, hidePagination = false }) {
    const tableRows = Array.isArray(rows) ? rows : rows?.data || [];
    const hasPagination = !Array.isArray(rows) && rows && !hidePagination;

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-stroke bg-card">
                <table className="min-w-full divide-y divide-stroke text-sm">
                    <thead className="bg-page/80 text-left">
                        <tr>
                            {columns.map((column, columnIndex) => (
                                <th key={`${column.key || column.label}-${columnIndex}`} className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-muted">
                                    {column.label}
                                </th>
                            ))}
                            {renderActions ? (
                                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-muted">Aksi</th>
                            ) : null}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke/70">
                        {tableRows.length ? (
                            tableRows.map((row, rowIndex) => (
                                <tr key={tableRowKey(row, rowIndex)} className="transition-colors duration-150 hover:bg-page/50">
                                    {columns.map((column, columnIndex) => (
                                        <td key={`${column.key || column.label}-${columnIndex}`} className="px-4 py-3 font-medium text-main">
                                            {column.render
                                                ? column.render(row)
                                                : isBusinessDateKey(column.key)
                                                    ? formatBusinessDate(row[column.key])
                                                    : (row[column.key] ?? "-")}
                                        </td>
                                    ))}
                                    {renderActions ? (
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                {renderActions(row)}
                                            </div>
                                        </td>
                                    ) : null}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    className="px-4 py-14 text-center"
                                    colSpan={
                                        columns.length + (renderActions ? 1 : 0)
                                    }
                                >
                                    <div className="text-sm font-medium text-muted">Data belum tersedia</div>
                                    <div className="mt-1 text-xs text-gray-400">Belum ada data untuk ditampilkan saat ini.</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {hasPagination ? <PaginationBar pagination={rows} /> : null}
        </div>
    );
}

function tableRowKey(row, index) {
    return row?.id
        ?? row?.key
        ?? row?.no_transaksi
        ?? row?.no_pembelian
        ?? row?.no_penjualan
        ?? row?.no_hutang
        ?? row?.no_piutang
        ?? row?.no_piutang_supplier
        ?? `${row?.name || row?.nama_item || row?.kode_barang || "row"}-${index}`;
}

export function PaginationBar({ pagination }) {
    const page = Number(pagination.current_page || 1);
    const lastPage = Number(pagination.last_page || 1);
    const perPage = Number(pagination.per_page || 10);
    const total = Number(pagination.total || 0);
    const from = Number(pagination.from || 0);
    const to = Number(pagination.to || 0);

    const visit = (nextPage, nextPerPage = perPage) => {
        const params = new URLSearchParams(window.location.search);
        params.set("page", String(nextPage));
        params.set("per_page", String(nextPerPage));

        router.get(`${window.location.pathname}?${params.toString()}`, {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    return (
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
            <div className="text-xs font-medium tracking-wide text-muted">
                Menampilkan{" "}
                <span className="font-bold text-main">{from}</span>
                {" – "}
                <span className="font-bold text-main">{to}</span>{" dari "}
                <span className="font-bold text-main">{total}</span>{" data"}
            </div>
            <div className="flex items-center gap-1.5">
                <span className="mr-1 text-[10px] font-semibold tracking-wide text-muted">Per halaman</span>
                <select
                    value={perPage}
                    onChange={(event) => visit(1, Number(event.target.value))}
                    className="rounded-lg border border-stroke bg-card px-2 py-1 text-xs font-medium text-main outline-none focus:border-primary"
                >
                    {[10, 25, 50].map((value) => (
                        <option key={value} value={value}>{value}</option>
                    ))}
                </select>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => visit(page - 1)}
                >
                    ‹
                </Button>
                <span className="min-w-14 text-center text-xs font-bold tabular-nums text-main">
                    {page} / {lastPage}
                </span>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= lastPage}
                    onClick={() => visit(page + 1)}
                >
                    ›
                </Button>
            </div>
        </div>
    );
}

export function RowActions({ onEdit, onDelete }) {
    return (
        <div className="flex items-center justify-center gap-1.5">
            {onEdit ? (
                <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:opacity-90"
                >
                    <IconPencil size={13} />
                    Edit
                </button>
            ) : null}
            {onDelete ? (
                <button
                    type="button"
                    onClick={onDelete}
                    className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-red-700"
                >
                    <IconTrash size={13} />
                    Delete
                </button>
            ) : null}
        </div>
    );
}

export async function submitDelete(url, message = "Hapus data ini?") {
    const confirmed = await useConfirmStore.getState().confirm({ message });
    if (!confirmed) return;
    router.delete(url, { preserveScroll: true });
}

export function optionLabel(row, keys) {
    return keys.map((key) => row?.[key]).filter(Boolean).join(" - ");
}
