import ProtectedLayout from "@/components/layouts/ProtectedLayout";
import Button from "@/components/common/Button";
import storeClosingReminder from "@/assets/images/store-closing-reminder.webp";
import { useForm } from "@inertiajs/react";
import { IconBuildingStore, IconCalendarEvent, IconClockExclamation } from "@tabler/icons-react";
import { useConfirmStore } from "@/store/confirmStore";
import { Card, Field, Input, PageHeader, SimpleTable, Textarea, money, useFlashMessages } from "./_components";

const formatDate = (date) => {
    if (!date) return "-";

    const [year, month, day] = date.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(year, month - 1, day));
};

export default function UtilityPage({ operationalDate, currentDate, requiresStoreClosing = false, missedDays = 0, rows = [] }) {
    useFlashMessages();
    const { confirm } = useConfirmStore();

    // Ketika ada hari yang terlewat, target tutup adalah hari ini (batch close semua hari sekaligus).
    // Jika tidak ada yang terlewat, target tutup sama dengan tanggal operasional (single close).
    const targetDate = requiresStoreClosing ? currentDate : operationalDate;

    const { data, setData, post, processing, errors } = useForm({
        tanggal_tutup: targetDate,
        keterangan: "",
    });

    const submit = async (event) => {
        event.preventDefault();

        const dayLabel = missedDays > 1 ? `${missedDays} hari` : "1 hari";
        const dateRange = missedDays > 1
            ? `${formatDate(operationalDate)} s.d. ${formatDate(currentDate)}`
            : formatDate(operationalDate);

        const confirmed = await confirm({
            title: "Tutup Toko",
            message: `Anda akan menutup toko untuk ${dayLabel} (${dateRange}). Saldo akhir kas akan diteruskan sebagai saldo awal hari berikutnya dan transaksi pada tanggal tersebut tidak dapat diubah.`,
            confirmLabel: missedDays > 1 ? `Ya, Tutup ${missedDays} Hari` : "Ya, Tutup Toko",
            cancelLabel: "Batal",
            variant: "primary",
        });
        if (confirmed) post("/admin/utility/tutup-toko");
    };

    const buttonLabel = missedDays > 1 ? `Tutup Toko (${missedDays} Hari)` : "Tutup Toko Sekarang";

    const closingForm = (
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
            <Field label="Tanggal Operasional">
                <Input type="date" value={data.tanggal_tutup} readOnly />
                {errors.tanggal_tutup && <div className="mt-1 text-xs text-red-500">{errors.tanggal_tutup}</div>}
            </Field>
            <Field label="Keterangan (opsional)">
                <Textarea
                    value={data.keterangan}
                    onChange={(event) => setData("keterangan", event.target.value.toUpperCase())}
                    className="uppercase"
                    placeholder="Contoh: tutup harian"
                />
            </Field>
            <Button
                type="submit"
                disabled={processing}
                loading={processing}
                icon={IconBuildingStore}
                className="!rounded-lg"
            >
                {buttonLabel}
            </Button>
        </form>
    );

    return (
        <ProtectedLayout title={requiresStoreClosing ? "Toko Belum Ditutup" : "Utility"}>
            <div className="space-y-5">
                {requiresStoreClosing ? (
                    <section className="overflow-hidden border border-red-200 bg-card shadow-sm">
                        <div className="grid min-h-[calc(100vh-11rem)] lg:grid-cols-[minmax(320px,0.9fr)_minmax(460px,1.1fr)]">
                            <div className="relative min-h-[280px] overflow-hidden bg-[#f5ead8] lg:min-h-full">
                                <img
                                    src={storeClosingReminder}
                                    alt="Petugas toko parfum sedang menyelesaikan proses tutup toko"
                                    className="absolute inset-0 h-full w-full object-cover object-center"
                                />
                                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-md bg-white/95 px-3 py-2 text-xs font-bold text-red-700 shadow-sm backdrop-blur">
                                    <IconClockExclamation size={17} aria-hidden="true" />
                                    Perlu diselesaikan
                                </div>
                            </div>

                            <div className="flex flex-col justify-center px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
                                <div className="max-w-2xl">
                                    <p className="mb-3 text-sm font-bold uppercase text-red-600">Operasional tertunda</p>
                                    <h1 className="text-2xl font-black leading-tight text-main sm:text-3xl">
                                        {missedDays > 1
                                            ? `${missedDays} hari belum ditutup`
                                            : "Toko hari sebelumnya belum ditutup"}
                                    </h1>
                                    <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
                                        {missedDays > 1
                                            ? `Selesaikan tutup toko untuk ${missedDays} hari (${formatDate(operationalDate)} s.d. ${formatDate(currentDate)}) agar saldo akhir diteruskan dan transaksi hari ini dapat dimulai dengan benar.`
                                            : "Selesaikan tutup toko agar saldo akhir diteruskan dan transaksi hari ini dapat dimulai dengan benar."}
                                    </p>

                                    <div className="my-6 grid gap-3 sm:grid-cols-2">
                                        <div className="border-l-4 border-red-500 bg-red-50 px-4 py-3">
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase text-red-700">
                                                <IconCalendarEvent size={16} aria-hidden="true" />
                                                Belum ditutup
                                            </div>
                                            <div className="mt-1 text-base font-black text-red-950">{formatDate(operationalDate)}</div>
                                        </div>
                                        <div className="border-l-4 border-teal-500 bg-teal-50 px-4 py-3">
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase text-teal-700">
                                                <IconCalendarEvent size={16} aria-hidden="true" />
                                                Hari ini
                                            </div>
                                            <div className="mt-1 text-base font-black text-teal-950">{formatDate(currentDate)}</div>
                                        </div>
                                    </div>

                                    <div className="border-t border-stroke pt-5">{closingForm}</div>
                                </div>
                            </div>
                        </div>
                    </section>
                ) : (
                    <>
                        <PageHeader title="Utility" subtitle="Tutup hari operasional dan teruskan saldo kas ke hari berikutnya." />
                        <Card>{closingForm}</Card>
                    </>
                )}
                <Card>
                    <SimpleTable rows={rows} columns={[
                        { key: "tanggal_tutup", label: "Tanggal Tutup" },
                        { key: "saldo_awal", label: "Saldo Awal", render: (row) => money(row.saldo_awal) },
                        { key: "saldo_akhir", label: "Saldo Akhir", render: (row) => money(row.saldo_akhir) },
                        { key: "total_penjualan", label: "Penjualan", render: (row) => money(row.total_penjualan) },
                        { key: "total_pembelian", label: "Pembelian", render: (row) => money(row.total_pembelian) },
                        { key: "keterangan", label: "Keterangan" },
                    ]} />
                </Card>
            </div>
        </ProtectedLayout>
    );
}
