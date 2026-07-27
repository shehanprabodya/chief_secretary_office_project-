<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AdditionalAttendee extends Model
{
    protected $table = 'additional_attendees';
    protected $primaryKey = 'additional_attendee_id';

    protected $fillable = [
        'meeting_id',
        'letter_id',
        'user_id',
        'full_name',
        'organization',
        'designation',
        'email',
        'addition_reason',
        'added_by',
    ];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class, 'meeting_id', 'meeting_id');
    }

    public function letter(): BelongsTo
    {
        return $this->belongsTo(Letter::class, 'letter_id', 'letter_id');
    }

    public function registeredUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by', 'user_id');
    }

    public function attendanceRecord(): HasOne
    {
        return $this->hasOne(
            AttendanceRecord::class,
            'additional_attendee_id',
            'additional_attendee_id'
        );
    }
}
