<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Models\Business\TransactionValidation;
use App\Services\Business\TransactionValidationService;
use App\Services\SettingsService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TransactionValidationController extends Controller
{
    public function __construct(private readonly TransactionValidationService $validations) {}

    public function index(Request $request): Response
    {
        $allowed = $this->validations->allowedTypes($request->user());
        abort_if($allowed === [], 403, 'Anda tidak memiliki akses transaksi untuk divalidasi.');
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['PENDING', 'APPROVED', 'REJECTED', 'ALL'])],
            'type' => ['nullable', Rule::in($allowed)],
            'per_page' => ['nullable', 'integer', Rule::in([10, 25, 50])],
        ]);
        $status = $filters['status'] ?? 'PENDING';
        $query = TransactionValidation::query()->whereIn('type', $allowed);
        $counts = (clone $query)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return Inertia::render('admin/business/ValidationPage', [
            'rows' => $query
                ->when($status !== 'ALL', fn ($query) => $query->where('status', $status))
                ->when($filters['type'] ?? null, fn ($query, $type) => $query->where('type', $type))
                ->latest('id')->paginate($filters['per_page'] ?? 10)->withQueryString(),
            'filters' => ['status' => $status, 'type' => $filters['type'] ?? '', 'per_page' => $filters['per_page'] ?? 10],
            'counts' => $counts,
            'types' => collect(TransactionValidationService::TYPES)->only($allowed)->map(fn (array $type, string $key) => ['value' => $key, 'label' => $type['label']])->values(),
        ]);
    }

    public function approve(Request $request, int $id): RedirectResponse
    {
        $validation = $this->validations->approve($id, $request->user());

        return back()->with('success', "{$validation->number} disetujui. Transaksi sudah diproses dan masuk laporan.");
    }

    public function approveSelected(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:50'],
            'ids.*' => ['required', 'integer', 'distinct', 'min:1'],
        ]);
        $entries = TransactionValidation::query()->whereIn('id', $validated['ids'])->orderBy('id')->get();
        $allowed = $this->validations->allowedTypes($request->user());
        foreach ($entries as $entry) {
            abort_unless(in_array($entry->type, $allowed, true), 403);
        }
        $result = ['approved' => [], 'failed' => []];
        foreach (array_diff($validated['ids'], $entries->modelKeys()) as $id) {
            $result['failed'][] = ['id' => (int) $id, 'number' => 'ID '.$id, 'reason' => 'Pengajuan tidak ditemukan. Muat ulang daftar validasi.'];
        }
        foreach ($entries as $entry) {
            try {
                $approved = $this->validations->approve($entry->id, $request->user());
                $result['approved'][] = ['id' => $approved->id, 'number' => $approved->number];
            } catch (ValidationException $error) {
                $result['failed'][] = ['id' => $entry->id, 'number' => $entry->number, 'reason' => implode(' ', \Illuminate\Support\Arr::flatten($error->errors()))];
            }
        }

        return back()->with('bulkValidationResult', $result);
    }

    public function pdf(Request $request, int $id): \Symfony\Component\HttpFoundation\Response
    {
        $validation = TransactionValidation::query()->findOrFail($id);
        $access = $request->user()->akses_menu;
        abort_unless(in_array($validation->type, $this->validations->allowedTypes($request->user()), true)
            || (is_array($access) && in_array('laporan-validasi-transaksi', $access, true)), 403);

        if ($request->routeIs('business.validation.slip')) {
            abort_unless(str_starts_with($validation->type, 'penjualan-') || $validation->type === 'bayar-piutang', 404);
            return response()->view('exports.customer_slip', [
                'validation' => $validation,
                'settings' => app(SettingsService::class)->get(),
            ]);
        }

        return Pdf::loadView('exports.validation_receipt', [
            'validation' => $validation,
            'settings' => app(SettingsService::class)->get(),
        ])->setPaper('a4', 'portrait')->stream(strtolower($validation->number).'.pdf');
    }

    public function reject(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $validation = $this->validations->reject($id, $request->user(), $validated['reason']);

        return back()->with('success', "{$validation->number} ditolak. Stok, kas, dan hutang/piutang tidak berubah.");
    }
}
