<?php

namespace Tests\Feature;

use App\Models\System\AppSetting;
use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SettingsSystemTest extends TestCase
{
    use RefreshDatabase;

    public function test_system_settings_preserve_theme_keys_and_asset_paths(): void
    {
        $user = User::query()->create([
            'username' => 'settings-admin',
            'name' => 'Settings Admin',
            'email' => 'settings@example.test',
            'password' => 'password',
            'role' => 'superadmin',
        ]);

        $response = $this->actingAs($user)->put('/admin/setting-system', [
            'logo_path' => '/storage/settings/AppLogo.svg',
            'login_logo_path' => '/storage/settings/LoginLogo.svg',
            'app_name' => 'Paris Parfum Baru',
            'primary_color' => 'blue',
            'light_theme' => 'neutral',
            'dark_theme' => 'cinder',
            'is_dark_mode' => true,
        ]);

        $response->assertRedirect(route('admin.setting-system'));
        $this->assertDatabaseHas('tp_app_settings', [
            'id' => 1,
            'logo_path' => '/storage/settings/AppLogo.svg',
            'login_logo_path' => '/storage/settings/LoginLogo.svg',
            'app_name' => 'PARIS PARFUM BARU',
            'primary_color' => 'blue',
            'light_theme' => 'neutral',
            'dark_theme' => 'cinder',
            'is_dark_mode' => true,
        ]);
    }

    public function test_legacy_uppercase_theme_keys_are_normalized_when_read(): void
    {
        AppSetting::query()->updateOrCreate(['id' => 1], [
            'app_name' => 'PARIS PARFUM',
            'primary_color' => 'ROSE',
            'light_theme' => 'GRAY',
            'dark_theme' => 'MIRAGE',
        ]);
        Cache::put('app_settings', AppSetting::query()->findOrFail(1)->toArray(), 3600);

        $settings = app(SettingsService::class)->get();

        $this->assertSame('rose', $settings['primary_color']);
        $this->assertSame('gray', $settings['light_theme']);
        $this->assertSame('mirage', $settings['dark_theme']);
    }
}
