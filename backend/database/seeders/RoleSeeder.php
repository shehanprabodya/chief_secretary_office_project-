<?php
namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['role_name' => 'admin', 'description' => 'Full system administrator access'],
            ['role_name' => 'officer', 'description' => 'Development officer - creates meetings, minutes, letters'],
            ['role_name' => 'dept_head', 'description' => 'Department head - approves departmental requests'],
            ['role_name' => 'deputy', 'description' => 'Deputy secretary - reviews approvals'],
            ['role_name' => 'chief_secretary', 'description' => 'Chief secretary - final approval authority'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['role_name' => $role['role_name']], $role);
        }
    }
}
?>