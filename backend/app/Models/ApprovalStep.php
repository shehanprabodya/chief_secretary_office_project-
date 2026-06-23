<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalStep extends Model
{
    protected $table = 'approval_steps';
    protected $primaryKey = 'step_id';
    public $timestamps = false;

    protected $fillable = [
        'letter_id', 'step_name', 'step_order', 'status', 'actioned_by', 'notes', 'actioned_at',
    ];

    public function letter(): BelongsTo
    {
        return $this->belongsTo(Letter::class, 'letter_id', 'letter_id');
    }

    public function actionedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actioned_by', 'user_id');
    }
}
?>