<?php

namespace App\Services;

use App\Models\SecurityAuditLog;
use App\Models\User;
use Illuminate\Http\Request;

class SecurityAuditService
{
    public function log(
        string $eventType,
        ?User $actor = null,
        ?User $target = null,
        ?Request $request = null,
        string $severity = 'info',
        array $metadata = []
    ): SecurityAuditLog {
        return SecurityAuditLog::create([
            'actor_user_id' => $actor?->user_id,
            'target_user_id' => $target?->user_id,
            'event_type' => $eventType,
            'severity' => $severity,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'metadata' => $metadata,
        ]);
    }
}
