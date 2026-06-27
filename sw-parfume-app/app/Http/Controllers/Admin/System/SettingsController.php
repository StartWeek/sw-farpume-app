<?php

namespace App\Http\Controllers\Admin\System;

use App\Http\Controllers\Controller;
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
            'light_theme' => ['required', 'string', 'in:slate,gray,neutral'],
            'dark_theme' => ['required', 'string', 'in:navy,mirage,mint,black,cinder'],
            'is_dark_mode' => ['boolean'],
        ], $this->validationMessages());

        $validated['app_name'] = mb_strtoupper($validated['app_name']);
        $validated['primary_color'] = mb_strtoupper($validated['primary_color']);

        $this->settings->updateSystem($validated);

        return redirect()
            ->route('admin.setting-system')
            ->with('success', 'Pengaturan sistem berhasil disimpan.');
    }

    public function notaIndex(): Response
    {
        return Inertia::render('admin/business/SettingNotaPage', [
            'settings' => $this->settings->get(),
        ]);
    }

    public function notaUpdate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'store_name' => ['required', 'string', 'max:100'],
            'store_address' => ['nullable', 'string', 'max:500'],
            'store_phone' => ['nullable', 'string', 'max:30'],
            'receipt_footer' => ['nullable', 'string', 'max:200'],
            'receipt_template' => ['nullable', 'string', 'max:10000'],
            'payment_receipt_template' => ['nullable', 'string', 'max:10000'],
            'item_template' => ['nullable', 'string', 'max:2000'],
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

    private function validationMessages(): array
    {
        return [
            'required' => 'Kolom ini wajib diisi.',
            'primary_color.regex' => 'Warna utama harus menggunakan format HEX, contoh #3B82F6.',
        ];
    }
}
