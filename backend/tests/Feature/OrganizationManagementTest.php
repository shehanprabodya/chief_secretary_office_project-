<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function createAdminUser(): User
    {
        $role = Role::firstOrCreate([
            'role_name' => 'admin',
        ], [
            'description' => 'Administrator',
        ]);

        return User::create([
            'full_name' => 'System Admin',
            'email' => 'admin@example.com',
            'username' => 'admin',
            'password_hash' => bcrypt('password123'),
            'role_id' => $role->role_id,
            'status' => 'ACTIVE',
        ]);
    }

    public function test_admin_can_create_update_and_delete_organization(): void
    {
        $admin = $this->createAdminUser();
        $this->actingAs($admin, 'sanctum');

        $createResponse = $this->postJson('/api/admin/organizations', [
            'organization_name' => 'Ministry of Education',
            'abbreviation' => 'MOE',
            'address' => 'Colombo 01',
            'telephone' => '0112345678',
            'email' => 'info@moe.gov.lk',
            'status' => 'ACTIVE',
        ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('organization.organization_name', 'Ministry of Education');

        $organization = Organization::first();

        $this->getJson('/api/admin/organizations')
            ->assertStatus(200)
            ->assertJsonFragment(['organization_name' => 'Ministry of Education']);

        $updateResponse = $this->putJson('/api/admin/organizations/' . $organization->organization_id, [
            'organization_name' => 'Ministry of Education and Training',
            'abbreviation' => 'MOET',
            'address' => 'Colombo 03',
            'telephone' => '0112223344',
            'email' => 'edu@moet.gov.lk',
            'status' => 'ACTIVE',
        ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('organization.organization_name', 'Ministry of Education and Training');

        $deleteResponse = $this->deleteJson('/api/admin/organizations/' . $organization->organization_id);
        $deleteResponse->assertStatus(200)
            ->assertJsonPath('message', 'Organization deleted successfully.');
    }
}
