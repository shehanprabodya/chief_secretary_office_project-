<?php

namespace App\Services;

use App\Models\Meeting;
use App\Models\User;

class AdditionalAttendeeAuthorizationService
{
    public function canManage(User $user, Meeting $meeting): bool
    {
        if (!$user->hasRole('officer')) {
            return false;
        }

        return (int) $meeting->created_by === (int) $user->user_id
            || $meeting->letters()
                ->where('created_by', $user->user_id)
                ->exists();
    }
}
