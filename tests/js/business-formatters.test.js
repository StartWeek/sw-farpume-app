import test from "node:test";
import assert from "node:assert/strict";
import { formatBusinessDate, formatInputNumber } from "../../resources/js/admin/business/formatters.js";

test("database decimal money does not gain two zeroes", () => {
    assert.equal(formatInputNumber("10000.00"), "10.000");
    assert.equal(formatInputNumber("70000.00"), "70.000");
});

test("raw currency digits remain correctly grouped", () => {
    assert.equal(formatInputNumber("10000"), "10.000");
    assert.equal(formatInputNumber(""), "");
});

test("ISO database date is displayed as dd-mm-yy", () => {
    assert.equal(formatBusinessDate("2026-06-20T00:00:00.000000Z"), "20-06-26");
    assert.equal(formatBusinessDate("2026-06-21"), "21-06-26");
    assert.equal(formatBusinessDate(null), "-");
});
