<?php

namespace Tests\Feature;

use App\Models\Business\SystemDate;
use App\Models\Business\TokoClosing;
use App\Models\User;
use App\Services\Business\BusinessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
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
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/business/UtilityPage', false)
                ->where('operationalDate', '2026-06-26')
                ->where('currentDate', '2026-06-27')
                ->where('requiresStoreClosing', true));
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

    public function test_batch_close_all_missed_days_when_store_is_multiple_days_behind(): void
    {
        Carbon::setTestNow('2026-07-05 09:00:00');
        SystemDate::query()->updateOrCreate(['id' => 1], ['tanggal_system' => '2026-06-30']);
        $user = $this->superAdmin();

        $this->actingAs($user);

        // Batch close from June 30 to July 4 (5 days, target date = today July 5)
        app(BusinessService::class)->closeStore('2026-07-05');

        // After batch close, system date should advance to July 5 (today)
        $systemDate = SystemDate::query()->first();
        $this->assertEquals('2026-07-05', $systemDate->tanggal_system->toDateString());

        // All intermediate TokoClosing records should exist
        $expectedDates = ['2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04'];
        foreach ($expectedDates as $date) {
            $this->assertTrue(
                TokoClosing::query()->whereDate('tanggal_tutup', $date)->exists(),
                "Missing TokoClosing for date: {$date}"
            );
        }

        // Should not close today (July 5)
        $this->assertFalse(
            TokoClosing::query()->whereDate('tanggal_tutup', '2026-07-05')->exists(),
            'Should not have TokoClosing for today (July 5)'
        );

        // Application should be accessible now
        $this->get('/admin/dashboard')->assertOk();
    }

    public function test_batch_close_shows_correct_message_on_utility_page(): void
    {
        Carbon::setTestNow('2026-07-05 09:00:00');
        SystemDate::query()->updateOrCreate(['id' => 1], ['tanggal_system' => '2026-06-30']);

        $this->actingAs($this->superAdmin())
            ->get('/admin/utility')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/business/UtilityPage', false)
                ->where('operationalDate', '2026-06-30')
                ->where('currentDate', '2026-07-05')
                ->where('requiresStoreClosing', true)
                ->where('missedDays', 5));
    }

    public function test_cannot_close_date_before_operational_date(): void
    {
        Carbon::setTestNow('2026-07-05 09:00:00');
        SystemDate::query()->updateOrCreate(['id' => 1], ['tanggal_system' => '2026-07-03']);

        $this->actingAs($this->superAdmin());

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        app(BusinessService::class)->closeStore('2026-07-01');
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
