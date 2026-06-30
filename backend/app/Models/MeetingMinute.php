<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MeetingMinute extends Model
{
    protected $table = 'meeting_minutes';
    protected $primaryKey = 'minute_id';

    protected $fillable = [
        'meeting_id', 'discussion_summary', 'status', 'created_by',
    ];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class, 'meeting_id', 'meeting_id');
    }

    public function decisions(): HasMany
    {
        return $this->hasMany(MinuteDecision::class, 'minute_id', 'minute_id')->orderBy('decision_order');
    }

    public function actionItems(): HasMany
    {
        return $this->hasMany(ActionItem::class, 'minute_id', 'minute_id')->orderBy('created_at', 'desc');
    }
}
