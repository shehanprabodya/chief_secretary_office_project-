<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordManagementTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(): User
    {
        $role = Role::firstOrCreate([
            'role_name' => 'officer',
        ], [
            'description' => 'Officer',
        ]);

        return User::create([
            'full_name' => 'Officer User',
            'email' => 'officer@example.com',
            'username' => 'officer',
            'password_hash' => Hash::make('CurrentPass123!'),
            'role_id' => $role->role_id,
            'status' => 'ACTIVE',
        ]);
    }

    public function test_user_can_change_password_and_other_tokens_are_revoked(): void
    {
        Mail::fake();

        $user = $this->createUser();
        $user->createToken('other-device');

        $this->actingAs($user, 'sanctum');

        $this->postJson('/api/auth/change-password', [
            'current_password' => 'CurrentPass123!',
            'password' => 'UpdatedPass123!',
            'password_confirmation' => 'UpdatedPass123!',
            'logout_other_devices' => true,
        ])->assertStatus(200);

        $user->refresh();

        $this->assertTrue(Hash::check('UpdatedPass123!', $user->password_hash));
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_user_can_reset_password_with_valid_token(): void
    {
        Mail::fake();

        $user = $this->createUser();
        $token = Password::broker('users')->createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'ResetPass123!@#',
            'password_confirmation' => 'ResetPass123!@#',
        ])->assertStatus(200);

        $user->refresh();

        $this->assertTrue(Hash::check('ResetPass123!@#', $user->password_hash));
    }
}
