<?php
namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $devDivision = Department::where('department_name', 'Development Division')->first();
        $ocs = Department::where('department_name', 'Office of the Chief Secretary')->first();
        $hr = Department::where('department_name', 'Human Resources')->first();

        $users = [
            [
                'full_name' => 'System Admin',
                'email' => 'admin@spc.gov.lk',
                'username' => 'admin',
                'password_hash' => Hash::make('password'),
                'role_name' => 'admin',
                'department_id' => $ocs?->department_id,
            ],
            [
                'full_name' => 'P. Gunawardena',
                'email' => 'officer@spc.gov.lk',
                'username' => 'p.gunawardena',
                'password_hash' => Hash::make('password'),
                'role_name' => 'officer',
                'department_id' => $devDivision?->department_id,
            ],
            [
                'full_name' => 'D. Liyanage',
                'email' => 'depthead@spc.gov.lk',
                'username' => 'd.liyanage',
                'password_hash' => Hash::make('password'),
                'role_name' => 'dept_head',
                'department_id' => $hr?->department_id,
            ],
            [
                'full_name' => 'K. Senanayake',
                'email' => 'deputy@spc.gov.lk',
                'username' => 'k.senanayake',
                'password_hash' => Hash::make('password'),
                'role_name' => 'deputy',
                'department_id' => $ocs?->department_id,
            ],
            [
                'full_name' => 'Chief Secretary',
                'email' => 'chiefsec@spc.gov.lk',
                'username' => 'chief.secretary',
                'password_hash' => Hash::make('password'),
                'role_name' => 'chief_secretary',
                'department_id' => $ocs?->department_id,
            ],
        ];

        foreach ($users as $userData) {
            $role = Role::where('role_name', $userData['role_name'])->first();

            if (!$role) {
                $this->command->warn("Role '{$userData['role_name']}' not found. Run RoleSeeder first.");
                continue;
            }

            User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'full_name' => $userData['full_name'],
                    'username' => $userData['username'],
                    'password_hash' => $userData['password_hash'],
                    'role_id' => $role->role_id,
                    'department_id' => $userData['department_id'],
                    'status' => 'ACTIVE',
                ]
            );
        }
    }
}

?>