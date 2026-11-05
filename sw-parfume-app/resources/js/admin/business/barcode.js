export function barcodeMatches(row, code) {
    return [row.barcode, row.kode_barang, row.kode_botol].some((value) => value != null && String(value).trim().toUpperCase() === code.trim().toUpperCase());
}

export function matchesPurchaseSupplier(item, supplierId) {
    return Boolean(supplierId) && (item.suppliers || []).some((supplier) => Number(supplier.id) === Number(supplierId));
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

function warehouseStock(item, bottle, stocks, warehouseId) {
    if (bottle) {
        return Array.isArray(item.warehouse_stocks)
            ? Number(item.warehouse_stocks.find((row) => Number(row.id_gudang) === Number(warehouseId))?.quantity || 0)
            : Number(item.id_gudang) === Number(warehouseId) ? Number(item.stock || 0) : 0;
    }
    return stocks.filter((row) => Number(row.id_barang) === Number(item.id) && Number(row.id_gudang) === Number(warehouseId))
        .reduce((sum, row) => sum + Number(row.stok_ml || 0), 0);
}

export function stockWarehouseOptions(item, bottle, warehouses, stocks = []) {
    return warehouses.filter((row) => (!row.status || row.status === "AKTIF") && row.tipe_gudang === (bottle ? "BOTOL" : "BIBIT"))
        .map((row) => ({ ...row, stock: warehouseStock(item, bottle, stocks, row.id) }))
        .filter((row) => Number.isFinite(row.stock) && row.stock > 0)
        .sort((a, b) => Number(Number(b.id) === Number(item.id_gudang)) - Number(Number(a.id) === Number(item.id_gudang)));
}

export function outgoingWarehouse(item, bottle, warehouses, stocks = [], warehouseId = "") {
    const locations = stockWarehouseOptions(item, bottle, warehouses, stocks);
    const warehouse = warehouseId
        ? locations.find((row) => Number(row.id) === Number(warehouseId))
        : locations[0];
    if (warehouse) return warehouse;
    throw new Error(`Stok ${item.nama_barang || item.nama_botol || "barang"} kosong${warehouseId ? " di gudang yang dipilih" : ""}. Barang tidak dapat ditambahkan.`);
}

function automaticWarehouseOptions(item, bottle, warehouses, stocks, incoming = false) {
    const candidates = warehouses.filter((row) => (!row.status || row.status === "AKTIF") && row.tipe_gudang === (bottle ? "BOTOL" : "BIBIT"));
    if (!incoming) {
        const stocked = stockWarehouseOptions(item, bottle, candidates, stocks);
        if (stocked.length) return stocked;
    }
    if (item.id_gudang) {
        return candidates.filter((row) => Number(row.id) === Number(item.id_gudang));
    }
    if (candidates.length === 1) return candidates;
    const stocked = stockWarehouseOptions(item, bottle, candidates, stocks);
    if (stocked.length === 1) return stocked;
    return [];
}

export function itemStockDetails(item, type, { warehouses = [], stocks = [], warehouseId = "", incoming = false } = {}) {
    const bottle = type === "BOTOL";
    const warehouse = warehouseId
        ? warehouses.find((row) => Number(row.id) === Number(warehouseId)
            && (!row.status || row.status === "AKTIF") && row.tipe_gudang === (bottle ? "BOTOL" : "BIBIT"))
        : automaticWarehouseOptions(item, bottle, warehouses, stocks, incoming)[0]
            || automaticWarehouseOptions(item, bottle, warehouses, stocks, true)[0];
    const stock = warehouse ? warehouseStock(item, bottle, stocks, warehouse.id) : null;
    return {
        warehouseId: warehouse?.id ?? null,
        warehouse: warehouse?.nama_gudang || "Belum ditentukan",
        stock: Number.isFinite(stock) ? stock : null,
        unit: bottle ? "BOTOL" : "ML",
        suppliers: (item.suppliers || []).map((supplier) => supplier.nama_supplier).filter(Boolean),
    };
}

export function automaticWarehouse(item, bottle, warehouses, stocks = [], incoming = false) {
    const [warehouse] = automaticWarehouseOptions(item, bottle, warehouses, stocks, incoming);
    if (warehouse) return warehouse;
    throw new Error(item.id_gudang
        ? "Gudang barang tidak aktif atau tipenya tidak sesuai. Perbaiki master barang."
        : "Gudang otomatis belum dapat ditentukan. Tetapkan gudang barang di master terlebih dahulu.");
}

export function purchaseWarehouse(item, bottle, warehouses, warehouseId) {
    const warehouse = warehouses.find((row) => Number(row.id) === Number(warehouseId) && (!row.status || row.status === "AKTIF"));
    if (!warehouse) throw new Error("Pilih gudang tujuan terlebih dahulu.");
    if (warehouse.tipe_gudang !== (bottle ? "BOTOL" : "BIBIT")) {
        throw new Error("Jenis gudang tujuan tidak sesuai dengan barang. Pisahkan pembelian cairan dan botol kosong.");
    }
    return warehouse;
}

export function availableBarcodeItems({ barang = [], bottles = [], warehouses = [], stocks = [], warehouseId = "", supplierWarehouseId = "", purchase = false, incoming = false }) {
    const items = [
        ...barang.map((row) => ({ row, type: row.jenis_barang === "ABSOLUTE" ? "ABSOLUTE" : "BIBIT" })),
        ...bottles.map((row) => ({ row, type: "BOTOL" })),
    ];
    return items.flatMap(({ row, type }) => {
        if (row.status && row.status !== "AKTIF") return [];
        const code = String(type === "BOTOL" ? row.kode_botol || row.barcode || "" : row.kode_barang || row.barcode || "").trim();
        if (!code) return [];
        const locations = (purchase || warehouseId)
            ? warehouses.filter((entry) => Number(entry.id) === Number(warehouseId)
                && (!entry.status || entry.status === "AKTIF")
                && entry.tipe_gudang === (type === "BOTOL" ? "BOTOL" : "BIBIT"))
            : automaticWarehouseOptions(row, type === "BOTOL", warehouses, stocks, incoming);
        return locations.flatMap((warehouse) => {
            if (supplierWarehouseId && Number(supplierWarehouseId) !== Number(warehouse.id)) return [];
            const stock = warehouseStock(row, type === "BOTOL", stocks, warehouse.id);
            if (!Number.isFinite(stock) || (!purchase && !incoming && stock <= 0)) return [];
            return [{ id: `${type}-${row.id}-${warehouse.id}`, itemId: row.id, code, name: row.nama_barang || row.nama_botol, type, stock, unit: type === "BOTOL" ? "BOTOL" : "ML", warehouseId: warehouse.id, warehouse: warehouse.nama_gudang, suppliers: (row.suppliers || []).map((supplier) => supplier.nama_supplier).filter(Boolean) }];
        });
    });
}

export function filterBarcodeItems(items, search, type = "") {
    const query = search.trim().toLocaleLowerCase();
    return items.filter((item) => (!type || item.type === type)
        && `${item.code} ${item.name} ${item.warehouse} ${(item.suppliers || []).join(" ")}`.toLocaleLowerCase().includes(query));
}

export function isBarcodeShortcut(event, isMac = false) {
    return (event.key === "F1" || event.code === "F1")
        && (isMac ? !event.ctrlKey : !!event.ctrlKey)
        && !event.metaKey && !event.altKey && !event.shiftKey
        && !event.repeat && !event.isComposing && !event.defaultPrevented;
}
