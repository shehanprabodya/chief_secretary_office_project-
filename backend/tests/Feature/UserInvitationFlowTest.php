<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserInvitationFlowTest extends TestCase
{
    use RefreshDatabase;

    private function createRole(string $name): Role
    {
        return Role::firstOrCreate([
            'role_name' => $name,
        ], [
            'description' => $name,
        ]);
    }

    private function createAdmin(): User
    {
        return User::create([
            'full_name' => 'Admin User',
            'email' => 'admin@example.com',
            'username' => 'admin',
            'password_hash' => bcrypt('AdminPass123!'),
            'role_id' => $this->createRole('admin')->role_id,
            'status' => 'ACTIVE',
        ]);
    }

    public function test_user_can_accept_invitation_once(): void
    {
        $officerRole = $this->createRole('officer');

        $createdUser = User::create([
            'full_name' => 'Officer One',
            'email' => 'officer@example.com',
            'username' => 'officer.one',
            'password_hash' => bcrypt('TempPass123!'),
            'role_id' => $officerRole->role_id,
            'status' => 'ACTIVE',
        ]);

        $admin = $this->createAdmin();

        $token = 'KnownTokenPass123!';
        $invitation = UserInvitation::create([
            'user_id' => $createdUser->user_id,
            'email' => $createdUser->email,
            'token_hash' => Hash::make($token),
            'locale' => 'en',
            'expires_at' => now()->addDay(),
            'invited_by' => $admin->user_id,
        ]);

        $this->getJson('/api/auth/invitations/'.$invitation->invitation_id.'/validate?token='.$token)
            ->assertStatus(200)
            ->assertJsonPath('invitation.user.email', 'officer@example.com');

        $this->postJson('/api/auth/invitations/'.$invitation->invitation_id.'/accept', [
            'token' => $token,
            'password' => 'NewStrongPass123!',
            'password_confirmation' => 'NewStrongPass123!',
            'locale' => 'en',
        ])->assertStatus(200);

        $this->postJson('/api/auth/invitations/'.$invitation->invitation_id.'/accept', [
            'token' => $token,
            'password' => 'AnotherStrongPass123!',
            'password_confirmation' => 'AnotherStrongPass123!',
            'locale' => 'en',
        ])->assertStatus(422);
    }
}
