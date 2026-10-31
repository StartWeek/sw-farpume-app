export function barcodeMatches(row, code) {
    return [row.barcode, row.kode_barang, row.kode_botol].some((value) => value != null && String(value).trim().toUpperCase() === code.trim().toUpperCase());
}

export function defaultTransactionUnit(type, row, isBuy, isWholesale) {
    return type === "BOTOL" || ((isBuy || isWholesale) && type === "BIBIT" && Number(row.botol?.varian_ml) > 0)
        ? "BOTOL"
        : "ML";
}

export function transactionItemCode(item) {
    return item.tipe_item === "BOTOL"
        ? item.botol_kosong?.kode_botol || item.botol?.kode_botol || ""
        : item.barang?.kode_barang || "";
}

function automaticWarehouseOptions(item, bottle, warehouses, stocks) {
    const candidates = warehouses.filter((row) => row.tipe_gudang === (bottle ? "BOTOL" : "BIBIT"));
    if (item.id_gudang) {
        return candidates.filter((row) => Number(row.id) === Number(item.id_gudang));
    }
    if (candidates.length === 1) return candidates;
    const locations = [...new Set(stocks.filter((row) => Number(row.id_barang) === Number(item.id) && Number(row.stok_ml) > 0).map((row) => Number(row.id_gudang)))];
    if (!bottle && locations.length === 1) {
        return candidates.filter((row) => Number(row.id) === locations[0]);
    }
    return [];
}

export function automaticWarehouse(item, bottle, warehouses, stocks = []) {
    const [warehouse] = automaticWarehouseOptions(item, bottle, warehouses, stocks);
    if (warehouse) return warehouse;
    throw new Error(item.id_gudang
        ? "Gudang barang tidak aktif atau tipenya tidak sesuai. Perbaiki master barang."
        : "Gudang otomatis belum dapat ditentukan. Tetapkan gudang barang di master terlebih dahulu.");
}

export function availableBarcodeItems({ barang = [], bottles = [], warehouses = [], stocks = [], warehouseId = "", supplierWarehouseId = "" }) {
    const items = [
        ...barang.map((row) => ({ row, type: row.jenis_barang === "ABSOLUTE" ? "ABSOLUTE" : "BIBIT" })),
        ...bottles.map((row) => ({ row, type: "BOTOL" })),
    ];
    return items.flatMap(({ row, type }) => {
        if (row.status && row.status !== "AKTIF") return [];
        const code = String(type === "BOTOL" ? row.kode_botol || row.barcode || "" : row.kode_barang || row.barcode || "").trim();
        if (!code) return [];
        const [warehouse] = automaticWarehouseOptions(row, type === "BOTOL", warehouses, stocks);
        if (!warehouse || (warehouseId && Number(warehouseId) !== Number(warehouse.id))
            || (supplierWarehouseId && Number(supplierWarehouseId) !== Number(warehouse.id))) return [];
        const stock = type === "BOTOL"
            ? Number(row.stock || 0)
            : stocks.filter((entry) => Number(entry.id_barang) === Number(row.id) && Number(entry.id_gudang) === Number(warehouse.id))
                .reduce((sum, entry) => sum + Number(entry.stok_ml || 0), 0);
        if (!Number.isFinite(stock) || stock <= 0) return [];
        return [{ id: `${type}-${row.id}`, itemId: row.id, code, name: row.nama_barang || row.nama_botol, type, stock, unit: type === "BOTOL" ? "BOTOL" : "ML", warehouse: warehouse.nama_gudang }];
    });
}

export function filterBarcodeItems(items, search, type = "") {
    const query = search.trim().toLocaleLowerCase();
    return items.filter((item) => (!type || item.type === type)
        && `${item.code} ${item.name} ${item.warehouse}`.toLocaleLowerCase().includes(query));
}

export function isBarcodeShortcut(event, isMac = false) {
    return (event.key === "F1" || event.code === "F1")
        && (isMac ? !event.ctrlKey : !!event.ctrlKey)
        && !event.metaKey && !event.altKey && !event.shiftKey
        && !event.repeat && !event.isComposing && !event.defaultPrevented;
}
