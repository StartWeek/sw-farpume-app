import React, { useEffect, useRef, useState } from "react";
import { Field, Input, Select } from "./_components";

const BLOCKS = {
    header: ["Kop / judul nota", 0], info: ["Informasi transaksi", 0], items: ["Tabel barang", 0],
    summary: ["Total pembayaran", 3.175], signatures: ["Tanda tangan", 5.292],
    actors: ["Petugas", 4.763], footer: ["Pesan penutup", 3.704],
};
const bounded = (value, min, max) => Math.round(Math.max(min, Math.min(max, Number(value) || 0)) * 10) / 10;

export default function PdfReceiptLayoutEditor({ html, layout = {}, onChange, title }) {
    const frame = useRef(null);
    const detach = useRef(() => {});
    const latest = useRef({ layout, onChange });
    latest.current = { layout, onChange };
    const [selected, setSelected] = useState("header");
    const [available, setAvailable] = useState([]);
    const [loaded, setLoaded] = useState(0);
    const apply = (block, values) => {
        const element = frame.current?.contentDocument?.body?.querySelector(`:scope > .${block}`);
        if (!element) return;
        const x = bounded(values?.x, -10, 10);
        const y = bounded(values?.y, 0, 40);
        element.style.marginLeft = `${x}mm`;
        element.style.marginTop = `${BLOCKS[block][1] + y}mm`;
        element.style.width = `${182 - Math.abs(x)}mm`;
    };
    useEffect(() => {
        available.forEach((block) => {
            apply(block, layout[block]);
            const element = frame.current?.contentDocument?.body?.querySelector(`:scope > .${block}`);
            if (element) element.style.outline = block === selected ? "2px solid #2563eb" : "1px dashed #94a3b8";
        });
    }, [layout, selected, available, loaded]);
    useEffect(() => () => detach.current(), []);
    const load = () => {
        detach.current();
        const doc = frame.current?.contentDocument;
        if (!doc?.body) return;
        const blocks = Object.keys(BLOCKS).filter((block) => doc.body.querySelector(`:scope > .${block}`));
        setAvailable(blocks);
        setSelected((previous) => blocks.includes(previous) ? previous : blocks[0]);
        setLoaded((previous) => previous + 1);
        let drag = null;
        blocks.forEach((block) => {
            const element = doc.body.querySelector(`:scope > .${block}`);
            element.dataset.layoutBlock = block;
            element.style.cursor = "move";
            element.style.touchAction = "none";
            element.style.userSelect = "none";
            element.title = `Geser ${BLOCKS[block][0]}`;
        });
        const down = (event) => {
            if (event.button !== 0 || !event.isPrimary) return;
            const element = event.target.closest?.("[data-layout-block]");
            if (!element) return;
            const block = element.dataset.layoutBlock;
            const values = latest.current.layout[block] || {};
            drag = { block, pointer: event.pointerId, element, startX: event.clientX, startY: event.clientY, x: Number(values.x) || 0, y: Number(values.y) || 0 };
            setSelected(block);
            element.setPointerCapture(event.pointerId);
            event.preventDefault();
        };
        const move = (event) => {
            if (!drag || drag.pointer !== event.pointerId) return;
            const value = {
                x: bounded(drag.x + (event.clientX - drag.startX) * 25.4 / 96, -10, 10),
                y: bounded(drag.y + (event.clientY - drag.startY) * 25.4 / 96, 0, 40),
            };
            const next = { ...latest.current.layout, [drag.block]: value };
            latest.current = { ...latest.current, layout: next };
            apply(drag.block, value);
            latest.current.onChange(next);
        };
        const up = (event) => {
            if (!drag || drag.pointer !== event.pointerId) return;
            if (drag.element.hasPointerCapture(event.pointerId)) drag.element.releasePointerCapture(event.pointerId);
            drag = null;
        };
        doc.addEventListener("pointerdown", down);
        doc.addEventListener("pointermove", move);
        doc.addEventListener("pointerup", up);
        doc.addEventListener("pointercancel", up);
        detach.current = () => {
            doc.removeEventListener("pointerdown", down); doc.removeEventListener("pointermove", move);
            doc.removeEventListener("pointerup", up); doc.removeEventListener("pointercancel", up);
        };
    };
    const changeOffset = (axis, value) => {
        onChange({ ...layout, [selected]: { ...(layout[selected] || {}), [axis]: bounded(value, axis === "x" ? -10 : 0, axis === "x" ? 10 : 40) } });
    };
    return <div className="space-y-3">
        {/* <p className="text-sm text-muted">Geser bagian nota untuk mengatur posisi. Gunakan angka untuk pengaturan lebih tepat. Posisi pembelian dan pembayaran supplier disimpan terpisah.</p> */}
        <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Bagian Nota"><Select value={selected || ""} onChange={(event) => setSelected(event.target.value)}>{available.map((block) => <option key={block} value={block}>{BLOCKS[block][0]}</option>)}</Select></Field>
            <Field label="Geser Horizontal (mm)"><Input type="number" min={-10} max={10} step={0.1} value={layout[selected]?.x || 0} onChange={(event) => changeOffset("x", event.target.value)} /></Field>
            <Field label="Tambahan Jarak Atas (mm)"><Input type="number" min={0} max={40} step={0.1} value={layout[selected]?.y || 0} onChange={(event) => changeOffset("y", event.target.value)} /></Field>
        </div>
        <button type="button" onClick={() => onChange({})} className="rounded-lg border border-stroke px-3 py-2 text-sm font-bold text-main">Reset Posisi Format Ini</button>
        <div className="max-h-[650px] overflow-auto rounded-lg border border-stroke bg-slate-200">
            <iframe ref={frame} onLoad={load} title={title} srcDoc={html} sandbox="allow-same-origin" className="block h-[1250px] w-[210mm] border-0 bg-white" />
        </div>
    </div>;
}
