<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserInvitation extends Model
{
    protected $primaryKey = 'invitation_id';

    protected $fillable = [
        'user_id',
        'email',
        'token_hash',
        'locale',
        'expires_at',
        'accepted_at',
        'invalidated_at',
        'last_sent_at',
        'resent_count',
        'invited_by',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'invalidated_at' => 'datetime',
        'last_sent_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by', 'user_id');
    }

    public function isValid(): bool
    {
        return $this->accepted_at === null
            && $this->invalidated_at === null
            && $this->expires_at->isFuture();
    }
}
