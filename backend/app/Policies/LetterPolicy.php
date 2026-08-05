<?php

namespace App\Policies;

use App\Models\Letter;
use App\Models\User;
use App\Policies\Concerns\HandlesDepartmentRecordViewing;

class LetterPolicy
{
    use HandlesDepartmentRecordViewing;

    public function view(User $user, Letter $letter): bool
    {
        return $this->mayViewRecord($user, $letter->created_by);
    }
}
