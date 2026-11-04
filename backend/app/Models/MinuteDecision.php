<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MinuteDecision extends Model
{
    protected $table = 'minute_decisions';
    protected $primaryKey = 'decision_id';
    public $timestamps = false;

    protected $fillable = ['minute_id', 'decision_order', 'topic', 'decision_text', 'responsibility'];

    public function minute(): BelongsTo
    {
        return $this->belongsTo(MeetingMinute::class, 'minute_id', 'minute_id');
    }
}