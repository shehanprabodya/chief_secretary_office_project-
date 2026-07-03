<?php
namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['role_name' => 'admin',           'description' => 'සම්පූර්ණ පද්ධති පරිපාලක අයිතිය'],
            ['role_name' => 'officer',          'description' => 'සංවර්ධන නිලධාරී - රැස්වීම්, ලිපි, මිනිත්තු සකසයි'],
            ['role_name' => 'dept_head',        'description' => 'දෙපාර්තමේන්තු ප්‍රධානී - නිලධාරී කාර්ය අනුමත කරයි'],
            ['role_name' => 'deputy',           'description' => 'නියෝජ්‍ය ලේකම් - අනුමත කිරීම් සමාලෝචනය කරයි'],
            ['role_name' => 'chief_secretary',  'description' => 'ප්‍රධාන ලේකම් - අවසන් අනුමත අධිකාරිය'],
            ['role_name' => 'external_officer', 'description' => 'බාහිර ආයතන නිලධාරී - ලිපි ලබා ගනී, රැස්වීම්වලට සහභාගී වේ'],
        
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['role_name' => $role['role_name']], $role);
        }
    }
}
?>