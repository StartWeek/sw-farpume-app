import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Button from "@/components/common/Button";
import { IconCreditCard, IconDotsVertical, IconPencil, IconPlus, IconFileTypePdf, IconTrash, IconUser, IconUsers, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { Card, CurrencyInput, Field, Input, PageHeader, Select, SimpleTable, formatInputNumber, money, number, todayDate, useFlashMessages } from "./_components";
import { TransactionChoiceButton, TransactionDialog, TransactionPickerModal } from "./TransactionDialogs";
import { automaticWarehouse, availableBarcodeItems, barcodeMatches, defaultTransactionUnit, matchesPurchaseSupplier, purchaseWarehouse, transactionItemCode } from "./barcode";
import BarcodeLookup from "./BarcodeLookup";
import { openCustomerSlip } from "./CustomerSlipModal";
import useTransactionSubmissionOptions from "./useTransactionSubmissionOptions";
import { PaymentAmountEntry, PaymentBreakdown, PaymentHistory, PaymentSummary, PaymentTable } from "./PaymentDetails";
const liquidUnits = ["ML", "LITER", "BOTOL"];
const purchaseLiquidUnits = ["ML", "LITER", "BOTOL"];
const bottleUnits = ["BOTOL", "DUS"];
const payments = ["CASH", "TRANSFER", "SPLIT", "TEMPO", "DP"];
const retailPayments = ["CASH", "TRANSFER", "SPLIT"];
const paymentLabels = {
    CASH: { label: "Tunai" },
    TRANSFER: { label: "Transfer" },
    SPLIT: { label: "Cash + Transfer" },
    TEMPO: { label: "Tempo" },
    DP: { label: "Uang Muka / DP" },
};
const paymentErrorKeys = ["metode_pembayaran", "jumlah_bayar", "cash_amount", "transfer_amount", "jatuh_tempo", "discount"];

export default function TransactionPage({ type, mode = "form", rows = [], refs: allRefs = {}, operationalDate = todayDate() }) {
    useFlashMessages();
    const submissionOptions = useTransactionSubmissionOptions();
    const { errors = {} } = usePage().props;
    const isHistory = mode === "history";
    const isBuy = type === "pembelian";
    const isBottleSale = type === "botol-kosong";
    const isWholesale = type === "sales" || type === "grosir";
    const title = isHistory
        ? (isBuy ? "Riwayat Pembelian Supplier" : isBottleSale ? "Riwayat Botol Kosong (Lama)" : isWholesale ? "Riwayat Penjualan Sales" : "Riwayat Penjualan Retail")
        : (isBuy ? "Pembelian Supplier" : isBottleSale ? "Penjualan Botol Kosong" : isWholesale ? "Penjualan Sales" : "Penjualan Retail");
    const emptyItem = { tipe_item: isBottleSale ? "BOTOL" : "BIBIT", item_id: "", qty_input: 1, satuan_input: isBottleSale ? "BOTOL" : "ML", harga: "" };
    const initial = {
        tanggal: operationalDate,
        id_supplier: "",
        id_customer: "",
        manual_customer_name: "",
        id_sales: "",
        tipe_gudang: isBuy ? "" : isBottleSale ? "BOTOL" : "BIBIT",
        id_gudang: "",
        metode_pembayaran: "CASH",
        jumlah_bayar: "",
        cash_amount: "",
        transfer_amount: "",
        discount: "",
        jatuh_tempo: operationalDate,
        tipe_penjualan: isBottleSale ? "BOTOL_KOSONG" : isWholesale ? "SALES" : "RETAIL",
        keterangan: "",
        items: [],
    };
    const [form, setForm] = useState(initial);
    const refs = isBuy && !isHistory
        ? { ...allRefs, barang: (allRefs.barang || []).filter((item) => matchesPurchaseSupplier(item, form.id_supplier)) }
        : allRefs;
    const [submitting, setSubmitting] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [addedPayment, setAddedPayment] = useState(null);
    const [picker, setPicker] = useState(null);
    const [barcode, setBarcode] = useState("");
    const [salesChosen, setSalesChosen] = useState(false);
    const [tempoPayment, setTempoPayment] = useState(null);
    const [tempoAmount, setTempoAmount] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [modalForm, setModalForm] = useState(emptyItem);
    const [editingIndex, setEditingIndex] = useState(null);
    const urlParams = new URLSearchParams(window.location.search);
    const [filterForm, setFilterForm] = useState({
        tanggal_dari: urlParams.get("tanggal_dari") || "",
        tanggal_sampai: urlParams.get("tanggal_sampai") || "",
        tipe_penjualan: urlParams.get("tipe_penjualan") || "",
        id_supplier: urlParams.get("id_supplier") || "",
        search: urlParams.get("search") || "",
    });
    const setFilter = (key, value) => setFilterForm((prev) => ({ ...prev, [key]: value }));
    const applyFilter = () => {
        const params = new URLSearchParams(window.location.search);
        Object.entries(filterForm).forEach(([k, v]) => { if (v) params.set(k, v); else params.delete(k); });
        router.get(window.location.pathname + "?" + params.toString(), {}, { preserveScroll: true, preserveState: true, replace: true });
    };
    const resetFilter = () => {
        setFilterForm({ tanggal_dari: "", tanggal_sampai: "", tipe_penjualan: "", id_supplier: "", search: "" });
        router.get(window.location.pathname, {}, { preserveScroll: true, replace: true });
    };

    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const visibleSupplier = refs.supplier || [];
    const selectedSupplier = visibleSupplier.find((row) => String(row.id) === String(form.id_supplier));
    const changePurchaseSupplier = (id) => {
        const incompatible = form.items.some((item) => item.tipe_item !== "BOTOL"
            && !matchesPurchaseSupplier(findSelectedItem(allRefs, item) || {}, id));
        if (incompatible) {
            toast.error("Ada barang yang tidak terhubung ke supplier ini. Hapus barang tersebut dari daftar sebelum mengganti supplier.");
            return;
        }
        set("id_supplier", id);
        setPicker(null);
    };
    const resolveItemWarehouse = (item, bottle) => isBuy
        ? purchaseWarehouse(item, bottle, refs.gudang || [], form.id_gudang)
        : automaticWarehouse(item, bottle, refs.gudang || [], refs.stok_gudang || []);
    const changePurchaseWarehouse = (id) => {
        try {
            for (const item of form.items) {
                purchaseWarehouse(findSelectedItem(refs, item), item.tipe_item === "BOTOL", refs.gudang || [], id);
            }
        } catch (failure) { toast.error(failure.message); return; }
        const warehouse = (refs.gudang || []).find((row) => Number(row.id) === Number(id));
        setForm((previous) => ({ ...previous, id_gudang: id, tipe_gudang: warehouse?.tipe_gudang || "" }));
    };
    const updateItem = (index, key, value) => setForm((prev) => ({ ...prev, items: prev.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
    const updateItemQty = (index, value) => setForm((prev) => ({
        ...prev,
        items: prev.items.map((item, itemIndex) => {
            if (itemIndex !== index) return item;

            const defaultPrice = defaultItemPrice(findSelectedItem(refs, item), item, isBuy, isWholesale);

            return {
                ...item,
                qty_input: value,
                harga: !isBuy && value !== "" && !item.harga ? defaultPrice : item.harga,
            };
        }),
    }));
    const openAddModal = () => {
        if (!isBuy && !salesChosen) { setPicker("sales"); return; }
        if (!isBuy && !form.id_customer && !form.manual_customer_name.trim()) { setPicker("customer"); return; }
        if (isBuy && !form.id_supplier) { toast.error("Pilih supplier terlebih dahulu."); return; }
        if (isBuy && !form.id_gudang) { toast.error("Pilih gudang tujuan terlebih dahulu."); return; }
        setEditingIndex(null);
        setModalForm(emptyItem);
        setBulkOpen(true);
    };
    const saveBulkItems = (items) => {
        if (!items.length) { toast.error("Pilih minimal satu barang."); return; }
        const resolvedItems = [];
        let warehouseId = form.items.length || isBuy ? form.id_gudang : "";
        let location;
        for (const item of items) {
            const selected = findSelectedItem(refs, item);
            if (!selected) { toast.error("Barang tidak tersedia. Buka kembali pilihan barang."); return; }
            if (!Number.isFinite(Number(item.qty_input)) || Number(item.qty_input) <= 0) { toast.error("Jumlah setiap barang harus lebih dari nol."); return; }
            if (item.harga !== "" && (!Number.isFinite(Number(item.harga)) || Number(item.harga) < 0)) { toast.error("Harga barang tidak valid."); return; }
            if (item.tipe_item !== "BOTOL" && item.satuan_input === "BOTOL" && !item.id_botol && !selected.botol?.varian_ml) { toast.error(`Pilih varian botol untuk ${selected.nama_barang}.`); return; }
            try { location = resolveItemWarehouse(selected, item.tipe_item === "BOTOL"); }
            catch (failure) { toast.error(failure.message); return; }
            if (isBuy && warehouseId && Number(warehouseId) !== Number(location.id)) { toast.error("Barang berasal dari gudang berbeda. Pilih barang dari satu gudang."); return; }
            warehouseId = location.id;
            resolvedItems.push({ ...item, id_gudang: location.id });
        }
        setForm((previous) => ({ ...previous, id_gudang: location.id, tipe_gudang: location.tipe_gudang, items: [...previous.items, ...resolvedItems] }));
        setBulkOpen(false);
        toast.success(`${items.length} barang berhasil ditambahkan.`);
    };
    const openEditModal = (index) => { setEditingIndex(index); setModalForm({ ...form.items[index] }); setModalOpen(true); };
    const saveModalItem = () => {
        const selected = findSelectedItem(refs, modalForm);
        if (!modalForm.item_id) { toast.error("Pilih barang terlebih dahulu."); return; }
        if (modalForm.tipe_item !== "BOTOL" && modalForm.satuan_input === "BOTOL" && !modalForm.id_botol && !selected?.botol?.varian_ml) { toast.error("Pilih varian botol terlebih dahulu."); return; }
        if (!modalForm.qty_input || Number(modalForm.qty_input) <= 0) { toast.error("Jumlah harus lebih dari 0."); return; }
        let location;
        try { location = !isBuy && modalForm.id_gudang ? purchaseWarehouse(selected, modalForm.tipe_item === "BOTOL", refs.gudang || [], modalForm.id_gudang) : resolveItemWarehouse(selected, modalForm.tipe_item === "BOTOL"); }
        catch (failure) { toast.error(failure.message); return; }

        if (isBuy && form.items.some((_, index) => index !== editingIndex) && Number(form.id_gudang) !== Number(location.id)) { toast.error("Barang berasal dari gudang berbeda. Buat transaksi terpisah."); return; }
        const savedItem = { ...modalForm, id_gudang: location.id };
        setForm((previous) => ({ ...previous, id_gudang: location.id, tipe_gudang: location.tipe_gudang }));
        if (editingIndex !== null) {
            setForm((prev) => ({ ...prev, items: prev.items.map((item, i) => i === editingIndex ? savedItem : item) }));
        } else {
            setForm((prev) => ({ ...prev, items: [...prev.items, savedItem] }));
        }
        setModalOpen(false);
        toast.success(editingIndex !== null ? "Barang berhasil diperbarui." : "Barang berhasil ditambahkan.");
    };
    const removeItem = (index) => setForm((previous) => {
        const items = previous.items.filter((_, itemIndex) => itemIndex !== index);
        return { ...previous, items, ...(items.length || isBuy ? {} : { id_gudang: "", tipe_gudang: isBottleSale ? "BOTOL" : "BIBIT" }) };
    });
    const customers = useMemo(() => (refs.customer || []).filter((row) => isWholesale ? ["SALES"].includes(row.tipe_customer) : row.tipe_customer === "RETAIL"), [refs.customer, isWholesale]);
    const selectedCustomer = customers.find((row) => String(row.id) === String(form.id_customer));
    const selectedSales = (refs.sales || []).find((row) => String(row.id) === String(form.id_sales));
    const customerName = selectedCustomer?.nama_customer || form.manual_customer_name || "Pilih customer";
    const transactionSubtotal = form.items.reduce((sum, item) => {
        const selected = findSelectedItem(refs, item);
        const price = Number(item.harga || defaultItemPrice(selected, item, isBuy, isWholesale) || 0);
        const qty = item.tipe_item === "BOTOL" && item.satuan_input === "DUS"
            ? Number(item.qty_input || 0)
            : convertQty(item, selected, refs);
        return sum + qty * price;
    }, 0);
    const paymentTitle = `Pembayaran ${title}`;
    const paymentTotal = Math.max(0, Math.round((transactionSubtotal - (Number(form.discount) || 0)) * 100) / 100);
    const enteredPayment = Number(form.jumlah_bayar || 0);
    const splitCash = Number(form.cash_amount || 0);
    const splitTransfer = Number(form.transfer_amount || 0);
    const remainingCash = Math.max(0, Math.round((paymentTotal - splitTransfer) * 100) / 100);
    const receivedPayment = form.metode_pembayaran === "SPLIT" ? splitCash + splitTransfer : enteredPayment;
    const allowsChange = ["CASH", "SPLIT"].includes(form.metode_pembayaran);
    const plannedPayment = form.metode_pembayaran === "TEMPO" ? 0 : allowsChange ? Math.min(receivedPayment, paymentTotal) : receivedPayment;
    const change = allowsChange ? Math.max(0, Math.round((receivedPayment - paymentTotal) * 100) / 100) : 0;
    const paymentEntryKey = JSON.stringify([form.metode_pembayaran, form.jumlah_bayar, form.cash_amount, form.transfer_amount, form.jatuh_tempo, paymentTotal]);
    const paymentAdded = addedPayment?.key === paymentEntryKey;
    const paymentIssue = form.metode_pembayaran === "CASH" && receivedPayment < paymentTotal
        ? "Uang cash belum cukup. Pembayaran sebagian hanya melalui DP."
        : form.metode_pembayaran === "TRANSFER" && receivedPayment !== paymentTotal
            ? "Nominal transfer harus sama dengan total tagihan. Pembayaran sebagian hanya melalui DP."
            : form.metode_pembayaran === "SPLIT" && (splitCash <= 0 || splitTransfer <= 0 || splitTransfer >= paymentTotal || receivedPayment < paymentTotal)
                ? "Isi cash dan transfer lebih dari nol; transfer harus kurang dari total dan gabungannya harus melunasi tagihan."
                : form.metode_pembayaran === "DP" && (enteredPayment <= 0 || enteredPayment > paymentTotal)
                    ? "DP harus lebih dari nol dan tidak melebihi total tagihan." : "";
    const selectPayment = (method) => setForm((previous) => ({ ...previous, metode_pembayaran: method, jumlah_bayar: "", cash_amount: "", transfer_amount: "" }));
    const addPayment = () => {
        if (paymentIssue) { toast.error(paymentIssue); return; }
        if (["TEMPO", "DP"].includes(form.metode_pembayaran) && !form.jatuh_tempo) { toast.error("Isi jatuh tempo terlebih dahulu."); return; }
        const rows = form.metode_pembayaran === "SPLIT"
            ? [{ label: "Cash", amount: splitCash }, { label: "Transfer", amount: splitTransfer }]
            : [{ label: paymentLabels[form.metode_pembayaran].label, amount: form.metode_pembayaran === "TEMPO" ? 0 : receivedPayment }];
        setAddedPayment({ key: paymentEntryKey, rows });
    };
    const selectCustomer = (value) => {
        setForm((previous) => ({ ...previous, id_customer: value, manual_customer_name: "" }));
        setPicker(null);
    };
    const selectCustomerName = (name) => {
        setForm((previous) => ({ ...previous, id_customer: "", manual_customer_name: name }));
        setPicker(null);
    };

    const submit = (event) => {
        event.preventDefault();
        if (submitting) return;
        if (!isBuy && !salesChosen) { setPicker("sales"); return; }
        if (!form.items.length) { toast.error("Tambahkan barang terlebih dahulu."); return; }
        if (!isBuy && !form.id_customer && !form.manual_customer_name.trim()) {
            setPaymentOpen(false);
            setPicker("customer");
            return;
        }
        if (!paymentOpen) {
            setPaymentOpen(true);
            return;
        }
        if (paymentIssue) { toast.error(paymentIssue); return; }
        if (!paymentAdded) { toast.error("Klik tombol + untuk memasukkan pembayaran ke tabel."); return; }
        const url = isBuy ? "/admin/pembelian" : isBottleSale ? "/admin/penjualan-botol-kosong" : "/admin/penjualan";
        router.post(url, {
            ...form,
            items: form.items.map((item) => ({ ...item, discount: 0 })),
            jumlah_bayar: ["CASH", "TRANSFER", "DP"].includes(form.metode_pembayaran) ? form.jumlah_bayar : null,
            cash_amount: form.metode_pembayaran === "SPLIT" ? form.cash_amount : null,
            transfer_amount: form.metode_pembayaran === "SPLIT" ? form.transfer_amount : null,
            jatuh_tempo: ["TEMPO", "DP"].includes(form.metode_pembayaran) ? form.jatuh_tempo : null,
            id_sales: form.id_sales || null,
        }, submissionOptions(url, {
            preserveScroll: true,
            onStart: () => setSubmitting(true),
            onSuccess: () => {
                setPaymentOpen(false);
                setForm(initial);
                setAddedPayment(null);
                setSalesChosen(false);
                setBarcode("");
            },
            onError: (validationErrors) => {
                if (validationErrors.items) toast.error(validationErrors.items, { duration: 8000 });
                if (Object.keys(validationErrors).some((key) => !paymentErrorKeys.includes(key))) setPaymentOpen(false);
                if (validationErrors.id_customer || validationErrors.manual_customer_name) setPicker("customer");
                else if (validationErrors.id_sales) setPicker("sales");
            },
            onFinish: () => setSubmitting(false),
        }));
    };

    const prepareBarcodeSelection = () => {
        if (isBuy && !form.id_supplier) { toast.error("Pilih supplier terlebih dahulu."); return false; }
        if (isBuy && !form.id_gudang) { toast.error("Pilih gudang tujuan terlebih dahulu."); return false; }
        if (!isBuy && !salesChosen) { setPicker("sales"); return false; }
        if (!isBuy && !form.id_customer && !form.manual_customer_name.trim()) { setPicker("customer"); return false; }
        return true;
    };
    const addBarcode = (value) => {
        const code = value.trim();
        if (!code || !prepareBarcodeSelection()) return false;
        const candidates = [
            ...(!isBottleSale ? (refs.barang || []).map((row) => ({ row, type: row.jenis_barang === "ABSOLUTE" ? "ABSOLUTE" : "BIBIT" })) : []),
            ...(refs.botol_kosong || []).map((row) => ({ row, type: "BOTOL" })),
        ].filter(({ row }) => barcodeMatches(row, code));
        if (candidates.length !== 1) { toast.error(candidates.length ? "Kode barcode ganda. Perbaiki kode di master barang." : isBuy ? "Barcode tidak ditemukan atau barang belum dihubungkan ke supplier yang dipilih. Periksa master Barang Bibit." : "Barcode tidak ditemukan untuk jenis transaksi ini."); return false; }
        const { row, type: itemType } = candidates[0];
        let location;
        try { location = resolveItemWarehouse(row, itemType === "BOTOL"); }
        catch (failure) { toast.error(failure.message); return false; }

        if (isBuy && form.items.length && Number(form.id_gudang) !== Number(location.id)) { toast.error("Barang berasal dari gudang berbeda. Buat transaksi terpisah."); return false; }
        const unit = defaultTransactionUnit(itemType, row, isBuy, isWholesale);
        const item = { tipe_item: itemType, item_id: row.id, id_gudang: location.id, qty_input: 1, satuan_input: unit, harga: "", ...(itemType === "BIBIT" && unit === "BOTOL" && row.id_botol ? { id_botol: row.id_botol } : {}) };
        setForm((previous) => {
            const index = previous.items.findIndex((value) => value.tipe_item === itemType && Number(value.item_id) === Number(row.id) && value.satuan_input === item.satuan_input && Number(value.id_botol || 0) === Number(item.id_botol || 0));
            return { ...previous, id_gudang: location.id, tipe_gudang: location.tipe_gudang, items: index < 0 ? [...previous.items, item] : previous.items.map((value, i) => i === index ? { ...value, qty_input: Number(value.qty_input) + 1 } : value) };
        });
        setBarcode("");
        toast.success(`${row.nama_barang || row.nama_botol} ditambahkan.`);
        return true;
    };
    const scanBarcode = () => addBarcode(barcode);
    const selectBarcodeItem = (entry) => {
        if (!prepareBarcodeSelection()) return false;
        const row = itemOptions(refs, entry.type).find((item) => Number(item.id) === Number(entry.itemId));
        if (!row) { toast.error("Barang tidak ditemukan. Muat ulang halaman."); return false; }
        const unit = defaultTransactionUnit(entry.type, row, isBuy, isWholesale);
        setEditingIndex(null);
        setModalForm({
            ...emptyItem,
            tipe_item: entry.type,
            item_id: row.id,
            satuan_input: unit,
            id_botol: entry.type === "BIBIT" && unit === "BOTOL" ? row.id_botol || "" : "",
        });
        setModalOpen(true);
        return true;
    };
    const barcodeItems = availableBarcodeItems({
        barang: isBottleSale ? [] : refs.barang || [],
        bottles: refs.botol_kosong || [],
        warehouses: refs.gudang || [],
        stocks: refs.stok_gudang || [],
        warehouseId: isBuy ? form.id_gudang : "",
        purchase: isBuy,
    });

    const openTempoPayment = (row) => {
        const record = getTempoRecord(row, isBuy);
        if (!record) return;

        setTempoPayment({
            isDp: isDpPayment(row),
            initialDp: row.jumlah_bayar,
            url: isBuy ? `/admin/hutang/${record.id}/bayar` : `/admin/piutang/${record.id}/bayar`,
            number: isBuy ? row.no_pembelian : row.no_penjualan,
            party: isBuy ? row.supplier?.nama_supplier : row.customer?.nama_customer,
            total: Number(isBuy ? record.total_hutang : record.total_piutang),
            paid: Number(record.total_bayar || 0),
            history: record.payment_history,
            remaining: Number(isBuy ? record.sisa_hutang || 0 : record.sisa_piutang || 0),
        });
        setTempoAmount("");
    };

    const submitTempoPayment = (event) => {
        event.preventDefault();
        if (!tempoPayment) return;
        if (Number(tempoAmount) <= 0 || !Number.isFinite(Number(tempoAmount))) { toast.error("Jumlah pembayaran harus lebih dari nol."); return; }
        if (Number(tempoAmount) > tempoPayment.remaining) { toast.error("Pembayaran melebihi sisa tagihan."); return; }

        router.post(tempoPayment.url, { jumlah_bayar: tempoAmount }, submissionOptions(tempoPayment.url, {
            preserveScroll: true,
            onSuccess: () => {
                setTempoPayment(null);
                setTempoAmount("");
            },
        }));
    };

    return (
        <ProtectedLayout title={title}>
            <div className="space-y-5">
                <PageHeader title={title} subtitle={isHistory ? "Riwayat transaksi yang sudah divalidasi. Pembayaran sisa DP dan tempo menunggu validasi kembali." : "Transaksi diajukan ke Validasi terlebih dahulu. Stok, kas, dan laporan berubah setelah disetujui."} />
                {!isHistory && <Card>
                    <form onSubmit={submit} className="space-y-5">
                        <div className="border-b border-stroke pb-4">
                            <h2 className="text-base font-extrabold text-main">Informasi Transaksi</h2>
                            <p className="mt-1 text-sm text-muted">{isBuy ? "Pilih supplier dan gudang tujuan, tambahkan barang, lalu lanjut ke pembayaran." : "Pilih sales, pilih customer, lalu scan barang. Pembayaran diatur pada langkah terakhir."}</p>
                        </div>
                        {!isBuy && <div className="grid gap-3 md:grid-cols-2">
                            <TransactionChoiceButton label="1. Sales" value={salesChosen ? selectedSales?.nama_sales || "Tanpa sales" : "Pilih sales"} hint={salesChosen ? "Ubah sales transaksi" : "Pilih sales atau pilih tanpa sales"} icon={IconUsers} error={errors.id_sales} onClick={() => setPicker("sales")} />
                            <TransactionChoiceButton label="2. Customer" value={customerName} hint={!salesChosen ? "Pilih sales terlebih dahulu" : selectedCustomer?.kode_customer || (form.manual_customer_name ? "Nama untuk transaksi ini" : "Pilih dari daftar atau isi nama")} icon={IconUser} error={errors.id_customer || errors.manual_customer_name} disabled={!salesChosen} onClick={() => setPicker("customer")} />
                        </div>}
                        {isBuy && <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Supplier</span>
                                <div className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 ${errors.id_supplier ? "border-red-500" : "border-stroke"}`}>
                                    <div className="min-w-0"><p className="break-words text-sm font-bold text-main">{selectedSupplier?.nama_supplier || "Belum dipilih"}</p>{selectedSupplier?.kode_supplier && <p className="text-xs text-muted">{selectedSupplier.kode_supplier}</p>}</div>
                                    <Button variant="outline" aria-haspopup="dialog" onClick={() => setPicker("supplier")}>{selectedSupplier ? "Ganti" : "Pilih Supplier"}</Button>
                                </div>
                                {errors.id_supplier && <p role="alert" className="text-xs text-red-500">{errors.id_supplier}</p>}
                            </div>
                            <Field label="Gudang Tujuan"><Select error={!!errors.id_gudang} value={form.id_gudang} onChange={(event) => changePurchaseWarehouse(event.target.value)}><option value="">Pilih gudang tujuan</option>{(refs.gudang || []).map((row) => <option key={row.id} value={row.id}>{row.nama_gudang} ({row.tipe_gudang === "BOTOL" ? "Botol Kosong" : "Cairan"})</option>)}</Select></Field>
                        </div>}
                        <Field label="Scan Barcode">
                            <div className="flex flex-wrap items-start gap-2">
                                <div className="min-w-0 flex-1">
                                    <Input value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); scanBarcode(); } }} placeholder="Scan barcode, lalu Enter" />
                                </div>
                                <BarcodeLookup items={barcodeItems} onSelect={selectBarcodeItem} onOpen={prepareBarcodeSelection} purchase={isBuy} enabled={!picker && !paymentOpen && !modalOpen && !bulkOpen && !tempoPayment && !submitting} />
                            </div>
                        </Field>
                        {errors.id_gudang && <p role="alert" className="text-sm text-red-600">{errors.id_gudang}</p>}
                        {errors.items && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{errors.items}</div>}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stroke pt-5">
                            <div>
                                <h2 className="text-base font-extrabold text-main">{isBuy ? "Daftar Barang" : "3. Pilih Barang"}</h2>
                                <span className="text-xs font-medium text-muted">{form.items.length} item</span>
                            </div>
                            <div className="flex flex-wrap items-start gap-2">
                               <Button icon={IconPlus} variant="outline" onClick={openAddModal}>Tambah Barang</Button>
                            </div>
                        </div>
                        {!form.items.length && <div className="rounded-xl border border-dashed border-stroke bg-page/40 px-5 py-8 text-center"><p className="text-sm font-bold text-main">Belum ada barang</p><p className="mt-1 text-xs text-muted">{!isBuy && !salesChosen ? "Mulai dengan memilih sales di atas." : !isBuy && !form.id_customer && !form.manual_customer_name ? "Pilih customer sebelum menambahkan barang." : "Scan barcode lalu tekan Enter, atau buka Pilih Barang untuk mencari dan mengatur jumlah."}</p></div>}
                        {/* Item Summary Table */}
                        {form.items.length > 0 && (
                            <div className="overflow-x-auto rounded-xl border border-stroke bg-card">
                                <table className="min-w-full divide-y divide-stroke text-sm">
                                    <thead className="bg-page/80 text-left">
                                        <tr>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-10 text-center">No</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-28">Kode</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted">Nama Barang</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-40">Qty</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-36 text-right">Harga</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-40 text-right">Total</th>
                                            <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted w-20 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stroke/70">
                                        {(() => {
                                            let runningNo = 1;
                                            return form.items.map((item, index) => {
                                                const selected = findSelectedItem(refs, item);
                                                const price = Number(item.harga || defaultItemPrice(selected, item, isBuy, isWholesale) || 0);
                                                const convertedQty = convertQty(item, selected, refs);
                                                const subtotal = item.tipe_item === "BOTOL" && item.satuan_input === "DUS"
                                                    ? Number(item.qty_input || 0) * price
                                                    : convertedQty * price;
                                                const kode = item.tipe_item === "BOTOL"
                                                    ? (selected?.kode_botol || "-")
                                                    : (selected?.kode_barang || "-");
                                                const namaBarang = item.tipe_item === "BOTOL"
                                                    ? (selected?.nama_botol || "-")
                                                    : (selected?.nama_barang || "-");
                                                const itemBotolVariant = item.id_botol
                                                    ? (refs.botol || []).find((b) => Number(b.id) === Number(item.id_botol))
                                                    : null;
                                                const botolInfo = item.satuan_input === "BOTOL" && itemBotolVariant
                                                    ? ` (${itemBotolVariant.nama_botol} ${itemBotolVariant.varian_ml} ML)`
                                                    : selected?.botol ? ` ${selected.botol.varian_ml} ML` : "";
                                                const qtyDisplay = item.tipe_item === "BOTOL"
                                                    ? `${number(convertedQty)} Botol`
                                                    : `${number(item.qty_input)} ${isBuy && item.satuan_input === "BOTOL" ? "BOTOL ISI" : item.satuan_input}${botolInfo}`;
                                                const no = runningNo++;
                                                return (
                                                    <tr key={index} className="transition-colors duration-150 hover:bg-page/50">
                                                        <td className="px-3 py-2.5 text-center font-medium text-muted">{no}</td>
                                                        <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-main">{kode}</td>
                                                        <td className="px-3 py-2.5 font-medium text-main">{namaBarang}{botolInfo ? <span className="text-muted font-normal"> - {botolInfo}</span> : ""}{!isBuy && item.id_gudang && <div className="mt-2"><Select aria-label={`Gudang sumber ${namaBarang}`} value={item.id_gudang} onChange={(event) => updateItem(index, "id_gudang", event.target.value)}>{(refs.gudang || []).filter((warehouse) => warehouse.tipe_gudang === (item.tipe_item === "BOTOL" ? "BOTOL" : "BIBIT")).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.nama_gudang}</option>)}</Select></div>}</td>
                                                        <td className="px-3 py-2.5 font-medium text-main">{qtyDisplay}</td>
                                                        <td className="px-3 py-2.5 text-right font-medium text-main">{money(price)}</td>
                                                        <td className="px-3 py-2.5 text-right font-extrabold text-main">{money(subtotal)}</td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Button icon={IconPencil} iconOnly variant="outline" size="sm" onClick={() => openEditModal(index)} title="Edit" />
                                                                <Button icon={IconTrash} iconOnly variant="danger" size="sm" onClick={() => removeItem(index)} title="Hapus" />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-page/80 font-bold">
                                            <td colSpan={4} className="px-3 py-2.5 text-right text-[10px] uppercase tracking-widest text-muted">Subtotal</td>
                                            <td className="px-3 py-2.5 text-right text-sm text-main"></td>
                                            <td className="px-3 py-2.5 text-right text-sm font-extrabold text-main">{money(transactionSubtotal)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button type="submit" icon={IconCreditCard} loading={submitting} disabled={form.items.length === 0}>Lanjut Pembayaran</Button>
                        </div>
                    </form>
                </Card>}

                {picker === "supplier" && isBuy && (
                    <TransactionPickerModal
                        title="Pilih Supplier"
                        searchLabel="Supplier"
                        options={visibleSupplier.map((row) => ({ value: row.id, label: row.nama_supplier, description: row.kode_supplier }))}
                        selectedValue={form.id_supplier}
                        onSelect={changePurchaseSupplier}
                        onClose={() => setPicker(null)}
                        error={errors.id_supplier}
                    />
                )}
                {picker && !isBuy && (
                    <TransactionPickerModal
                        key={picker}
                        title={picker === "customer" ? "Pilih Customer" : "Pilih Sales"}
                        options={picker === "customer"
                            ? customers.map((row) => ({ value: row.id, label: row.nama_customer, description: row.kode_customer }))
                            : [{ value: "", label: "Tanpa sales", description: "Transaksi tanpa sales" }, ...(refs.sales || []).map((row) => ({ value: row.id, label: row.nama_sales, description: [row.kode_sales, row.no_hp].filter(Boolean).join(" · ") }))]}
                        selectedValue={picker === "customer" ? form.id_customer : form.id_sales}
                        manualName={picker === "customer" ? form.manual_customer_name : ""}
                        onManualConfirm={picker === "customer" ? selectCustomerName : undefined}
                        onSelect={picker === "customer" ? selectCustomer : (value) => { set("id_sales", value); setSalesChosen(true); setPicker("customer"); }}
                        onClose={() => setPicker(null)}
                        error={picker === "customer" ? errors.id_customer || errors.manual_customer_name : errors.id_sales}
                    />
                )}

                {paymentOpen && (
                    <TransactionDialog title={paymentTitle} onClose={() => { if (!submitting) setPaymentOpen(false); }} width="max-w-lg">
                        <form onSubmit={submit} className="space-y-5" aria-label={paymentTitle}>
                            <div className="flex flex-wrap justify-between gap-3 rounded-lg bg-page px-4 py-3 text-sm">
                                <div className="min-w-0"><span className="text-xs text-muted">{isBuy ? "Supplier" : "Customer"}</span><p className="break-words font-bold text-main">{isBuy ? visibleSupplier.find((row) => String(row.id) === String(form.id_supplier))?.nama_supplier || "Belum dipilih" : customerName}</p></div>
                                <div className="text-right"><span className="text-xs text-muted">{form.items.length} item</span><p className="font-bold tabular-nums text-main">{money(transactionSubtotal)}</p></div>
                            </div>
                            <fieldset disabled={submitting} className="space-y-4">
                                <Field label="Metode Pembayaran">
                                    <Select name="metode_pembayaran" value={form.metode_pembayaran} onChange={(event) => selectPayment(event.target.value)} searchable={false} disabled={submitting} error={!!errors.metode_pembayaran}>
                                        {(isBuy || isWholesale ? payments : retailPayments).map((method) => <option key={method} value={method}>{paymentLabels[method].label}</option>)}
                                    </Select>
                                    {errors.metode_pembayaran && <p role="alert" className="text-xs text-red-500">{errors.metode_pembayaran}</p>}
                                </Field>
                                {["CASH", "TRANSFER"].includes(form.metode_pembayaran) && <div><Field label={form.metode_pembayaran === "CASH" ? "Uang Cash (Rp)" : "Nominal Transfer (Rp)"}>
                                    <CurrencyInput required error={!!errors.jumlah_bayar} value={form.jumlah_bayar} onChange={(event) => set("jumlah_bayar", event.target.value)} placeholder="Isi nominal pembayaran" />
                                    {errors.jumlah_bayar && <p role="alert" className="text-xs text-red-500">{errors.jumlah_bayar}</p>}
                                </Field><Button className="mt-2" variant="outline" onClick={() => set("jumlah_bayar", String(paymentTotal))}>Isi Nominal Otomatis · {money(paymentTotal)}</Button></div>}
                                {form.metode_pembayaran === "SPLIT" && <div className="grid gap-3 sm:grid-cols-2">
                                    <div><Field label="Uang Cash (Rp)"><CurrencyInput required value={form.cash_amount} error={!!errors.cash_amount} onChange={(event) => set("cash_amount", event.target.value)} placeholder="Bagian tunai" />{errors.cash_amount && <p role="alert" className="text-xs text-red-500">{errors.cash_amount}</p>}</Field>
                                        <Button className="mt-2" variant="outline" disabled={!Number.isFinite(splitTransfer) || splitTransfer <= 0 || remainingCash <= 0} onClick={() => set("cash_amount", String(remainingCash))}>Isi Nominal Otomatis · {money(remainingCash)}</Button>
                                    </div>
                                    <Field label="Nominal Transfer (Rp)"><CurrencyInput required value={form.transfer_amount} error={!!errors.transfer_amount} onChange={(event) => set("transfer_amount", event.target.value)} placeholder="Bagian transfer" />{errors.transfer_amount && <p role="alert" className="text-xs text-red-500">{errors.transfer_amount}</p>}</Field>
                                </div>}
                                {form.metode_pembayaran === "DP" && <Field label="Jumlah Uang Muka / DP (Rp)"><CurrencyInput required error={!!errors.jumlah_bayar} value={form.jumlah_bayar || ""} onChange={(event) => set("jumlah_bayar", event.target.value)} placeholder="0" />{errors.jumlah_bayar && <p role="alert" className="text-xs text-red-500">{errors.jumlah_bayar}</p>}</Field>}
                                {["TEMPO", "DP"].includes(form.metode_pembayaran) && <Field label="Jatuh Tempo"><Input required error={!!errors.jatuh_tempo} type="date" value={form.jatuh_tempo || ""} onChange={(event) => set("jatuh_tempo", event.target.value)} />{errors.jatuh_tempo && <p role="alert" className="text-xs text-red-500">{errors.jatuh_tempo}</p>}</Field>}
                                <Field label="Diskon (Rp)">
                                    <CurrencyInput error={!!errors.discount} value={form.discount || ""} onChange={(event) => set("discount", event.target.value)} placeholder="0" />
                                    {errors.discount && <p role="alert" className="text-xs text-red-500">{errors.discount}</p>}
                                </Field>
                                <div className="flex justify-end"><Button icon={IconPlus} onClick={addPayment} disabled={!!paymentIssue}>{paymentAdded ? "Perbarui Pembayaran" : "Tambah Pembayaran"}</Button></div>
                            </fieldset>
                            <PaymentTable rows={paymentAdded ? addedPayment.rows : []} scrollRequest={addedPayment} disabled={submitting} onRemove={() => setAddedPayment(null)} />
                            {paymentAdded && allowsChange && <div className="space-y-2 text-sm">
                                <div className="flex justify-between gap-3 text-main"><span>{form.metode_pembayaran === "SPLIT" ? "Total Cash + Transfer" : "Uang Cash"}</span><strong className="tabular-nums">{money(receivedPayment)}</strong></div>
                                <div className="flex justify-between gap-3 text-main"><span>Kembalian Cash</span><strong className="tabular-nums">{money(change)}</strong></div>
                            </div>}
                            {paymentIssue && <p role="alert" className="text-xs font-bold text-amber-700">{paymentIssue}</p>}
                            <PaymentSummary total={paymentTotal} amount={paymentAdded ? plannedPayment : 0} />
                            {!form.items.length && <p className="text-xs text-muted">Tambahkan barang sebelum menyimpan transaksi.</p>}
                            <div className="flex flex-wrap justify-end gap-2 border-t border-stroke pt-4">
                                <Button variant="outline" disabled={submitting} onClick={() => setPaymentOpen(false)}>Kembali</Button>
                                <Button type="submit" loading={submitting} disabled={!form.items.length || !!paymentIssue || !paymentAdded}>Ajukan Validasi</Button>
                            </div>
                        </form>
                    </TransactionDialog>
                )}

                {tempoPayment ? (
                    <TransactionDialog title={tempoPayment.isDp ? "Pembayaran Sisa DP" : "Pembayaran Tempo"} description="Masukkan jumlah pembayaran, lalu ajukan untuk divalidasi." onClose={() => setTempoPayment(null)} width="max-w-lg">
                        <form onSubmit={submitTempoPayment} className="space-y-5">
                            <div className="text-[13px] font-medium text-muted">
                                {tempoPayment.isDp ? "Pembayaran sisa DP" : "Pembayaran tempo"} <b className="font-bold text-main">{tempoPayment.number}</b>
                                <div className="mt-0.5">{tempoPayment.party || "-"}</div>
                                {tempoPayment.isDp && <div className="mt-0.5">DP awal: <b className="font-bold text-main">{money(tempoPayment.initialDp)}</b></div>}
                            </div>
                            <PaymentAmountEntry amount={tempoAmount} onChange={setTempoAmount} remaining={tempoPayment.remaining} error={errors.jumlah_bayar} label={tempoPayment.isDp ? "Sisa DP" : "Tempo"} />
                            <PaymentSummary total={tempoPayment.total} paid={tempoPayment.paid} remaining={tempoPayment.remaining} amount={tempoAmount} />
                            <PaymentHistory history={tempoPayment.history} />
                            {Object.entries(errors).filter(([key]) => key !== "jumlah_bayar").map(([key, error]) => <p key={key} role="alert" className="text-xs text-red-600">{error}</p>)}
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setTempoPayment(null)}>Batal</Button>
                                <Button type="submit" disabled={Number(tempoAmount || 0) <= 0 || Number(tempoAmount) > tempoPayment.remaining}>Ajukan Pembayaran</Button>
                            </div>
                        </form>
                    </TransactionDialog>
                ) : null}

                {isHistory && <>
                    <Card>
                        <div className="flex flex-wrap items-end gap-3">
                            <Field label="Tanggal Dari">
                                <Input type="date" value={filterForm.tanggal_dari} onChange={(e) => setFilter("tanggal_dari", e.target.value)} />
                            </Field>
                            <Field label="Tanggal Sampai">
                                <Input type="date" value={filterForm.tanggal_sampai} onChange={(e) => setFilter("tanggal_sampai", e.target.value)} />
                            </Field>
                            {!isBuy && !isBottleSale && (
                                <Field label="Tipe Penjualan">
                                    <Select value={filterForm.tipe_penjualan} onChange={(e) => setFilter("tipe_penjualan", e.target.value)}>
                                        <option value="">Semua</option>
                                        <option value="RETAIL">Retail</option>
                                        <option value="GROSIR">Sales</option>
                                    </Select>
                                </Field>
                            )}
                            {isBuy && (
                                <Field label="Supplier">
                                    <Select value={filterForm.id_supplier} onChange={(e) => setFilter("id_supplier", e.target.value)}>
                                        <option value="">Semua</option>
                                        {(refs.supplier || []).map((s) => <option key={s.id} value={s.id}>{s.kode_supplier} — {s.nama_supplier}</option>)}
                                    </Select>
                                </Field>
                            )}
                            <Field label="Cari No Transaksi">
                                <Input value={filterForm.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Cari..." />
                            </Field>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={resetFilter}>Reset</Button>
                                <Button onClick={applyFilter}>Cari</Button>
                            </div>
                        </div>
                    </Card>
                    <SimpleTable
                    rows={rows}
                    columns={isBuy ? [
                        { key: "no_pembelian", label: "No Pembelian" },
                        { key: "supplier", label: "Supplier", render: (row) => row.supplier ? `${row.supplier.kode_supplier} — ${row.supplier.nama_supplier}` : "-" },
                        { key: "gudang", label: "Gudang", render: (row) => row.gudang?.nama_gudang || "-" },
                        { key: "details", label: "Detail Barang / Barcode", render: historyItems },
                        { key: "total_qty_ml", label: "Qty ML", render: (row) => number(row.total_qty_ml) },
                        { key: "total_qty_botol", label: "Qty Botol", render: (row) => number(row.total_qty_botol) },
                        { key: "total_pembelian", label: "Total", render: (row) => money(row.total_pembelian) },
                        { key: "metode_pembayaran", label: "Metode Bayar", render: historyPaymentMethod },
                        { key: "status_pembayaran", label: "Status", render: (row) => row.status_pembayaran?.replaceAll("_", " ") || "-" },
                    ] : [
                        { key: "no_penjualan", label: "No Penjualan" },
                        { key: "customer", label: "Customer", render: (row) => row.customer?.nama_customer || row.manual_customer_name || "-" },
                        { key: "gudang", label: "Gudang", render: (row) => row.warehouse_label || row.gudang?.nama_gudang || "-" },
                        { key: "details", label: "Detail Barang / Barcode", render: historyItems },
                        { key: "total_qty_ml", label: "Qty ML", render: (row) => number(row.total_qty_ml) },
                        { key: "total_qty_botol", label: "Qty Botol", render: (row) => number(row.total_qty_botol) },
                        { key: "total_penjualan", label: "Total", render: (row) => money(row.total_penjualan) },
                        { key: "metode_pembayaran", label: "Metode Bayar", render: historyPaymentMethod },
                        { key: "status_pembayaran", label: "Status", render: (row) => row.status_pembayaran?.replaceAll("_", " ") || "-" },
                        { key: "laba_kotor", label: "Laba", render: (row) => money(row.laba_kotor) },
                    ]}
                    renderActions={isHistory ? (row) => <KebabMenu row={row} isBuy={isBuy} onPrint={() => isBuy ? window.open(`/admin/pembelian/${row.id}/pdf`, "_blank", "noopener,noreferrer") : openCustomerSlip(`/admin/penjualan-nota/${row.id}/slip`)} onPayTempo={canPayTempo(row, isBuy) ? () => openTempoPayment(row) : null} /> : (row) => (
                        <>
                            {canPayTempo(row, isBuy) ? (
                                <Button size="sm" variant="outline" onClick={() => openTempoPayment(row)}>
                                    {isDpPayment(row) ? "Bayar Sisa DP" : "Bayar Tempo"}
                                </Button>
                            ) : null}
                            <Button
                                icon={IconFileTypePdf}
                                size="sm"
                                variant="outline"
                                onClick={() => isBuy ? window.open(`/admin/pembelian/${row.id}/pdf`, "_blank", "noopener,noreferrer") : openCustomerSlip(`/admin/penjualan-nota/${row.id}/slip`)}
                            >
                                Nota
                            </Button>
                        </>
                    )}
                /></>}

                {/* Item Modal */}
                {bulkOpen && <BulkItemModal refs={refs} isBuy={isBuy} isWholesale={isWholesale} isBottleSale={isBottleSale} gudangId={form.id_gudang} onSave={saveBulkItems} onClose={() => setBulkOpen(false)} />}
                {modalOpen && (
                    <ItemModal
                        form={modalForm}
                        setForm={setModalForm}
                        onSave={saveModalItem}
                        onClose={() => setModalOpen(false)}
                        isEdit={editingIndex !== null}
                        isBuy={isBuy}
                        isWholesale={isWholesale}
                        refs={refs}
                        gudangId={form.id_gudang}
                        isBottleSale={isBottleSale}
                    />
                )}
            </div>
        </ProtectedLayout>
    );
}

function historyItems(row) {
    if (!row.details?.length) return "-";
    return (
        <ul className="space-y-2">
            {row.details.map((item) => (
                <li key={item.id}>
                    <p className="font-mono text-xs">{transactionItemCode(item) || "-"}</p>
                    <p>{item.nama_item || item.barang?.nama_barang || item.botol_kosong?.nama_botol || item.botol?.nama_botol || "-"}</p>
                    <p className="text-xs text-muted">{number(item.qty_input ?? item.konversi_qty_dasar ?? item.qty_ml)} {item.satuan_input || item.satuan_dasar || "ML"}</p>
                </li>
            ))}
        </ul>
    );
}

function itemOptions(refs, type) {
    if (type === "BOTOL") return refs.botol_kosong || [];

    return (refs.barang || []).filter((row) => (type === "ABSOLUTE" ? row.jenis_barang === "ABSOLUTE" : row.jenis_barang !== "ABSOLUTE"));
}

function itemOptionLabel(row, type, isBuy, isWholesale, refs, gudangId) {
    const stockWarehouseId = isBuy ? gudangId : row.id_gudang;
    if (type === "BOTOL") {
        const stockInfo = gudangId ? ` — Stok: ${number(row.stock || 0)} Botol` : "";
        return `${row.kode_botol || "-"} - ${row.nama_botol}${stockInfo}`;
    }

    // Pembelian: hanya tampilkan kode_barang dan nama_barang
    if (isBuy) {
        return `${row.kode_barang || "-"} - ${row.nama_barang}`;
    }

    const botol = row.botol?.varian_ml ? ` - ${row.botol.varian_ml} ML` : " - Botol belum dipilih";
    const stock = stockWarehouseId
        ? refs?.stok_gudang?.filter((s) => Number(s.id_barang) === Number(row.id) && Number(s.id_gudang) === Number(stockWarehouseId)).reduce((sum, s) => sum + Number(s.stok_ml || 0), 0)
        : null;
    const stockInfo = stockWarehouseId ? ` — Stok: ${number(stock || 0)} ML` : "";
    return `${row.kode_barang || "-"} - ${row.nama_barang}${botol}${stockInfo}`;
}

function findSelectedItem(refs, item) {
    return itemOptions(refs, item.tipe_item).find((row) => String(row.id) === String(item.item_id));
}

function defaultItemPrice(selected, item, isBuy, isWholesale) {
    if (!selected) return 0;
    if (item.tipe_item === "BOTOL") {
        if (isBuy) return selected.harga_beli || 0;
        return selected.harga_jual || 0;
    }

    if (isBuy) return selected.harga_beli_per_ml || 0;
    if (isWholesale && Number(selected.harga_jual_grosir_per_ml || 0) > 0) return selected.harga_jual_grosir_per_ml;
    return selected.harga_jual_retail_per_ml || 0;
}

function convertQty(item, selected, refs) {
    const qty = Number(item.qty_input || 0);
    if (item.tipe_item === "BOTOL") {
        return item.satuan_input === "DUS" ? qty : qty;
    }

    if (item.satuan_input === "BOTOL") {
        const botolVariant = item.id_botol
            ? (refs?.botol || []).find((b) => Number(b.id) === Number(item.id_botol))
            : null;
        return qty * Number(botolVariant?.varian_ml || selected?.botol?.varian_ml || 0);
    }

    return item.satuan_input === "LITER" ? qty * 1000 : qty;
}

function getTempoRecord(row, isBuy) {
    return isBuy ? row.hutang : row.piutang;
}

function isDpPayment(row) {
    // DP is stored as TEMPO; jumlah_bayar retains the original down payment, not later installments.
    return row.metode_pembayaran === "DP"
        || (row.metode_pembayaran === "TEMPO" && Number(row.jumlah_bayar) > 0);
}

function historyPaymentMethod(row) {
    const method = isDpPayment(row) ? "DP" : row.metode_pembayaran;
    return <div>
        <p>{paymentLabels[method]?.label || method}</p>
        {method === "DP" && <p className="mt-1 text-xs text-muted">DP awal: {money(row.jumlah_bayar)}</p>}
        <PaymentBreakdown details={row.payment_details} />
    </div>;
}

function canPayTempo(row, isBuy) {
    if (!["TEMPO", "DP"].includes(row.metode_pembayaran)) return false;
    const record = getTempoRecord(row, isBuy);
    if (!record) return false;

    return Number(isBuy ? record.sisa_hutang || 0 : record.sisa_piutang || 0) > 0;
}

function KebabMenu({ row, isBuy, onPrint, onPayTempo }) {
    const [open, setOpen] = useState(false);
    const [dropUp, setDropUp] = useState(false);
    const buttonRef = useRef(null);

    const toggle = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // If the button is in the bottom 200px of the viewport, open upward
            setDropUp(window.innerHeight - rect.bottom < 200);
        }
        setOpen(!open);
    };

    return (
        <div className="relative inline-block" ref={buttonRef}>
            <button type="button" onClick={toggle} className="rounded-lg p-1.5 text-muted hover:bg-page hover:text-main transition-colors">
                <IconDotsVertical size={16} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className={`absolute right-0 z-20 w-44 rounded-xl border border-stroke bg-card py-1.5 shadow-premium text-sm ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                        <button type="button" onClick={() => { onPrint(); setOpen(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left font-medium text-main hover:bg-page transition-colors">
                            <IconFileTypePdf size={14} className="text-muted" /> {isBuy ? "Bukti PDF" : "Cetak Slip"}
                        </button>
                        {onPayTempo && (
                            <button type="button" onClick={() => { onPayTempo(); setOpen(false); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left font-medium text-amber-600 hover:bg-page transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                {" "}{isDpPayment(row) ? "Bayar Sisa DP" : "Bayar Tempo"}
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function BulkItemModal({ refs, isBuy, isWholesale, isBottleSale, gudangId, onSave, onClose }) {
    const [search, setSearch] = useState("");
    const [type, setType] = useState(isBottleSale ? "BOTOL" : "ALL");
    const [chosen, setChosen] = useState({});
    const candidates = [
        ...(!isBottleSale ? (refs.barang || []).map((row) => ({ row, type: row.jenis_barang === "ABSOLUTE" ? "ABSOLUTE" : "BIBIT" })) : []),
        ...(refs.botol_kosong || []).map((row) => ({ row, type: "BOTOL" })),
    ].filter(({ row, type: itemType }) => {
        if (row.status && row.status !== "AKTIF") return false;
        if (isBuy) {
            const warehouse = (refs.gudang || []).find((entry) => Number(entry.id) === Number(gudangId));
            return warehouse?.tipe_gudang === (itemType === "BOTOL" ? "BOTOL" : "BIBIT")
                && (itemType !== "BOTOL" || Number(row.id_gudang) === Number(gudangId));
        }
        return true;
    }).map((entry) => ({ ...entry, key: `${entry.type}-${entry.row.id}` }));
    const query = search.trim().toLocaleLowerCase();
    const visible = candidates.filter((entry) => (type === "ALL" || entry.type === type)
        && `${entry.row.kode_barang || entry.row.kode_botol || ""} ${entry.row.nama_barang || entry.row.nama_botol}`.toLocaleLowerCase().includes(query));
    const createItem = ({ row, type: itemType }) => {
        const unit = defaultTransactionUnit(itemType, row, isBuy, isWholesale);
        return { tipe_item: itemType, item_id: row.id, qty_input: 1, satuan_input: unit, harga: "", id_botol: itemType === "BIBIT" && unit === "BOTOL" ? row.id_botol || "" : "" };
    };
    const toggle = (entry) => setChosen((previous) => {
        const next = { ...previous };
        if (next[entry.key]) delete next[entry.key];
        else next[entry.key] = createItem(entry);
        return next;
    });
    const update = (key, values) => setChosen((previous) => ({ ...previous, [key]: { ...previous[key], ...values } }));
    const allVisible = visible.length > 0 && visible.every((entry) => chosen[entry.key]);
    const selectVisible = () => setChosen((previous) => {
        const next = { ...previous };
        visible.forEach((entry) => {
            if (allVisible) delete next[entry.key];
            else if (!next[entry.key]) next[entry.key] = createItem(entry);
        });
        return next;
    });
    const count = Object.keys(chosen).length;
    return <TransactionDialog title="Tambah Beberapa Barang" onClose={onClose} width="max-w-3xl">
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Cari Barang"><Input data-autofocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama atau kode barang" /></Field>
                {!isBottleSale && <Field label="Tipe Barang"><Select value={type} onChange={(event) => setType(event.target.value)}><option value="ALL">Semua jenis</option><option value="BIBIT">Bibit</option><option value="ABSOLUTE">Absolute</option><option value="BOTOL">Botol Kosong</option></Select></Field>}
            </div>
            <div className="flex items-center justify-between gap-3">
                <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-bold text-main"><input type="checkbox" checked={allVisible} disabled={!visible.length} onChange={selectVisible} className="size-4 accent-primary" />Pilih semua hasil</label>
                <span className="text-sm tabular-nums text-muted">{count} dipilih</span>
            </div>
            <div className="max-h-[45vh] space-y-3 overflow-y-auto">
                {visible.map((entry) => {
                    const item = chosen[entry.key];
                    return <div key={entry.key} className={`rounded-xl border p-3 ${item ? "border-primary bg-primary/5" : "border-stroke"}`}>
                        <label className="flex min-h-10 cursor-pointer items-center gap-3">
                            <input type="checkbox" checked={!!item} onChange={() => toggle(entry)} className="size-4 shrink-0 accent-primary" />
                            <span className="min-w-0"><span className="block break-words text-sm font-bold text-main">{entry.row.nama_barang || entry.row.nama_botol}</span><span className="text-xs text-muted">{entry.row.kode_barang || entry.row.kode_botol} · {entry.type}</span></span>
                        </label>
                        {item && <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <Field label="Jumlah"><Input type="number" min="0.01" step="any" value={item.qty_input} onChange={(event) => update(entry.key, { qty_input: event.target.value })} /></Field>
                            <Field label="Satuan"><Select value={item.satuan_input} onChange={(event) => update(entry.key, { satuan_input: event.target.value, id_botol: "", harga: "" })}>{(entry.type === "BOTOL" ? bottleUnits : isBuy ? purchaseLiquidUnits : liquidUnits).map((unit) => <option key={unit} value={unit}>{isBuy && unit === "BOTOL" && entry.type !== "BOTOL" ? "BOTOL ISI" : unit}</option>)}</Select></Field>
                            <Field label={entry.type === "BOTOL" ? "Harga" : "Harga / ML"}><CurrencyInput value={item.harga || defaultItemPrice(entry.row, item, isBuy, isWholesale) || ""} readOnly={!isBuy} onChange={isBuy ? (event) => update(entry.key, { harga: event.target.value }) : undefined} /></Field>
                            {entry.type !== "BOTOL" && item.satuan_input === "BOTOL" && <div className="sm:col-span-3"><Field label="Varian Botol"><Select value={item.id_botol || ""} onChange={(event) => update(entry.key, { id_botol: event.target.value })}><option value="">{entry.row.botol ? `Default: ${entry.row.botol.nama_botol}` : "Pilih varian botol"}</option>{(refs.botol || []).map((bottle) => <option key={bottle.id} value={bottle.id}>{bottle.nama_botol}</option>)}</Select></Field></div>}
                        </div>}
                    </div>;
                })}
                {!visible.length && <p role="status" className="py-6 text-center text-sm text-muted">Tidak ada barang yang sesuai dengan supplier, gudang, atau pencarian.</p>}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-stroke pt-4"><Button variant="outline" onClick={onClose}>Batal</Button><Button icon={IconPlus} disabled={!count} onClick={() => onSave(Object.values(chosen))}>Tambahkan Terpilih ({count})</Button></div>
        </div>
    </TransactionDialog>;
}

function ItemModal({ form, setForm, onSave, onClose, isEdit, isBuy, isWholesale, refs, gudangId, isBottleSale }) {
    const selected = findSelectedItem(refs, form);
    const options = itemOptions(refs, form.tipe_item).filter((row) => !isBuy || form.tipe_item !== "BOTOL" || Number(row.id_gudang) === Number(gudangId));
    const unitOptions = form.tipe_item === "BOTOL"
        ? bottleUnits
        : (isBuy ? purchaseLiquidUnits : liquidUnits);
    const defaultPrice = defaultItemPrice(selected, form, isBuy, isWholesale);
    const price = Number(form.harga || defaultPrice || 0);
    const convertedQty = convertQty(form, selected, refs);
    const subtotal = form.tipe_item === "BOTOL" && form.satuan_input === "DUS"
        ? Number(form.qty_input || 0) * price
        : convertedQty * price;

    const selectedBotolVariant = form.id_botol
        ? (refs.botol || []).find((b) => Number(b.id) === Number(form.id_botol))
        : null;

    const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const updateQty = (value) => {
        const defPrice = defaultItemPrice(findSelectedItem(refs, { ...form, qty_input: value }), { ...form, qty_input: value }, isBuy, isWholesale);
        setForm((prev) => ({
            ...prev,
            qty_input: value,
            harga: !isBuy && value !== "" && !prev.harga ? defPrice : prev.harga,
        }));
    };

    const handleSelectItem = (itemId) => {
        if (String(itemId) !== String(form.item_id)) set("id_gudang", "");
        set("item_id", itemId);
        set("harga", "");

    };
    return (
        <TransactionDialog title={isEdit ? "Edit Barang" : "Pilih Barang"} onClose={onClose} width="max-w-lg">
                <div className="space-y-4">
                    <Field label="Tipe Barang">
                        <Select value={form.tipe_item} disabled={isBottleSale} onChange={(event) => {
                            const nextType = event.target.value;
                            set("tipe_item", nextType);
                            set("id_gudang", "");
                            set("item_id", "");
                            set("id_botol", "");
                            set("harga", "");
                            set("satuan_input", nextType === "BOTOL" ? "BOTOL" : "ML");
                        }}>
                            {!isBottleSale && <option value="BIBIT">Bibit</option>}
                            {!isBottleSale && <option value="ABSOLUTE">Absolute</option>}
                            <option value="BOTOL">Botol Kosong</option>
                        </Select>
                    </Field>
                    <Field label={isBottleSale ? "Pilih Botol Kosong" : "Pilih Barang"}>
                        <Select value={form.item_id} onChange={(event) => handleSelectItem(event.target.value)}>
                            <option value="">Pilih barang...</option>
                            {options.map((row) => <option key={row.id} value={row.id}>{itemOptionLabel(row, form.tipe_item, isBuy, isWholesale, refs, gudangId)}</option>)}
                        </Select>
                        {isBuy && form.tipe_item !== "BOTOL" && options.length === 0 && <p role="status" className="mt-1 text-xs text-amber-700">Belum ada barang untuk supplier ini. Hubungkan supplier di master Barang Bibit terlebih dahulu.</p>}
                        {!isBuy && gudangId && options.length === 0 && <p className="mt-1 text-[11px] font-medium text-amber-600">Tidak ada stok untuk tipe barang ini di gudang yang dipilih.</p>}
                    </Field>
                    {form.tipe_item !== "BOTOL" && form.satuan_input === "BOTOL" && (
                        <Field label="Varian Botol">
                            <Select
                                value={form.id_botol || ""}
                                onChange={(e) => {
                                    set("id_botol", e.target.value);
                                    set("harga", "");
                                }}
                            >
                                <option value="">{selected?.botol ? `Default: ${selected.botol.nama_botol}` : "Pilih varian botol"}</option>
                                {(refs.botol || []).map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.nama_botol}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Jumlah">
                            <Input type="number" value={form.qty_input} onChange={(event) => updateQty(event.target.value)} />
                        </Field>
                        <Field label="Satuan">
                            <Select value={form.satuan_input} onChange={(event) => { set("satuan_input", event.target.value); set("harga", ""); if (event.target.value !== "BOTOL") set("id_botol", ""); }}>
                                {unitOptions.map((unit) => (
                                    <option key={unit} value={unit}>
                                        {isBuy && unit === "BOTOL" && form.tipe_item !== "BOTOL" ? "BOTOL ISI" : unit}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label={form.tipe_item !== "BOTOL" ? (isBuy ? "Harga Beli / ML" : "Harga Jual / ML") : (isBuy ? "Harga Beli" : "Harga Jual")}>
                            <CurrencyInput
                                value={isBuy ? form.harga || "" : price || ""}
                                placeholder={formatInputNumber(defaultPrice || "")}
                                onChange={isBuy ? (event) => set("harga", event.target.value) : undefined}
                                readOnly={!isBuy}
                            />
                        </Field>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="rounded-lg bg-page/60 px-3.5 py-2.5">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted">Subtotal</div>
                            <div className="mt-1 text-lg font-extrabold text-main">{money(subtotal)}</div>
                            <div className="text-[11px] text-muted">{number(convertedQty)} {form.tipe_item === "BOTOL" ? "Botol" : "ML"}</div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-stroke px-5 py-4">
                    <Button variant="outline" onClick={onClose}>Batal</Button>
                    <Button onClick={onSave}>{isEdit ? "Update" : "Simpan"}</Button>
                </div>
        </TransactionDialog>
    );
}
