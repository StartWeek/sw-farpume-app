import React, { useEffect, useRef, useState } from "react";
import Button from "@/components/common/Button";
import { TransactionDialog } from "./TransactionDialogs";

export function openCustomerSlip(url) {
    window.dispatchEvent(new CustomEvent("customer-slip-preview", { detail: url }));
}

export default function CustomerSlipModal({ receiptUrl }) {
    const [url, setUrl] = useState(null);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const frame = useRef(null);
    const open = (value) => {
        const target = new URL(value, window.location.origin);
        if (target.origin !== window.location.origin || !target.pathname.endsWith("/slip")) return;
        target.searchParams.set("preview", "1");
        setReady(false); setError(""); setUrl(target.href);
    };
    useEffect(() => {
        if (receiptUrl && new URL(receiptUrl, window.location.origin).pathname.endsWith("/slip")) open(receiptUrl);
    }, [receiptUrl]);
    useEffect(() => {
        const preview = (event) => open(event.detail);
        const click = (event) => {
            if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            const link = event.target.closest?.("a[href]");
            if (!link) return;
            const target = new URL(link.href, window.location.origin);
            if (target.origin === window.location.origin && target.pathname.endsWith("/slip")) {
                event.preventDefault(); open(target.href);
            }
        };
        window.addEventListener("customer-slip-preview", preview);
        document.addEventListener("click", click);
        return () => { window.removeEventListener("customer-slip-preview", preview); document.removeEventListener("click", click); };
    }, []);
    const printBluetooth = async () => {
        setError("");
        if (!navigator.bluetooth) { setError("Browser belum mendukung Web Bluetooth. Gunakan browser yang mendukung atau Cetak Browser."); return; }
        const slip = frame.current?.contentDocument?.querySelector(".slip");
        if (!slip) { setError("Slip belum berhasil dimuat. Buka ulang pratinjau."); return; }
        // Keep only printable content and line breaks before adding ESC/POS commands.
        const text = slip.innerText.replace(/\t/g, " ").replace(/[\x00-\x09\x0b-\x1f\x7f]/g, "").split("\n").flatMap((line) => line.match(/.{1,42}/g) || [""]).join("\n");
        let server;
        setBusy(true);
        try {
            const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: [
                "000018f0-0000-1000-8000-00805f9b34fb", "0000ffe0-0000-1000-8000-00805f9b34fb", "0000ff00-0000-1000-8000-00805f9b34fb",
            ] });
            server = await device.gatt.connect();
            const services = await server.getPrimaryServices();
            for (const service of services) {
                const characteristics = await service.getCharacteristics();
                const writable = characteristics.find((value) => value.properties.write || value.properties.writeWithoutResponse);
                if (!writable) continue;
                const payload = new TextEncoder().encode(`\x1b@\n${text}\n\n\n\x1dV\x00`);
                for (let offset = 0; offset < payload.length; offset += 180) {
                    const chunk = payload.slice(offset, offset + 180);
                    if (writable.properties.writeWithoutResponse) await writable.writeValueWithoutResponse(chunk);
                    else await writable.writeValue(chunk);
                }
                return;
            }
            throw new Error("Printer tidak menyediakan layanan cetak Bluetooth yang didukung.");
        } catch (failure) {
            setError(failure.name === "NotFoundError" ? "Pemilihan printer dibatalkan." : failure.message || "Cetak Bluetooth gagal. Periksa koneksi printer sebelum mencoba kembali.");
        } finally {
            server?.disconnect(); setBusy(false);
        }
    };
    if (!url) return null;
    return <TransactionDialog title="Pratinjau Slip Penjualan" description="Periksa slip, lalu pilih cara mencetak." width="max-w-lg" onClose={() => { if (!busy) setUrl(null); }}>
        <div className="space-y-4">
            <iframe ref={frame} src={url} title="Pratinjau slip customer" className="h-[45vh] w-full rounded-lg border border-stroke bg-white" onLoad={() => {
                const loaded = !!frame.current?.contentDocument?.querySelector(".slip");
                setReady(loaded); if (!loaded) setError("Slip gagal dimuat atau akses tidak tersedia. Buka ulang pratinjau.");
            }} />
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" disabled={busy} onClick={() => setUrl(null)}>Tutup</Button>
                <Button variant="outline" disabled={!ready || busy} onClick={() => frame.current?.contentWindow?.print()}>Cetak Browser</Button>
                <Button disabled={!ready || busy} loading={busy} onClick={printBluetooth}>Print Bluetooth</Button>
            </div>
        </div>
    </TransactionDialog>;
}
