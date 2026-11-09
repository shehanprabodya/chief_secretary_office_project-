<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailDistribution extends Model
{
    protected $primaryKey = 'distribution_id';

    protected $fillable = [
        'document_type', 'document_id', 'recipient_user_id', 'recipient_key',
        'recipient_name', 'recipient_email', 'email_subject', 'status',
        'attempt_count', 'last_attempted_at', 'processed_at', 'error_details', 'created_by',
    ];

    protected $casts = [
        'last_attempted_at' => 'datetime', 'processed_at' => 'datetime',
    ];

    public function recipientUser(): BelongsTo { return $this->belongsTo(User::class, 'recipient_user_id', 'user_id'); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by', 'user_id'); }
}
