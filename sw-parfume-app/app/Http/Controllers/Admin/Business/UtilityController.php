<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\TokoClosing;
use App\Services\Business\BusinessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UtilityController extends Controller
{
    public function __construct(private readonly BusinessService $business) {}

    public function index(): Response
    {
        return Inertia::render('admin/business/UtilityPage', [
            'operationalDate' => $this->business->operationalDate()->toDateString(),
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
        $this->business->closeStore($validated['tanggal_tutup'], $validated['keterangan'] ?? null);

        return redirect()->route('business.utility.index')->with('success', 'Toko berhasil ditutup. Saldo akhir menjadi saldo awal hari berikutnya.');
    }
}
