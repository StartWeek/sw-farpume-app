import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import React, { useMemo, useState } from "react";
import {
    Card,
    PageHeader,
    SimpleTable,
    formatBusinessDate,
    money,
    number,
    useFlashMessages,
} from "./_components";
import {
    IconAlertTriangle,
    IconArrowUpRight,
    IconBottle,
    IconBuildingWarehouse,
    IconCalendar,
    IconCash,
    IconChartBar,
    IconCoins,
    IconCreditCard,
    IconReportAnalytics,
    IconShoppingCart,
    IconTrendingUp,
    IconWallet,
} from "@tabler/icons-react";

/** Format compact currency (e.g. 96.9Jt) for chart axis */
function compactMoney(val) {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}Jt`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}Rb`;
    return `${val}`;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Interactive Sales & Profit Trend Area Chart
// ─────────────────────────────────────────────────────────────
function SalesTrendChart({ trend7d = [], trend30d = [] }) {
    const [period, setPeriod] = useState("7d"); // '7d' | '30d'
    const [hoverIndex, setHoverIndex] = useState(null);

    const activeData = period === "7d" ? trend7d : trend30d;

    // Dimensions
    const W = 800;
    const H = 260;
    const padL = 65;
    const padR = 25;
    const padT = 25;
    const padB = 40;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    // Max value calculation
    const maxVal = useMemo(() => {
        if (!activeData.length) return 1_000_000;
        const highest = Math.max(
            ...activeData.map((d) => Math.max(Number(d.omzet || 0), Number(d.laba || 0))),
        );
        return highest > 0 ? highest * 1.15 : 1_000_000;
    }, [activeData]);

    // Totals for active period
    const totalOmzet = useMemo(
        () => activeData.reduce((acc, d) => acc + Number(d.omzet || 0), 0),
        [activeData],
    );
    const totalLaba = useMemo(
        () => activeData.reduce((acc, d) => acc + Number(d.laba || 0), 0),
        [activeData],
    );
    const totalTrx = useMemo(
        () => activeData.reduce((acc, d) => acc + Number(d.transaksi || 0), 0),
        [activeData],
    );

    // Calculate Coordinates
    const points = useMemo(() => {
        if (!activeData.length) return { omzet: [], laba: [] };
        const len = activeData.length;
        const omzetPts = [];
        const labaPts = [];

        activeData.forEach((d, i) => {
            const x = padL + (i / Math.max(len - 1, 1)) * plotW;
            const yOmzet = padT + plotH - (Number(d.omzet || 0) / maxVal) * plotH;
            const yLaba = padT + plotH - (Number(d.laba || 0) / maxVal) * plotH;
            omzetPts.push({ x, y: yOmzet, data: d });
            labaPts.push({ x, y: yLaba, data: d });
        });

        return { omzet: omzetPts, laba: labaPts };
    }, [activeData, maxVal, plotW, plotH, padL, padT]);

    // SVG Path Generators (Smooth Bezier)
    const makePath = (pts) => {
        if (!pts.length) return "";
        let path = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const curr = pts[i];
            const next = pts[i + 1];
            const mx = (curr.x + next.x) / 2;
            path += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
        }
        return path;
    };

    const makeAreaPath = (pts) => {
        if (!pts.length) return "";
        const line = makePath(pts);
        const bottomY = padT + plotH;
        return `${line} L ${pts[pts.length - 1].x} ${bottomY} L ${pts[0].x} ${bottomY} Z`;
    };

    const omzetLinePath = useMemo(() => makePath(points.omzet), [points.omzet]);
    const omzetAreaPath = useMemo(() => makeAreaPath(points.omzet), [points.omzet]);
    const labaLinePath = useMemo(() => makePath(points.laba), [points.laba]);

    // Y Axis Gridlines (4 intervals)
    const yGrid = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
        val: maxVal * pct,
        y: padT + plotH - pct * plotH,
    }));

    const hovered = hoverIndex !== null ? activeData[hoverIndex] : null;
    const hoveredPoint = hoverIndex !== null ? points.omzet[hoverIndex] : null;

    return (
        <Card className="overflow-hidden">
            {/* Header & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <IconTrendingUp size={18} />
                        </span>
                        <h2 className="text-base font-bold text-main">Grafik Tren Penjualan & Laba</h2>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                        Perkembangan omzet kotor dan laba bersih operasional parfum
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Period Switcher */}
                    <div className="flex rounded-lg border border-stroke bg-page p-1 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => {
                                setPeriod("7d");
                                setHoverIndex(null);
                            }}
                            className={`rounded-md px-3 py-1 transition-colors ${
                                period === "7d"
                                    ? "bg-card text-primary shadow-sm"
                                    : "text-muted hover:text-main"
                            }`}
                        >
                            7 Hari Terakhir
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setPeriod("30d");
                                setHoverIndex(null);
                            }}
                            className={`rounded-md px-3 py-1 transition-colors ${
                                period === "30d"
                                    ? "bg-card text-primary shadow-sm"
                                    : "text-muted hover:text-main"
                            }`}
                        >
                            30 Hari Terakhir
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Metrics Banner */}
            <div className="grid grid-cols-3 gap-3 border-b border-stroke/60 py-3.5 sm:gap-6">
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Omzet Periode</span>
                    <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 sm:text-lg">
                        {money(totalOmzet)}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Laba Bersih</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 sm:text-lg">
                        {money(totalLaba)}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Transaksi</span>
                    <span className="text-base font-extrabold text-main sm:text-lg">
                        {number(totalTrx)} Penjualan
                    </span>
                </div>
            </div>

            {/* SVG Chart Area */}
            <div className="relative mt-2 w-full select-none">
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full overflow-visible"
                    style={{ maxHeight: "300px" }}
                >
                    <defs>
                        {/* Omzet Area Gradient */}
                        <linearGradient id="omzetGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.28" />
                            <stop offset="90%" stopColor="#2563EB" stopOpacity="0.01" />
                        </linearGradient>
                        {/* Laba Area Gradient */}
                        <linearGradient id="labaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
                            <stop offset="90%" stopColor="#10B981" stopOpacity="0.01" />
                        </linearGradient>
                    </defs>

                    {/* Y-Axis Horizontal Gridlines */}
                    {yGrid.map((grid, idx) => (
                        <g key={idx}>
                            <line
                                x1={padL}
                                y1={grid.y}
                                x2={W - padR}
                                y2={grid.y}
                                stroke="currentColor"
                                className="text-stroke/50"
                                strokeDasharray={idx === 0 ? "none" : "3 3"}
                                strokeWidth="1"
                            />
                            <text
                                x={padL - 10}
                                y={grid.y + 3.5}
                                textAnchor="end"
                                className="fill-muted text-[10.5px] font-medium"
                            >
                                {compactMoney(grid.val)}
                            </text>
                        </g>
                    ))}

                    {/* Omzet Filled Area */}
                    {omzetAreaPath && <path d={omzetAreaPath} fill="url(#omzetGradient)" />}

                    {/* Laba Line (Emerald) */}
                    {labaLinePath && (
                        <path
                            d={labaLinePath}
                            fill="none"
                            stroke="#10B981"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Omzet Line (Blue) */}
                    {omzetLinePath && (
                        <path
                            d={omzetLinePath}
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* X-Axis Labels */}
                    {activeData.map((d, i) => {
                        // For 30d, skip some labels to prevent clutter
                        if (period === "30d" && i % 4 !== 0 && i !== activeData.length - 1) return null;
                        const x = padL + (i / Math.max(activeData.length - 1, 1)) * plotW;
                        return (
                            <text
                                key={d.date}
                                x={x}
                                y={H - 12}
                                textAnchor="middle"
                                className="fill-muted text-[11px] font-semibold"
                            >
                                {d.label}
                            </text>
                        );
                    })}

                    {/* Hover Guide Line & Dots */}
                    {hoverIndex !== null && hoveredPoint && (
                        <g>
                            <line
                                x1={hoveredPoint.x}
                                y1={padT}
                                x2={hoveredPoint.x}
                                y2={padT + plotH}
                                stroke="#2563EB"
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                            />
                            {/* Omzet Dot */}
                            <circle
                                cx={hoveredPoint.x}
                                cy={points.omzet[hoverIndex].y}
                                r="5.5"
                                fill="#2563EB"
                                stroke="#ffffff"
                                strokeWidth="2.5"
                            />
                            {/* Laba Dot */}
                            <circle
                                cx={hoveredPoint.x}
                                cy={points.laba[hoverIndex].y}
                                r="4.5"
                                fill="#10B981"
                                stroke="#ffffff"
                                strokeWidth="2"
                            />
                        </g>
                    )}

                    {/* Invisible Hover Hitboxes across columns */}
                    {activeData.map((_, i) => {
                        const colW = plotW / activeData.length;
                        const x = padL + (i / Math.max(activeData.length - 1, 1)) * plotW - colW / 2;
                        return (
                            <rect
                                key={i}
                                x={x}
                                y={padT}
                                width={colW}
                                height={plotH + padB}
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoverIndex(i)}
                                onMouseLeave={() => setHoverIndex(null)}
                            />
                        );
                    })}
                </svg>

                {/* Floating Interactive Tooltip */}
                {hovered && hoveredPoint && (
                    <div
                        className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-stroke bg-card p-3 shadow-xl transition-all duration-75"
                        style={{
                            left: `${(hoveredPoint.x / W) * 100}%`,
                            top: `${Math.max(10, (hoveredPoint.y / H) * 100 - 8)}%`,
                            minWidth: "160px",
                        }}
                    >
                        <div className="border-b border-stroke pb-1.5 text-xs font-bold text-main">
                            {hovered.day ? `${hovered.day}, ` : ""}
                            {formatBusinessDate(hovered.date)}
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                            <div className="flex items-center justify-between gap-3 text-blue-600 dark:text-blue-400">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <span className="size-2 rounded-full bg-blue-600" />
                                    Omzet:
                                </span>
                                <span className="font-extrabold">{money(hovered.omzet)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                                <span className="flex items-center gap-1.5 font-medium">
                                    <span className="size-2 rounded-full bg-emerald-600" />
                                    Laba:
                                </span>
                                <span className="font-extrabold">{money(hovered.laba)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-muted">
                                <span>Transaksi:</span>
                                <span className="font-semibold text-main">{hovered.transaksi} Nota</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-6 border-t border-stroke/50 pt-3 text-xs">
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-blue-600" />
                    <span className="font-semibold text-main">Omzet Penjualan</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-600" />
                    <span className="font-semibold text-main">Laba Kotor</span>
                </div>
            </div>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Top 5 Best Selling Perfume Products Bar Chart
// ─────────────────────────────────────────────────────────────
function TopProductsChart({ products = {} }) {
    const [criterion, setCriterion] = useState("omzet"); // 'omzet' | 'volume' | 'frekuensi'

    // Extract list based on active criterion (supports both object with tabs or legacy array)
    const activeList = useMemo(() => {
        if (!products) return [];
        if (Array.isArray(products)) {
            const list = [...products];
            if (criterion === "volume") {
                return list.sort((a, b) => Number(b.total_ml || 0) - Number(a.total_ml || 0));
            }
            if (criterion === "frekuensi") {
                return list.sort((a, b) => Number(b.total_transaksi || 0) - Number(a.total_transaksi || 0));
            }
            return list.sort((a, b) => Number(b.total_omzet || 0) - Number(a.total_omzet || 0));
        }
        return products[criterion] || [];
    }, [products, criterion]);

    // Maximum value calculation for proportional bar width
    const maxVal = useMemo(() => {
        if (!activeList.length) return 1;
        if (criterion === "volume") {
            return Math.max(...activeList.map((p) => Number(p.total_ml || 0)), 1);
        }
        if (criterion === "frekuensi") {
            return Math.max(...activeList.map((p) => Number(p.total_transaksi || 0)), 1);
        }
        return Math.max(...activeList.map((p) => Number(p.total_omzet || 0)), 1);
    }, [activeList, criterion]);

    const criteriaConfig = {
        omzet: {
            subtitle: "Berdasarkan akumulasi nilai rupiah penjualan",
            gradient: "from-primary to-amber-500",
            getValue: (item) => money(item.total_omzet),
            getDetail: (item) => `${number(item.total_transaksi)} trx${item.total_ml > 0 ? ` · ${number(item.total_ml)} ML` : ""}`,
        },
        volume: {
            subtitle: "Berdasarkan volume bibit parfum yang dikeluarkan",
            gradient: "from-violet-500 to-indigo-500",
            getValue: (item) => `${number(item.total_ml)} ML`,
            getDetail: (item) => `${money(item.total_omzet)} · ${number(item.total_transaksi)} trx`,
        },
        frekuensi: {
            subtitle: "Berdasarkan seberapa sering produk dibeli (transaksi)",
            gradient: "from-emerald-500 to-teal-500",
            getValue: (item) => `${number(item.total_transaksi)} Transaksi`,
            getDetail: (item) => `${money(item.total_omzet)}${item.total_ml > 0 ? ` · ${number(item.total_ml)} ML` : ""}`,
        },
    };

    const currentConf = criteriaConfig[criterion];

    return (
        <Card className="flex flex-col justify-between">
            <div>
                {/* Header & Criteria Filter Tabs */}
                <div className="border-b border-stroke pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                                <IconBottle size={18} />
                            </span>
                            <div>
                                <h3 className="text-sm font-bold text-main">Top 5 Produk Terlaris</h3>
                                <p className="text-[11px] text-muted">{currentConf.subtitle}</p>
                            </div>
                        </div>
                    </div>

                    {/* Criteria Selector Tabs */}
                    <div className="mt-3 flex rounded-lg border border-stroke bg-page p-1 text-[11px] font-semibold">
                        <button
                            type="button"
                            onClick={() => setCriterion("omzet")}
                            className={`flex-1 rounded-md py-1 text-center transition-colors ${
                                criterion === "omzet"
                                    ? "bg-card text-primary font-bold shadow-sm"
                                    : "text-muted hover:text-main"
                            }`}
                        >
                            Omzet (Rp)
                        </button>
                        <button
                            type="button"
                            onClick={() => setCriterion("volume")}
                            className={`flex-1 rounded-md py-1 text-center transition-colors ${
                                criterion === "volume"
                                    ? "bg-card text-primary font-bold shadow-sm"
                                    : "text-muted hover:text-main"
                            }`}
                        >
                            Volume (ML)
                        </button>
                        <button
                            type="button"
                            onClick={() => setCriterion("frekuensi")}
                            className={`flex-1 rounded-md py-1 text-center transition-colors ${
                                criterion === "frekuensi"
                                    ? "bg-card text-primary font-bold shadow-sm"
                                    : "text-muted hover:text-main"
                            }`}
                        >
                            Frekuensi
                        </button>
                    </div>
                </div>

                {/* Ranked Product List */}
                <div className="mt-4 space-y-3.5">
                    {activeList.length > 0 ? (
                        activeList.map((item, idx) => {
                            const val =
                                criterion === "volume"
                                    ? Number(item.total_ml || 0)
                                    : criterion === "frekuensi"
                                    ? Number(item.total_transaksi || 0)
                                    : Number(item.total_omzet || 0);

                            const pct = Math.min(
                                100,
                                Math.max(6, Math.round((val / maxVal) * 100)),
                            );

                            const rankColors = [
                                "bg-amber-500 text-white",
                                "bg-slate-400 text-white",
                                "bg-amber-700 text-white",
                                "bg-page text-muted border border-stroke",
                                "bg-page text-muted border border-stroke",
                            ];

                            return (
                                <div key={item.name} className="group">
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`flex size-5 items-center justify-center rounded-full text-[10px] font-extrabold ${
                                                    rankColors[idx] || rankColors[3]
                                                }`}
                                            >
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <span className="font-bold text-main group-hover:text-primary">
                                                    {item.name}
                                                </span>
                                                <div className="text-[10px] text-muted">
                                                    {currentConf.getDetail(item)}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="font-extrabold text-main">
                                            {currentConf.getValue(item)}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-stroke/60">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${currentConf.gradient} transition-all duration-500`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="py-8 text-center text-xs text-muted">Belum ada riwayat penjualan produk.</p>
                    )}
                </div>
            </div>

            <div className="mt-4 border-t border-stroke/60 pt-3 text-[11px] text-muted">
                Dihitung dari data akumulasi penjualan seluruh item terdaftar.
            </div>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: Payment Methods & Warehouse Distribution
// ─────────────────────────────────────────────────────────────
function PaymentAndWarehouseCards({ paymentMethods = [], warehouseStock = [] }) {
    const totalPayments = useMemo(
        () => paymentMethods.reduce((acc, p) => acc + Number(p.total || 0), 0),
        [paymentMethods],
    );

    const totalStockMl = useMemo(
        () => warehouseStock.reduce((acc, w) => acc + Number(w.stok_ml || 0), 0),
        [warehouseStock],
    );

    const methodColorMap = {
        CASH: { bg: "bg-emerald-500", text: "text-emerald-500", label: "Tunai (Cash)" },
        TRANSFER: { bg: "bg-blue-500", text: "text-blue-500", label: "Transfer Bank" },
        QRIS: { bg: "bg-violet-500", text: "text-violet-500", label: "QRIS" },
        TEMPO: { bg: "bg-amber-500", text: "text-amber-500", label: "Hutang / Tempo" },
        SPLIT: { bg: "bg-indigo-500", text: "text-indigo-500", label: "Split Multi-Pay" },
    };

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {/* Card: Payment Methods Breakdown */}
            <Card>
                <div className="flex items-center justify-between border-b border-stroke pb-3">
                    <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <IconCreditCard size={18} />
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-main">Metode Pembayaran Bulan Ini</h3>
                            <p className="text-[11px] text-muted">Komposisi penerimaan uang kasir</p>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-main">{money(totalPayments)}</span>
                </div>

                {/* Progress multi-segment bar */}
                <div className="mt-4">
                    <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-stroke/60">
                        {paymentMethods.map((pm) => {
                            const pct = totalPayments > 0 ? (Number(pm.total || 0) / totalPayments) * 100 : 0;
                            const conf = methodColorMap[pm.method] || { bg: "bg-slate-500" };
                            return (
                                <div
                                    key={pm.method}
                                    style={{ width: `${pct}%` }}
                                    title={`${pm.method}: ${pct.toFixed(1)}%`}
                                    className={`${conf.bg} transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
                                />
                            );
                        })}
                    </div>

                    {/* Legend list */}
                    <div className="mt-4 space-y-2.5">
                        {paymentMethods.length > 0 ? (
                            paymentMethods.map((pm) => {
                                const pct = totalPayments > 0 ? (Number(pm.total || 0) / totalPayments) * 100 : 0;
                                const conf = methodColorMap[pm.method] || {
                                    bg: "bg-slate-500",
                                    label: pm.method,
                                };
                                return (
                                    <div key={pm.method} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className={`size-2.5 rounded-full ${conf.bg}`} />
                                            <span className="font-semibold text-main">
                                                {conf.label || pm.method}
                                            </span>
                                            <span className="text-[11px] text-muted">({pm.count}x)</span>
                                        </div>
                                        <div className="flex items-center gap-2 font-bold">
                                            <span className="text-main">{money(pm.total)}</span>
                                            <span className="w-10 text-right text-[11px] text-muted">
                                                {pct.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="py-4 text-center text-xs text-muted">Belum ada transaksi bulan ini.</p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Card: Warehouse Stock Distribution */}
            <Card>
                <div className="flex items-center justify-between border-b border-stroke pb-3">
                    <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                            <IconBuildingWarehouse size={18} />
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-main">Kapasitas Stok per Gudang</h3>
                            <p className="text-[11px] text-muted">Penyebaran volume cairan bibit parfum</p>
                        </div>
                    </div>
                    <span className="text-xs font-bold text-main">{number(totalStockMl)} ML</span>
                </div>

                <div className="mt-4 space-y-3.5">
                    {warehouseStock.length > 0 ? (
                        warehouseStock.map((w, idx) => {
                            const pct = totalStockMl > 0 ? (Number(w.stok_ml || 0) / totalStockMl) * 100 : 0;
                            const barColors = [
                                "bg-blue-600",
                                "bg-indigo-600",
                                "bg-violet-600",
                                "bg-cyan-600",
                            ];
                            return (
                                <div key={w.name}>
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="font-bold text-main">{w.name}</span>
                                        <span className="font-semibold text-main">
                                            {number(w.stok_ml)} ML{" "}
                                            <span className="text-[11px] font-normal text-muted">
                                                ({pct.toFixed(1)}%)
                                            </span>
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-stroke/60">
                                        <div
                                            className={`h-full rounded-full ${
                                                barColors[idx % barColors.length]
                                            } transition-all duration-500`}
                                            style={{ width: `${Math.max(4, pct)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="py-4 text-center text-xs text-muted">Belum ada data stok gudang.</p>
                    )}
                </div>
            </Card>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: KPI Metric Card
// ─────────────────────────────────────────────────────────────
function MetricCard({ title, value, subtitle, icon: Icon, badge, color = "blue" }) {
    const colorClasses = {
        blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    };

    return (
        <Card className="flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5">
            <div>
                <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                        {title}
                    </span>
                    {Icon && (
                        <span className={`flex size-8 items-center justify-center rounded-lg ${colorClasses[color]}`}>
                            <Icon size={18} />
                        </span>
                    )}
                </div>
                <div className="mt-2 text-xl font-extrabold tracking-tight text-main sm:text-2xl">
                    {value}
                </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs">
                {subtitle && <span className="text-muted">{subtitle}</span>}
                {badge && (
                    <span className="rounded-md border border-stroke bg-page px-2 py-0.5 text-[10px] font-bold text-main">
                        {badge}
                    </span>
                )}
            </div>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────
export default function DashboardPage({ metrics = {} }) {
    useFlashMessages();

    // Profit margin percentage
    const profitMargin = useMemo(() => {
        const omzet = Number(metrics.omzet_bulan_ini || 0);
        const laba = Number(metrics.laba_kotor_bulan_ini || 0);
        if (omzet <= 0) return 0;
        return ((laba / omzet) * 100).toFixed(1);
    }, [metrics]);

    return (
        <ProtectedLayout title="Dasbor">
            <div className="space-y-6">
                {/* Header */}
                <PageHeader
                    title="Dasbor Operasional & Eksekutif"
                    subtitle="Pemantauan performa penjualan harian, tren laba kotor, dan kesehatan inventori toko secara realtime."
                />

                {/* 1. Top KPI Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Omzet Hari Ini"
                        value={money(metrics.omzet_hari_ini)}
                        subtitle={`Bulan Ini: ${money(metrics.omzet_bulan_ini)}`}
                        icon={IconCash}
                        color="blue"
                    />
                    <MetricCard
                        title="Laba Hari Ini"
                        value={money(metrics.laba_kotor_hari_ini)}
                        subtitle={`Margin: ${profitMargin}%`}
                        icon={IconTrendingUp}
                        color="emerald"
                    />
                    <MetricCard
                        title="Pembelian Bulan Ini"
                        value={money(metrics.pembelian_bulan_ini)}
                        subtitle={`Hari ini: ${money(metrics.pembelian_hari_ini)}`}
                        icon={IconShoppingCart}
                        color="amber"
                    />
                    <MetricCard
                        title="Total Stok Fisik"
                        value={`${number(metrics.total_inventory_ml)} ML`}
                        subtitle={`${(metrics.stok_menipis || []).length} stok menipis`}
                        icon={IconBottle}
                        color="violet"
                    />
                </div>

                {/* 2. Posisi Keuangan & Likuiditas Toko */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card className="flex items-center gap-3.5 py-3.5">
                        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${Number(metrics.saldo_kas || 0) < 0 ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
                            <IconWallet size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Saldo Kas Terkini</span>
                            <div className={`text-base font-extrabold truncate ${Number(metrics.saldo_kas || 0) < 0 ? "text-rose-600 dark:text-rose-400" : "text-main"}`}>
                                {money(metrics.saldo_kas)}
                            </div>
                            <span className="text-[10px] text-muted">
                                Masuk: {money(metrics.kas_masuk_hari_ini)} · Keluar: {money(metrics.kas_keluar_hari_ini)}
                            </span>
                        </div>
                    </Card>

                    <Card className="flex items-center gap-3.5 py-3.5">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                            <IconCoins size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Piutang Customer</span>
                            <div className="text-base font-extrabold text-main truncate">
                                {money(metrics.total_piutang)}
                            </div>
                            <span className="text-[10px] text-muted">
                                Tagihan tempo aktif
                            </span>
                        </div>
                    </Card>

                    <Card className="flex items-center gap-3.5 py-3.5">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                            <IconCreditCard size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Hutang Supplier</span>
                            <div className="text-base font-extrabold text-main truncate">
                                {money(metrics.total_hutang)}
                            </div>
                            <span className="text-[10px] text-muted">
                                Kewajiban tempo aktif
                            </span>
                        </div>
                    </Card>
                </div>

                {/* 3. Main Visual Charts Section */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Primary Area Chart (Span 2 cols) */}
                    <div className="lg:col-span-2">
                        <SalesTrendChart
                            trend7d={metrics.sales_trend_7d || []}
                            trend30d={metrics.sales_trend_30d || []}
                        />
                    </div>

                    {/* Top 5 Products Ranking (Span 1 col) */}
                    <div className="lg:col-span-1">
                        <TopProductsChart products={metrics.top_products || []} />
                    </div>
                </div>

                {/* 3. Secondary Charts (Payment Methods & Warehouse Distribution) */}
                <PaymentAndWarehouseCards
                    paymentMethods={metrics.payment_methods || []}
                    warehouseStock={metrics.inventory_per_gudang || []}
                />

                {/* 4. Operational Tables & Alerts */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Pengingat Jatuh Tempo (Hutang / Piutang) */}
                    <Card>
                        <div className="mb-4 flex items-center justify-between border-b border-stroke pb-3">
                            <div className="flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                                    <IconAlertTriangle size={18} />
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-main">Pengingat Jatuh Tempo (H-3)</h3>
                                    <p className="text-[11px] text-muted">Tagihan & piutang jatuh tempo segera</p>
                                </div>
                            </div>
                            <span className="rounded-md border border-stroke bg-page px-2 py-0.5 text-[10px] font-bold text-muted">
                                {(metrics.due_soon || []).length} Tagihan
                            </span>
                        </div>

                        {(metrics.due_soon || []).length > 0 ? (
                            <SimpleTable
                                rows={metrics.due_soon}
                                columns={[
                                    { key: "type", label: "Jenis" },
                                    { key: "number", label: "No. Faktur" },
                                    { key: "party", label: "Mitra" },
                                    {
                                        key: "days_remaining",
                                        label: "Status",
                                        render: (row) => (
                                            <span
                                                className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-bold ${
                                                    row.days_remaining === 0
                                                        ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                                }`}
                                            >
                                                {row.days_remaining === 0 ? "Hari ini" : `H-${row.days_remaining}`}
                                            </span>
                                        ),
                                    },
                                    {
                                        key: "remaining",
                                        label: "Sisa Tagihan",
                                        render: (row) => money(row.remaining),
                                    },
                                ]}
                            />
                        ) : (
                            <p className="py-6 text-center text-xs text-muted">
                                Tidak ada hutang atau piutang yang jatuh tempo dalam periode ini.
                            </p>
                        )}
                    </Card>

                    {/* Peringatan Stok Menipis */}
                    <Card>
                        <div className="mb-4 flex items-center justify-between border-b border-stroke pb-3">
                            <div className="flex items-center gap-2">
                                <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                                    <IconBottle size={18} />
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-main">Peringatan Stok Menipis</h3>
                                    <p className="text-[11px] text-muted">Item di bawah batas minimum stok</p>
                                </div>
                            </div>
                            <span className="rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                                {(metrics.stok_menipis || []).length} Item
                            </span>
                        </div>

                        {(metrics.stok_menipis || []).length > 0 ? (
                            <SimpleTable
                                rows={metrics.stok_menipis}
                                columns={[
                                    {
                                        key: "barang",
                                        label: "Nama Parfum / Bibit",
                                        render: (row) => (
                                            <span className="font-bold text-main">
                                                {row.barang?.nama_barang || "-"}
                                            </span>
                                        ),
                                    },
                                    {
                                        key: "gudang",
                                        label: "Gudang",
                                        render: (row) => row.gudang?.nama_gudang || "-",
                                    },
                                    {
                                        key: "stok_ml",
                                        label: "Sisa Stok",
                                        render: (row) => (
                                            <span className="font-extrabold text-rose-600 dark:text-rose-400">
                                                {number(row.stok_ml)} ML
                                            </span>
                                        ),
                                    },
                                ]}
                            />
                        ) : (
                            <p className="py-6 text-center text-xs text-muted">
                                Semua stok dalam kondisi aman di atas batas minimum.
                            </p>
                        )}
                    </Card>
                </div>
            </div>
        </ProtectedLayout>
    );
}
