<?php

namespace App\Http\Controllers\Admin\System;

use App\Http\Controllers\Controller;
use App\Services\Business\BusinessService;
use App\Services\SettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(private readonly SettingsService $settings) {}

    public function systemIndex(): Response
    {
        return Inertia::render('admin/business/SettingSystemPage', [
            'settings' => $this->settings->get(),
        ]);
    }

    public function systemUpdate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'logo_path' => ['nullable', 'string', 'max:255'],
            'login_logo_path' => ['nullable', 'string', 'max:255'],
            'app_name' => ['required', 'string', 'max:100'],
            'primary_color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'sidebar_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'light_theme' => ['required', 'string', 'in:slate,gray,neutral'],
            'dark_theme' => ['required', 'string', 'in:navy,mirage,mint,black,cinder'],
            'is_dark_mode' => ['boolean'],
        ], $this->validationMessages());

        $validated['app_name'] = mb_strtoupper($validated['app_name']);
        $validated['primary_color'] = mb_strtoupper($validated['primary_color']);
        if (! empty($validated['sidebar_color'])) {
            $validated['sidebar_color'] = mb_strtoupper($validated['sidebar_color']);
        }

        $this->settings->updateSystem($validated);

        return redirect()
            ->route('admin.setting-system')
            ->with('success', 'Pengaturan sistem berhasil disimpan.');
    }

    public function notaIndex(): Response
    {
        $settings = $this->settings->get();

        return Inertia::render('admin/business/SettingNotaPage', [
            'settings' => $settings,
            'previews' => $this->notaPreviews($settings),
        ]);
    }

    public function notaUpdate(Request $request): RedirectResponse
    {
        $layoutRules = ['receipt_pdf_layout' => ['nullable', 'array:purchase,payment']];
        foreach (['purchase', 'payment'] as $kind) {
            $layoutRules["receipt_pdf_layout.$kind"] = ['sometimes', 'array:header,info,items,summary,signatures,actors,footer'];
            foreach (['header', 'info', 'items', 'summary', 'signatures', 'actors', 'footer'] as $block) {
                $layoutRules["receipt_pdf_layout.$kind.$block"] = ['sometimes', 'array:x,y'];
                $layoutRules["receipt_pdf_layout.$kind.$block.x"] = ['sometimes', 'numeric', 'between:-10,10'];
                $layoutRules["receipt_pdf_layout.$kind.$block.y"] = ['sometimes', 'numeric', 'between:0,40'];
            }
        }
        $validated = $request->validate([
            'store_name' => ['required', 'string', 'max:100'],
            'store_address' => ['nullable', 'string', 'max:500'],
            'store_phone' => ['nullable', 'string', 'max:30'],
            'receipt_footer' => ['nullable', 'string', 'max:200'],
            ...$layoutRules,
        ], $this->validationMessages());

        foreach (['store_name', 'store_address', 'store_phone', 'receipt_footer'] as $key) {
            if (is_string($validated[$key] ?? null)) {
                $validated[$key] = mb_strtoupper($validated[$key]);
            }
        }

        $this->settings->updateNota($validated);

        return redirect()
            ->route('admin.setting-nota')
            ->with('success', 'Pengaturan nota berhasil disimpan.');
    }

    private function notaPreviews(array $settings): array
    {
        $date = app(BusinessService::class)->operationalDate();
        $previews = [];
        foreach ([
            ['sale', 'penjualan-retail', 'Penjualan Retail', true, false],
            ['purchase', 'pembelian', 'Pembelian Supplier', false, false],
            ['customer-payment', 'bayar-piutang', 'Pembayaran Piutang Customer', true, true],
            ['supplier-payment', 'bayar-hutang', 'Pembayaran Hutang Supplier', false, true],
            ['supplier-receivable', 'bayar-piutang-supplier', 'Pembayaran Piutang Supplier', false, true],
        ] as [$key, $type, $label, $customer, $payment]) {
            $validation = (object) [
                'type' => $type, 'status' => 'PENDING', 'number' => 'CONTOH-001',
                'operational_date' => $date, 'result' => null, 'rejection_reason' => null,
                'submitted_by_name' => 'OPERATOR CONTOH', 'reviewed_by_name' => null,
                'snapshot' => [
                    'label' => $label, 'party' => $customer ? 'CUSTOMER CONTOH' : 'SUPPLIER CONTOH',
                    'amount' => $payment ? 50000 : 100000, 'discount' => 0,
                    'payment_method' => 'CASH', 'down_payment' => 0,
                    'remaining_before' => 100000, 'reference' => $payment ? 'TAGIHAN-CONTOH' : null,
                    'items' => $payment ? [] : [[
                        'code' => 'BRG-CONTOH', 'name' => 'PARFUM CONTOH',
                        'qty' => 2, 'unit' => 'BOTOL', 'base_qty' => 100, 'base_unit' => 'ML',
                        'variant' => '50 ML', 'price' => 1000, 'price_unit' => 'ML', 'subtotal' => 100000,
                    ]],
                ],
            ];
            $previews[$key] = view($customer ? 'exports.customer_slip' : 'exports.validation_receipt', [
                'settings' => $settings, 'validation' => $validation, 'preview' => true,
            ])->render();
        }

        return $previews;
    }

    private function validationMessages(): array
    {
        return [
            'required' => 'Kolom ini wajib diisi.',
            'primary_color.regex' => 'Warna utama harus menggunakan format HEX, contoh #3B82F6.',
            'sidebar_color.regex' => 'Warna sidebar harus menggunakan format HEX, contoh #0F172A.',
        ];
    }
}
