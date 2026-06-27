<?php

namespace App\Services;

use App\Models\System\AppSetting;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    private const CACHE_KEY = 'app_settings';

    private const CACHE_TTL = 3600;

    public function get(): array
    {
        $data = Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function (): array {
            $settings = AppSetting::query()->find(1);

            if (! $settings) {
                return $this->defaults();
            }

            return $settings->toArray();
        });

        foreach (['primary_color', 'light_theme', 'dark_theme'] as $key) {
            $data[$key] = strtolower($data[$key]);
        }

        return $data;
    }

    public function updateSystem(array $data): void
    {
        AppSetting::query()->updateOrCreate(['id' => 1], $data);

        Cache::forget(self::CACHE_KEY);
    }

    public function updateNota(array $data): void
    {
        AppSetting::query()->updateOrCreate(['id' => 1], $data);

        Cache::forget(self::CACHE_KEY);
    }

    private function defaults(): array
    {
        return [
            'id' => 1,
            'logo_path' => null,
            'login_logo_path' => null,
            'app_name' => 'Paris Parfum Admin',
            'primary_color' => 'amber',
            'light_theme' => 'slate',
            'dark_theme' => 'navy',
            'is_dark_mode' => false,
            'store_name' => 'PARIS PARFUM',
            'store_address' => null,
            'store_phone' => null,
            'receipt_footer' => null,
            'receipt_template' => null,
            'payment_receipt_template' => null,
        ];
    }
}
