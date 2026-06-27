<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\KasMutasi;
use App\Services\Business\BusinessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KasController extends Controller
{
    public function __construct(private readonly BusinessService $business) {}

    public function index(): Response
    {
        return Inertia::render('admin/business/KasPage', [
            'rows' => KasMutasi::query()
                ->where('sumber_transaksi', 'MANUAL')
                ->whereDate('tanggal', $this->business->operationalDate())
                ->latest('id')
                ->paginate($this->perPage())
                ->withQueryString(),
            'operationalDate' => $this->business->operationalDate()->toDateString(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tanggal' => ['nullable', 'date'],
            'jenis_transaksi' => ['required', 'in:MASUK,KELUAR'],
            'jumlah' => ['required', 'numeric', 'min:1'],
            'pihak' => ['nullable', 'string', 'max:255'],
            'keterangan' => ['nullable', 'string'],
        ]);

        $this->business->createManualCash($this->uppercase($validated));

        return redirect()
            ->route('business.kas.index')
            ->with('success', 'Transaksi kas berhasil disimpan.');
    }

    private function perPage(): int
    {
        $perPage = (int) request('per_page', 10);
        return in_array($perPage, [10, 25, 50, 100], true) ? $perPage : 10;
    }
}
