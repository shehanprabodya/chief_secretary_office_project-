<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BackupManagementTest extends TestCase
{
    use RefreshDatabase;

    private function createUserWithRole(string $roleName, string $email): User
    {
        $role = Role::firstOrCreate([
            'role_name' => $roleName,
        ], [
            'description' => $roleName,
        ]);

        return User::create([
            'full_name' => ucfirst($roleName).' User',
            'email' => $email,
            'username' => str_replace('@example.com', '', $email),
            'password_hash' => bcrypt('Password123!'),
            'role_id' => $role->role_id,
            'status' => 'ACTIVE',
        ]);
    }

    public function test_non_admin_cannot_access_backup_endpoints(): void
    {
        $officer = $this->createUserWithRole('officer', 'officer@example.com');

        $this->actingAs($officer, 'sanctum');

        $this->getJson('/api/admin/backups')->assertStatus(403);
        $this->postJson('/api/admin/backups')->assertStatus(403);
    }

    public function test_admin_can_create_backup(): void
    {
        Storage::fake('backups');
        config()->set('backup.encryption_key', 'base64:'.base64_encode(random_bytes(32)));

        $admin = $this->createUserWithRole('admin', 'admin@example.com');

        $this->actingAs($admin, 'sanctum');

        $response = $this->postJson('/api/admin/backups', [
            'type' => 'full',
            'retention_days' => 7,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('backup.type', 'full');
    }
}
