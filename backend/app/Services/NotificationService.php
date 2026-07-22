<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    public function sendToUser(
        int $userId,
        string $type,
        string $title,
        string $message,
        ?string $actionUrl = null,
        ?string $entityType = null,
        ?int $entityId = null,
        string $priority = 'normal',
    ): Notification {
        return Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'action_url' => $actionUrl,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'priority' => $priority,
        ]);
    }

    public function sendToRole(
        string $role,
        string $type,
        string $title,
        string $message,
        ?string $actionUrl = null,
        ?string $entityType = null,
        ?int $entityId = null,
        string $priority = 'normal',
        ?int $exceptUserId = null,
    ): void {
        User::query()
            ->where('status', 'ACTIVE')
            ->whereHas('role', fn ($query) => $query->where('role_name', $role))
            ->when($exceptUserId, fn ($query) => $query->where('user_id', '!=', $exceptUserId))
            ->pluck('user_id')
            ->each(fn (int $userId) => $this->sendToUser(
                $userId,
                $type,
                $title,
                $message,
                $actionUrl,
                $entityType,
                $entityId,
                $priority,
            ));
    }
}
