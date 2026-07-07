<?php

namespace Database\Seeders;

use App\Models\Subject;
use Illuminate\Database\Seeder;

class SubjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $subjects = [
            ['code' => 'SUB-001', 'title' => 'Development Project Approval'],
            ['code' => 'SUB-002', 'title' => 'Budget Allocation Review'],
            ['code' => 'SUB-003', 'title' => 'Administrative Circular'],
            ['code' => 'SUB-004', 'title' => 'Provincial Coordination Meeting'],
            ['code' => 'SUB-005', 'title' => 'Policy Implementation Follow-up'],
        ];

        foreach ($subjects as $subject) {
            Subject::firstOrCreate(
                ['code' => $subject['code']],
                ['title' => $subject['title']]
            );
        }
    }
}
