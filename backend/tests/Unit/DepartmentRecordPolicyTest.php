<?php

namespace Tests\Unit;

use App\Models\AttendanceRecord;
use App\Models\Letter;
use App\Models\MeetingMinute;
use App\Models\Role;
use App\Models\User;
use App\Policies\AttendanceRecordPolicy;
use App\Policies\LetterPolicy;
use App\Policies\MeetingMinutePolicy;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DepartmentRecordPolicyTest extends TestCase
{
    public static function recordPolicies(): array
    {
        return [
            'meeting letter' => [LetterPolicy::class, Letter::class, 'created_by'],
            'meeting minutes' => [MeetingMinutePolicy::class, MeetingMinute::class, 'created_by'],
            'attendance' => [AttendanceRecordPolicy::class, AttendanceRecord::class, 'recorded_by'],
        ];
    }

    #[DataProvider('recordPolicies')]
    public function test_department_head_can_view_every_record(
        string $policyClass,
        string $modelClass,
        string $ownerColumn,
    ): void {
        $departmentHead = $this->userWithRole(10, 'dept_head');
        $record = $this->recordOwnedBy($modelClass, $ownerColumn, 999);
        $policy = new $policyClass();

        $this->assertTrue($policy->viewAny($departmentHead));
        $this->assertTrue($policy->view($departmentHead, $record));
    }

    #[DataProvider('recordPolicies')]
    public function test_officer_can_only_view_owned_records(
        string $policyClass,
        string $modelClass,
        string $ownerColumn,
    ): void {
        $officer = $this->userWithRole(20, 'officer');
        $ownedRecord = $this->recordOwnedBy($modelClass, $ownerColumn, 20);
        $otherRecord = $this->recordOwnedBy($modelClass, $ownerColumn, 21);
        $policy = new $policyClass();

        $this->assertTrue($policy->viewAny($officer));
        $this->assertTrue($policy->view($officer, $ownedRecord));
        $this->assertFalse($policy->view($officer, $otherRecord));
    }

    private function userWithRole(int $id, string $roleName): User
    {
        $user = new User();
        $user->user_id = $id;
        $role = new Role();
        $role->role_name = $roleName;
        $user->setRelation('role', $role);

        return $user;
    }

    private function recordOwnedBy(string $modelClass, string $ownerColumn, int $ownerId): object
    {
        $record = new $modelClass();
        $record->{$ownerColumn} = $ownerId;

        return $record;
    }
}
