<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DepartmentHeadRecordAccessTest extends TestCase
{
    public function test_unauthenticated_users_cannot_access_department_head_records(): void
    {
        $this->getJson('/api/dept-head/letters')->assertUnauthorized();
    }

    public function test_non_department_head_roles_cannot_access_department_head_records(): void
    {
        Sanctum::actingAs($this->userWithRole('officer'));

        $this->getJson('/api/dept-head/letters')
            ->assertForbidden()
            ->assertJsonPath('message', 'You do not have permission to access this resource.');
    }

    private function userWithRole(string $roleName): User
    {
        $user = new User();
        $user->user_id = 100;

        $role = new Role();
        $role->role_name = $roleName;
        $user->setRelation('role', $role);

        return $user;
    }
}
