import test from "node:test";
import assert from "node:assert/strict";
import { defaultTransactionUnit } from "../../resources/js/admin/business/barcode.js";

test("retail liquid scans default to ML even with a master bottle", () => {
    for (const type of ["BIBIT", "ABSOLUTE"]) {
        assert.equal(defaultTransactionUnit(type, { botol: { varian_ml: 100 } }, false, false), "ML");
        assert.equal(defaultTransactionUnit(type, {}, false, false), "ML");
    }
});

test("purchase and wholesale bottle defaults are preserved", () => {
    for (const [isBuy, isWholesale] of [[true, false], [false, true]]) {
        assert.equal(defaultTransactionUnit("BIBIT", { botol: { varian_ml: 100 } }, isBuy, isWholesale), "BOTOL");
        assert.equal(defaultTransactionUnit("BIBIT", {}, isBuy, isWholesale), "ML");
        assert.equal(defaultTransactionUnit("ABSOLUTE", { botol: { varian_ml: 100 } }, isBuy, isWholesale), "ML");
    }
});

test("empty bottles always default to BOTOL", () => {
    assert.equal(defaultTransactionUnit("BOTOL", {}, false, false), "BOTOL");
    assert.equal(defaultTransactionUnit("BOTOL", {}, true, false), "BOTOL");
});
