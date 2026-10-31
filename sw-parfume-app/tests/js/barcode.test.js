import test from "node:test";
import assert from "node:assert/strict";
import { automaticWarehouse, availableBarcodeItems, barcodeMatches, filterBarcodeItems, isBarcodeShortcut, transactionItemCode } from "../../resources/js/admin/business/barcode.js";

test("bibit and absolute use their existing item code as barcode", () => {
    for (const jenis_barang of ["BIBIT", "ABSOLUTE"]) {
        const row = { kode_barang: "BRG-0001", jenis_barang };
        assert.equal(barcodeMatches(row, "BRG-0001"), true);
        assert.equal(barcodeMatches(row, " brg-0001 "), true);
        assert.equal(barcodeMatches(row, "BRG-0002"), false);
    }
});

test("empty bottles use their existing bottle code as barcode", () => {
    const row = { kode_botol: "BTK-0001" };
    assert.equal(barcodeMatches(row, "BTK-0001"), true);
    assert.equal(barcodeMatches(row, " btk-0001 "), true);
    assert.equal(barcodeMatches(row, "BRG-0001"), false);
});

test("barcode lookup preserves leading zeroes and requires the complete code", () => {
    const row = { kode_barang: "BRG-0001" };
    assert.equal(barcodeMatches(row, "BRG-1"), false);
    assert.equal(barcodeMatches(row, "BRG-000"), false);
    assert.equal(barcodeMatches(row, ""), false);
    assert.equal(barcodeMatches({}, "BRG-0001"), false);
});

test("existing explicit barcode lookup remains supported", () => {
    const row = { barcode: "001234567890", kode_barang: "BRG-0001" };
    assert.equal(barcodeMatches(row, "001234567890"), true);
    assert.equal(barcodeMatches(row, "BRG-0001"), true);
    assert.equal(barcodeMatches(row, "1234567890"), false);
});

test("transaction details choose the barcode of the actual item, not its packaging", () => {
    assert.equal(transactionItemCode({ tipe_item: "BIBIT", barang: { kode_barang: "BRG-0001" }, botol: { kode_botol: "BTL-0001" } }), "BRG-0001");
    assert.equal(transactionItemCode({ tipe_item: "ABSOLUTE", barang: { kode_barang: "BRG-0002" } }), "BRG-0002");
    assert.equal(transactionItemCode({ tipe_item: "BOTOL", barang: { kode_barang: "BRG-0001" }, botol_kosong: { kode_botol: "BTK-0001" }, botol: { kode_botol: "BTL-0001" } }), "BTK-0001");
    assert.equal(transactionItemCode({ tipe_item: "BOTOL", botol: { kode_botol: "BTL-OLD" } }), "BTL-OLD");
    assert.equal(transactionItemCode({}), "");
});

const warehouses = [
    { id: 1, tipe_gudang: "BIBIT", nama_gudang: "Gudang Bibit" },
    { id: 2, tipe_gudang: "BOTOL", nama_gudang: "Gudang Botol" },
    { id: 3, tipe_gudang: "BIBIT", nama_gudang: "Gudang Cadangan" },
];
const catalogData = {
    warehouses,
    barang: [
        { id: 1, kode_barang: "BRG-0001", nama_barang: "Lavender", jenis_barang: "BIBIT", id_gudang: 1, status: "AKTIF" },
        { id: 2, kode_barang: "ABS-0002", nama_barang: "Absolute Rose", jenis_barang: "ABSOLUTE", id_gudang: 3 },
        { id: 3, kode_barang: "BRG-0003", nama_barang: "Stok kosong", id_gudang: 1 },
        { id: 4, kode_barang: "BRG-0004", nama_barang: "Tidak aktif", id_gudang: 1, status: "NONAKTIF" },
        { id: 5, kode_barang: "BRG-0005", nama_barang: "Lokasi salah", id_gudang: 2 },
    ],
    bottles: [
        { id: 1, kode_botol: "BTK-0001", nama_botol: "Botol 30 ML", id_gudang: 2, stock: "12.00" },
        { id: 2, kode_botol: "BTK-0002", nama_botol: "Botol kosong stok", id_gudang: 2, stock: 0 },
    ],
    stocks: [
        { id_barang: 1, id_gudang: 1, id_botol: 1, stok_ml: "100.25" },
        { id_barang: 1, id_gudang: 1, id_botol: 2, stok_ml: "50" },
        { id_barang: 1, id_gudang: 3, stok_ml: 999 },
        { id_barang: 2, id_gudang: 3, stok_ml: 0.25 },
        { id_barang: 3, id_gudang: 1, stok_ml: 0 },
        { id_barang: 4, id_gudang: 1, stok_ml: 30 },
        { id_barang: 5, id_gudang: 2, stok_ml: 30 },
    ],
};

test("lookup only lists active coded items with positive stock in their automatic warehouse", () => {
    const items = availableBarcodeItems(catalogData);
    assert.deepEqual(items.map((item) => item.code), ["BRG-0001", "ABS-0002", "BTK-0001"]);
    assert.equal(items[0].stock, 150.25);
    assert.equal(items[0].unit, "ML");
    assert.equal(items[1].stock, 0.25);
    assert.equal(items[2].stock, 12);
    assert.equal(items[2].unit, "BOTOL");
    assert.equal(new Set(items.map((item) => item.id)).size, items.length);
});

test("lookup respects supplier, transaction warehouse, and item types on every transaction", () => {
    assert.deepEqual(availableBarcodeItems({ ...catalogData, supplierWarehouseId: 1 }).map((item) => item.code), ["BRG-0001"]);
    assert.deepEqual(availableBarcodeItems({ ...catalogData, warehouseId: 2 }).map((item) => item.code), ["BTK-0001"]);
    assert.deepEqual(availableBarcodeItems({ ...catalogData, warehouseId: 1, supplierWarehouseId: 2 }), []);
    assert.deepEqual(availableBarcodeItems({ ...catalogData, barang: [] }).map((item) => item.type), ["BOTOL"]);
    assert.deepEqual(availableBarcodeItems({ ...catalogData, bottles: [] }).map((item) => item.type), ["BIBIT", "ABSOLUTE"]);
});

test("lookup excludes missing codes, invalid quantities, and unavailable warehouses", () => {
    const bottles = [
        { id: 1, kode_botol: "A", id_gudang: 2, stock: -1 },
        { id: 2, kode_botol: "B", id_gudang: 2, stock: "invalid" },
        { id: 3, kode_botol: "C", id_gudang: 9, stock: 12 },
        { id: 4, id_gudang: 2, stock: 12 },
    ];
    assert.deepEqual(availableBarcodeItems({ warehouses, bottles }), []);
    assert.deepEqual(availableBarcodeItems({ ...catalogData, warehouses: [] }), []);
    assert.deepEqual(availableBarcodeItems({}), []);
});

test("warehouse lookup preserves automatic assignment and errors", () => {
    assert.equal(automaticWarehouse({ id: 1, id_gudang: 1 }, false, warehouses).id, 1);
    assert.equal(automaticWarehouse({ id: 1 }, false, warehouses, [{ id_barang: 1, id_gudang: 3, stok_ml: 5 }]).id, 3);
    assert.equal(automaticWarehouse({ id: 1 }, true, warehouses).id, 2);
    assert.equal(automaticWarehouse({ id: 1 }, false, warehouses.slice(0, 2)).id, 1);
    assert.throws(() => automaticWarehouse({ id: 1, id_gudang: 2 }, false, warehouses), /tidak aktif atau tipenya/);
    assert.throws(() => automaticWarehouse({ id: 1 }, false, warehouses, [{ id_barang: 1, id_gudang: 1, stok_ml: 5 }, { id_barang: 1, id_gudang: 3, stok_ml: 5 }]), /belum dapat ditentukan/);
});

test("lookup searches full and partial codes, names, warehouses and filters kinds", () => {
    const items = availableBarcodeItems(catalogData);
    assert.deepEqual(filterBarcodeItems(items, " brg-0001 ").map((item) => item.code), ["BRG-0001"]);
    assert.deepEqual(filterBarcodeItems(items, "LAVEN").map((item) => item.code), ["BRG-0001"]);
    assert.deepEqual(filterBarcodeItems(items, "gudang botol").map((item) => item.code), ["BTK-0001"]);
    assert.deepEqual(filterBarcodeItems(items, "", "ABSOLUTE").map((item) => item.code), ["ABS-0002"]);
    assert.deepEqual(filterBarcodeItems(items, "Lavender", "BOTOL"), []);
});

test("barcode shortcut uses Control F1 on non-Mac and unmodified F1 sent by Fn F1 on Mac", () => {
    assert.equal(isBarcodeShortcut({ key: "F1", ctrlKey: true }), true);
    assert.equal(isBarcodeShortcut({ code: "F1", ctrlKey: true }), true);
    assert.equal(isBarcodeShortcut({ key: "F1" }, true), true);
    assert.equal(isBarcodeShortcut({ code: "F1" }, true), true);
    assert.equal(isBarcodeShortcut({ key: "F1", ctrlKey: true }, true), false);
    assert.equal(isBarcodeShortcut({ key: "F1", metaKey: true }), false);
    assert.equal(isBarcodeShortcut({ key: "F1", metaKey: true }, true), false);
    for (const event of [
        { key: "F1" }, { key: "f", ctrlKey: true }, { key: "F1", ctrlKey: true, altKey: true },
        { key: "F1", metaKey: true, shiftKey: true }, { key: "F1", ctrlKey: true, repeat: true },
        { key: "F1", metaKey: true, isComposing: true }, { key: "F1", ctrlKey: true, defaultPrevented: true },
    ]) assert.equal(isBarcodeShortcut(event), false);
    for (const event of [
        { key: "f" }, { key: "F1", altKey: true }, { key: "F1", shiftKey: true },
        { key: "F1", repeat: true }, { key: "F1", isComposing: true }, { key: "F1", defaultPrevented: true },
    ]) assert.equal(isBarcodeShortcut(event, true), false);
});
