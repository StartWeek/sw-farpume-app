<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\TokoClosing;
use App\Services\Business\BusinessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class UtilityController extends Controller
{
    public function __construct(private readonly BusinessService $business) {}

    public function index(): Response
    {
        $operationalDate = $this->business->operationalDate()->startOfDay();
        $currentDate = Carbon::today();

        return Inertia::render('admin/business/UtilityPage', [
            'operationalDate' => $operationalDate->toDateString(),
            'currentDate' => $currentDate->toDateString(),
            'requiresStoreClosing' => $operationalDate->lt($currentDate),
            'missedDays' => (int) max(0, $operationalDate->diffInDays($currentDate)),
            'rows' => TokoClosing::query()->latest('tanggal_tutup')->paginate(10),
        ]);
    }

    public function close(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tanggal_tutup' => ['required', 'date'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
        ]);

        $validated = $this->uppercase($validated);
        $operationalDate = $this->business->operationalDate();
        $targetDate = Carbon::parse($validated['tanggal_tutup']);

        $this->business->closeStore($validated['tanggal_tutup'], $validated['keterangan'] ?? null);

        $diff = (int) $operationalDate->startOfDay()->diffInDays($targetDate->startOfDay());
        $daysCount = max(1, $diff);

        $message = $daysCount > 1
            ? "{$daysCount} hari toko berhasil ditutup ({$operationalDate->format('d/m/Y')} s.d. {$targetDate->format('d/m/Y')}). Saldo akhir menjadi saldo awal hari berikutnya."
            : 'Toko berhasil ditutup. Saldo akhir menjadi saldo awal hari berikutnya.';

        return redirect()->route('business.utility.index')->with('success', $message);
    }
}
