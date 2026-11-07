<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UserPersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_changes_are_persisted_and_visible_after_page_reload(): void
    {
        $this->withoutMiddleware(ValidateCsrfToken::class);

        $admin = User::query()->create([
            'username' => 'supervisor',
            'name' => 'Supervisor',
            'password' => 'secret',
            'role' => 'superadmin',
        ]);
        $user = User::query()->create([
            'username' => 'kasir-lama',
            'name' => 'Kasir Lama',
            'password' => 'secret',
            'role' => 'admin',
        ]);

        $this->actingAs($admin)
            ->put("/admin/users/{$user->id}", [
                'username' => 'kasir-lama',
                'name' => 'Kasir Baru',
                'role' => 'kasir',
                'password' => '',
            ])
            ->assertRedirect(route('users.index'));

        $this->assertDatabaseHas('tm_users', [
            'id' => $user->id,
            'username' => 'kasir-lama',
            'name' => 'Kasir Baru',
            'role' => 'kasir',
        ]);

        $this->get('/admin/users')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('users.data.0.id', $user->id)
                ->where('users.data.0.name', 'Kasir Baru')
                ->where('users.data.0.role', 'kasir')
            );
    }
}
