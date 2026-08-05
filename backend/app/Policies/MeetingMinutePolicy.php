<?php

namespace App\Policies;

use App\Models\MeetingMinute;
use App\Models\User;
use App\Policies\Concerns\HandlesDepartmentRecordViewing;

class MeetingMinutePolicy
{
    use HandlesDepartmentRecordViewing;

    public function view(User $user, MeetingMinute $minute): bool
    {
        return $this->mayViewRecord($user, $minute->created_by);
    }
}
