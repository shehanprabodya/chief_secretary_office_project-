<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalWorkflowStep extends Model
{
    protected $table = 'approval_workflow_steps';
    protected $primaryKey = 'step_id';
    public $timestamps = false;

    protected $fillable = [
        'document_id', 'step_label', 'step_order', 'required_role',
        'status', 'actioned_by', 'actioned_at',
    ];

    public function actionedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actioned_by', 'user_id');
    }
}