<?php
namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            'Development Division',
            'Human Resources',
            'Finance & Treasury',
            'Office of the Chief Secretary',
            'Public Health',
        ];

        foreach ($departments as $name) {
            Department::updateOrCreate(['department_name' => $name], ['department_name' => $name]);
        }
    }
}
?>