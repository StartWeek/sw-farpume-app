import test, { after, afterEach, before } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { router } from "@inertiajs/react";
import { createServer } from "vite";

let server;
let Button;
let PaginationBar;
let GrossProfitSummary;
const originalGet = router.get;
const originalWindow = globalThis.window;

before(async () => {
    server = await createServer({
        configFile: false,
        root: fileURLToPath(new URL("../../", import.meta.url)),
        resolve: { alias: { "@": fileURLToPath(new URL("../../resources/js", import.meta.url)) } },
        optimizeDeps: { noDiscovery: true, include: [] },
        plugins: [{
            name: "isolate-report-layout",
            enforce: "pre",
            load(id) {
                if (id.endsWith("/components/layouts/ProtectedLayout.jsx")) return "export default function ProtectedLayout() { return null; }";
            },
        }],
        server: { middlewareMode: true, hmr: false, watch: null },
        appType: "custom",
    });
    ({ default: Button } = await server.ssrLoadModule("/resources/js/components/common/Button.jsx"));
    ({ PaginationBar } = await server.ssrLoadModule("/resources/js/admin/business/_components.jsx"));
    ({ GrossProfitSummary } = await server.ssrLoadModule("/resources/js/admin/business/ReportPage.jsx"));
});

after(async () => {
    await server?.close();
});

afterEach(() => {
    router.get = originalGet;
    if (originalWindow === undefined) {
        delete globalThis.window;
    } else {
        globalThis.window = originalWindow;
    }
});

const pagination = { current_page: 3, last_page: 7, per_page: 10, total: 61, from: 21, to: 30 };

test("gross profit highlights daily profit without subtracting discounts twice", () => {
    const html = renderToStaticMarkup(React.createElement(GrossProfitSummary, {
        summary: { "Total Penjualan": 500000, Modal: 300000, "Laba Kotor": 200000, Diskon: 50000 },
        filters: { tanggal_dari: "2026-10-31", tanggal_sampai: "2026-10-31" },
        systemDate: "2026-10-31",
    }));
    assert.match(html, /Laba Kotor Hari Ini/);
    assert.match(html, /200\.000/);
    assert.match(html, /Penjualan Setelah Diskon/);
    assert.match(html, /Modal Barang Terjual \(HPP\)/);
    assert.match(html, /text-main/);
    assert.doesNotMatch(html, /bg-emerald|text-emerald/);
    assert.match(html, /Belum laba bersih/);
    assert.match(html, /Penjualan belum lunas tetap termasuk/);
    assert.match(html, /<details[^>]*>/);
    assert.doesNotMatch(html, /<details[^>]*\bopen/);
});

test("gross profit distinguishes daily totals, period totals and losses", () => {
    for (const [filters, heading] of [
        [{ tanggal_dari: "2026-10-30", tanggal_sampai: "2026-10-30" }, "Laba Kotor Harian"],
        [{ tanggal_dari: "2026-10-01", tanggal_sampai: "2026-10-31" }, "Laba Kotor Periode"],
        [{}, "Laba Kotor Periode"],
    ]) {
        const html = renderToStaticMarkup(React.createElement(GrossProfitSummary, {
            summary: { "Total Penjualan": 100000, Modal: 150000, "Laba Kotor": -50000 },
            filters, systemDate: "2026-10-31",
        }));
        assert.match(html, new RegExp(heading));
        assert.match(html, /text-main/);
        assert.match(html, /Rugi kotor/);
        assert.doesNotMatch(html, /Laba Kotor Hari Ini/);
    }
});

function elements(element, type) {
    if (!React.isValidElement(element)) return [];
    return [
        ...(element.type === type ? [element] : []),
        ...React.Children.toArray(element.props.children).flatMap((child) => elements(child, type)),
    ];
}

test("default action buttons are compact and preserve disabled/loading behavior", () => {
    const html = renderToStaticMarkup(React.createElement(Button, {}, "Setujui & Proses"));
    assert.match(html, /min-h-10/);
    assert.match(html, /text-sm/);
    assert.match(html, /rounded-xl/);
    assert.doesNotMatch(html, /transition-all|text-base|py-3/);
    for (const props of [{ disabled: true }, { loading: true }]) {
        assert.match(renderToStaticMarkup(React.createElement(Button, props, "Proses")), /disabled=""/);
    }
    assert.match(renderToStaticMarkup(React.createElement(Button, { iconOnly: true }, "›")), /size-10/);
});

test("pagination is accessible and keeps the available page sizes", () => {
    const html = renderToStaticMarkup(React.createElement(PaginationBar, { pagination }));
    assert.match(html, /<nav aria-label="Navigasi halaman"/);
    assert.match(html, /aria-label="Halaman sebelumnya"/);
    assert.match(html, /aria-label="Halaman berikutnya"/);
    const select = elements(PaginationBar({ pagination }), "select")[0];
    assert.deepEqual(React.Children.toArray(select.props.children).map((option) => option.props.value), [10, 25, 50]);
    const firstPage = elements(PaginationBar({ pagination: { ...pagination, current_page: 1 } }), Button);
    const lastPage = elements(PaginationBar({ pagination: { ...pagination, current_page: 7 } }), Button);
    assert.equal(firstPage[0].props.disabled, true);
    assert.equal(lastPage[1].props.disabled, true);
});

test("secondary pagination preserves applied filters and other table pages", () => {
    globalThis.window = { location: { pathname: "/admin/laporan/stok", search: "?search=1&barcode=BRG-021&page=2&botol_page=3&groups_page=2" } };
    let visit;
    router.get = (...args) => { visit = args; };
    const buttons = elements(PaginationBar({ pagination, pageName: "botol_page" }), Button);
    buttons[1].props.onClick();
    const url = new URL(visit[0], "http://localhost");
    assert.equal(url.searchParams.get("botol_page"), "4");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("groups_page"), "2");
    assert.equal(url.searchParams.get("barcode"), "BRG-021");
    assert.equal(url.searchParams.get("search"), "1");
    assert.equal(visit[2].preserveState, true);
});

test("changing page size resets every table page without losing filters", () => {
    globalThis.window = { location: { pathname: "/admin/laporan/stok", search: "?search=1&id_gudang=1&page=2&botol_page=3&groups_page=2" } };
    let url;
    router.get = (value) => { url = new URL(value, "http://localhost"); };
    elements(PaginationBar({ pagination, pageName: "botol_page" }), "select")[0].props.onChange({ target: { value: "25" } });
    assert.equal(url.searchParams.get("botol_page"), "1");
    assert.equal(url.searchParams.get("per_page"), "25");
    assert.equal(url.searchParams.get("id_gudang"), "1");
    assert.equal(url.searchParams.has("page"), false);
    assert.equal(url.searchParams.has("groups_page"), false);
});
