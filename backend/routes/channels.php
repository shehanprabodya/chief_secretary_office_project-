<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Broadcast::channel('users.{userId}', function ($user, int $userId) {
    return (int) $user->user_id === $userId;
});
