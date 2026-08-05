<?php

namespace App\Policies;

use App\Models\AttendanceRecord;
use App\Models\User;
use App\Policies\Concerns\HandlesDepartmentRecordViewing;

class AttendanceRecordPolicy
{
    use HandlesDepartmentRecordViewing;

    public function view(User $user, AttendanceRecord $attendanceRecord): bool
    {
        return $this->mayViewRecord($user, $attendanceRecord->recorded_by);
    }
}
