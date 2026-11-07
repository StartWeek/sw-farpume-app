import test from "node:test";
import assert from "node:assert/strict";
import * as barcode from "../../resources/js/admin/business/barcode.js";

const warehouses = [
    { id: 1, tipe_gudang: "BIBIT", nama_gudang: "Utama" },
    { id: 2, tipe_gudang: "BIBIT", nama_gudang: "Cadangan" },
    { id: 3, tipe_gudang: "BOTOL", nama_gudang: "Botol" },
];

test("outgoing liquid selection rejects zero, missing, negative and invalid stock", () => {
    const item = { id: 1, id_gudang: 1, nama_barang: "Lavender" };
    for (const stok_ml of [0, "0.00", -1, "invalid", undefined]) {
        assert.throws(() => barcode.outgoingWarehouse(item, false, warehouses, [
            { id_barang: 1, id_gudang: 1, stok_ml },
        ]), /Stok Lavender kosong.*tidak dapat ditambahkan/);
    }
    assert.throws(() => barcode.outgoingWarehouse(item, false, warehouses), /Stok Lavender kosong/);
});

test("outgoing selection uses stocked warehouses and respects an explicit warehouse", () => {
    const item = { id: 1, id_gudang: 1, nama_barang: "Lavender" };
    const stocks = [
        { id_barang: 1, id_gudang: 1, stok_ml: 0 },
        { id_barang: 1, id_gudang: 2, stok_ml: "0.25" },
        { id_barang: 1, id_gudang: 2, stok_ml: "0.50" },
        { id_barang: 2, id_gudang: 1, stok_ml: 100 },
    ];
    assert.equal(barcode.outgoingWarehouse(item, false, warehouses, stocks).id, 2);
    assert.equal(barcode.outgoingWarehouse(item, false, warehouses, stocks, "2").stock, 0.75);
    assert.throws(() => barcode.outgoingWarehouse(item, false, warehouses, stocks, "1"), /Stok Lavender kosong/);
    assert.throws(() => barcode.outgoingWarehouse(item, false, [
        warehouses[0], { ...warehouses[1], status: "NONAKTIF" },
    ], stocks), /Stok Lavender kosong/);
});

test("outgoing empty bottles use stock at the selected warehouse", () => {
    const item = { id: 1, id_gudang: 3, nama_botol: "Botol 30 ML", stock: "0.00" };
    assert.throws(() => barcode.outgoingWarehouse(item, true, warehouses), /Stok Botol 30 ML kosong/);
    assert.equal(barcode.outgoingWarehouse({ ...item, stock: "2.00" }, true, warehouses).stock, 2);
    assert.throws(() => barcode.outgoingWarehouse({ ...item, stock: 10, warehouse_stocks: [
        { id_gudang: 3, quantity: 0 },
    ] }, true, warehouses), /Stok Botol 30 ML kosong/);
});

test("incoming purchases still allow an empty destination warehouse", () => {
    assert.equal(barcode.purchaseWarehouse({ id: 1 }, false, warehouses, 1).id, 1);
});
