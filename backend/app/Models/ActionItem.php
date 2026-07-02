<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActionItem extends Model
{
    protected $table = 'action_items';
    protected $primaryKey = 'action_item_id';
    public $timestamps = false;

    protected $fillable = [
        'minute_id', 'task_description', 'responsible_officer_id', 'deadline', 'status',
    ];

    protected $casts = ['deadline' => 'date'];

    public function responsibleOfficer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_officer_id', 'user_id');
    }
}