<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityAuditLog extends Model
{
    public const CREATED_AT = 'created_at';
    public const UPDATED_AT = null;

    protected $primaryKey = 'audit_log_id';

    protected $fillable = [
        'actor_user_id',
        'target_user_id',
        'event_type',
        'severity',
        'ip_address',
        'user_agent',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id', 'user_id');
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id', 'user_id');
    }
}
