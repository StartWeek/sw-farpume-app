<?php

namespace Tests\Feature;

use App\Models\Business\SystemDate;
use App\Models\User;
use App\Services\Business\BusinessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class StoreClosingGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_application_is_locked_when_previous_operational_day_is_not_closed(): void
    {
        Carbon::setTestNow('2026-06-27 09:00:00');
        SystemDate::query()->updateOrCreate(['id' => 1], ['tanggal_system' => '2026-06-26']);

        $this->actingAs($this->superAdmin())
            ->get('/admin/dashboard')
            ->assertRedirect(route('business.utility.index'))
            ->assertSessionHas('error');
    }

    public function test_store_closing_page_remains_accessible_while_application_is_locked(): void
    {
        Carbon::setTestNow('2026-06-27 09:00:00');
        SystemDate::query()->updateOrCreate(['id' => 1], ['tanggal_system' => '2026-06-26']);

        $this->actingAs($this->superAdmin())
            ->get('/admin/utility')
            ->assertOk();
    }

    public function test_application_is_available_again_after_overdue_store_is_closed(): void
    {
        Carbon::setTestNow('2026-06-27 09:00:00');
        SystemDate::query()->updateOrCreate(['id' => 1], ['tanggal_system' => '2026-06-26']);
        $user = $this->superAdmin();

        $this->actingAs($user);
        app(BusinessService::class)->closeStore('2026-06-26');

        $this->get('/admin/dashboard')->assertOk();
    }

    public function test_customer_can_be_saved_without_a_receivable_limit(): void
    {
        Carbon::setTestNow('2026-06-27 09:00:00');
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $this->actingAs($this->superAdmin())
            ->from('/admin/master/customer')
            ->post('/admin/master/customer', [
                'nama_customer' => 'CUSTOMER TANPA LIMIT',
                'tipe_customer' => 'RETAIL',
                'no_hp' => '',
                'alamat' => '',
                'limit_piutang' => '',
                'status' => 'AKTIF',
            ])
            ->assertRedirect('/admin/master/customer')
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('tm_customer', [
            'nama_customer' => 'CUSTOMER TANPA LIMIT',
            'limit_piutang' => 0,
        ]);
    }

    private function superAdmin(): User
    {
        return User::query()->create([
            'username' => 'store-guard-admin',
            'name' => 'Store Guard Admin',
            'password' => 'secret',
            'role' => 'superadmin',
        ]);
    }
}
