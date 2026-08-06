<?php

namespace App\Policies\Concerns;

use App\Models\User;

trait HandlesDepartmentRecordViewing
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole(['officer', 'dept_head', 'deputy']);
    }

    protected function mayViewRecord(User $user, ?int $createdBy): bool
    {
        if ($user->hasRole(['dept_head', 'deputy'])) {
            return true;
        }

        return $user->hasRole('officer') && $createdBy === $user->user_id;
    }
}
