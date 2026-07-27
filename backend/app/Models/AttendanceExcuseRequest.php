<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceExcuseRequest extends Model
{
    protected $table = 'attendance_excuse_requests';
    protected $primaryKey = 'excuse_request_id';

    protected $fillable = [
        'meeting_id',
        'user_id',
        'reason_category',
        'reason_details',
        'status',
        'reviewed_by',
        'review_comment',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class, 'meeting_id', 'meeting_id');
    }

    public function externalOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by', 'user_id');
    }
}
