<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MinuteDecision extends Model
{
    protected $table = 'minute_decisions';
    protected $primaryKey = 'decision_id';
    public $timestamps = false;

    protected $fillable = ['minute_id', 'decision_order', 'decision_text'];
}