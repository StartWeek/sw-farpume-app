import test from "node:test";
import assert from "node:assert/strict";
import { itemStockDetails, outgoingWarehouse } from "../../resources/js/admin/business/barcode.js";

const warehouses = [
    { id: 1, tipe_gudang: "BIBIT", nama_gudang: "Utama" },
    { id: 2, tipe_gudang: "BIBIT", nama_gudang: "Cadangan" },
    { id: 3, tipe_gudang: "BOTOL", nama_gudang: "Botol" },
];
const item = { id: 1, id_gudang: 1, suppliers: [{ nama_supplier: "Supplier A" }, { nama_supplier: "Supplier B" }] };
const stocks = [
    { id_barang: 1, id_gudang: 1, stok_ml: "12.25" },
    { id_barang: 1, id_gudang: 1, stok_ml: "2.5" },
    { id_barang: 1, id_gudang: 2, stok_ml: "30" },
    { id_barang: 2, id_gudang: 1, stok_ml: 100 },
];

test("item information shows the same warehouse and stock as outgoing selection", () => {
    const details = itemStockDetails(item, "BIBIT", { warehouses, stocks });
    const selected = outgoingWarehouse(item, false, warehouses, stocks);
    assert.equal(details.warehouseId, selected.id);
    assert.equal(details.warehouse, "Utama");
    assert.equal(details.stock, 14.75);
    assert.equal(details.unit, "ML");
    assert.deepEqual(details.suppliers, ["Supplier A", "Supplier B"]);
});

test("an explicit destination shows only its stock, including empty incoming stock", () => {
    assert.equal(itemStockDetails(item, "ABSOLUTE", { warehouses, stocks, warehouseId: "2" }).stock, 30);
    const details = itemStockDetails(item, "BIBIT", { warehouses, warehouseId: 2, incoming: true });
    assert.equal(details.warehouse, "Cadangan");
    assert.equal(details.stock, 0);
});

test("outgoing information follows stock to another warehouse while incoming follows the master", () => {
    const otherStock = [{ id_barang: 1, id_gudang: 2, stok_ml: 10 }];
    assert.equal(itemStockDetails(item, "BIBIT", { warehouses, stocks: otherStock }).warehouseId, 2);
    assert.equal(itemStockDetails(item, "BIBIT", { warehouses, stocks: otherStock, incoming: true }).warehouseId, 1);
    assert.equal(itemStockDetails(item, "BIBIT", { warehouses }).stock, 0);
});

test("bottle information uses per-warehouse quantities rather than total bottle stock", () => {
    const bottle = { id: 1, id_gudang: 3, stock: 99, warehouse_stocks: [{ id_gudang: 3, quantity: "4" }] };
    const details = itemStockDetails(bottle, "BOTOL", { warehouses });
    assert.equal(details.stock, 4);
    assert.equal(details.unit, "BOTOL");
    assert.equal(itemStockDetails({ ...bottle, warehouse_stocks: [] }, "BOTOL", { warehouses }).stock, 0);
    assert.equal(itemStockDetails({ id: 1, id_gudang: 3, stock: 7 }, "BOTOL", { warehouses }).stock, 7);
});

test("missing, incompatible and inactive warehouses and invalid stock are not shown as valid stock", () => {
    assert.equal(itemStockDetails(item, "BIBIT").stock, null);
    assert.equal(itemStockDetails(item, "BIBIT", { warehouses, warehouseId: 3 }).stock, null);
    assert.equal(itemStockDetails(item, "BIBIT", { warehouses: [{ ...warehouses[0], status: "NONAKTIF" }] }).warehouseId, null);
    assert.equal(itemStockDetails(item, "BIBIT", { warehouses, warehouseId: 1, stocks: [{ id_barang: 1, id_gudang: 1, stok_ml: "invalid" }] }).stock, null);
    assert.deepEqual(itemStockDetails({ id: 1 }, "ABSOLUTE").suppliers, []);
});
