import React from "react";

/* ── Inline SVG Icons ── */

const PdfIcon = ({ size = 18 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 15v-2h2a1.5 1.5 0 0 1 0 3H9zm0 0v2" />
    </svg>
);

const ExcelIcon = ({ size = 18 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
);

const PortraitIcon = ({ size = 14 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    </svg>
);

const LandscapeIcon = ({ size = 14 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
    </svg>
);

export default function ReportExportBar({ orientation, onOrientationChange, exportUrl, children }) {
    return (
        <div className="sticky bottom-0 z-30 -mx-1 px-1 py-2 bg-page/95 backdrop-blur-sm border-t border-stroke">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                {/* Orientation Toggle */}
                <div className="inline-flex items-center rounded-xl border border-stroke overflow-hidden text-xs">
                    <button
                        type="button"
                        onClick={() => onOrientationChange("portrait")}
                        aria-pressed={orientation === "portrait"}
                        className={`inline-flex min-h-10 items-center gap-1.5 px-3 py-2 font-semibold transition-colors ${
                            orientation === "portrait"
                                ? "bg-primary text-white"
                                : "bg-card text-muted hover:text-main hover:bg-page"
                        }`}
                    >
                        <PortraitIcon size={14} />
                        Portrait
                    </button>
                    <button
                        type="button"
                        onClick={() => onOrientationChange("landscape")}
                        aria-pressed={orientation === "landscape"}
                        className={`inline-flex min-h-10 items-center gap-1.5 px-3 py-2 font-semibold transition-colors ${
                            orientation === "landscape"
                                ? "bg-primary text-white"
                                : "bg-card text-muted hover:text-main hover:bg-page"
                        }`}
                    >
                        <LandscapeIcon size={14} />
                        Landscape
                    </button>
                </div>

                {/* Export Buttons */}
                <div className="flex items-center gap-2">
                    <a href={exportUrl("pdf")} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 no-underline transition-colors hover:bg-red-100 hover:border-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
                        <PdfIcon size={16} />
                        PDF
                    </a>
                    <a href={exportUrl("excel")} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-600 no-underline transition-colors hover:bg-green-100 hover:border-green-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
                        <ExcelIcon size={16} />
                        Excel
                    </a>
                </div>
            </div>

            {/* Pagination — posisi paling bawah */}
            {children}
        </div>
    );
}
