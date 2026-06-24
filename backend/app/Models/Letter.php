<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Letter extends Model
{
    protected $table = 'letters';
    protected $primaryKey = 'letter_id';

    protected $fillable = [
        'meeting_id', 'sender_name', 'title', 'content', 'designation',
        'signatory_name', 'signature_date', 'status', 'created_by',
    ];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class, 'meeting_id', 'meeting_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }

    public function departments(): BelongsToMany
    {
        return $this->belongsToMany(Department::class, 'letter_departments', 'letter_id', 'department_id');
    }

    public function approvalSteps(): HasMany
    {
        return $this->hasMany(ApprovalStep::class, 'letter_id', 'letter_id')->orderBy('step_order');
    }

    /**
     * Create the standard 3-stage workflow when a letter is first saved.
     */
    public function initializeApprovalWorkflow(): void
    {
        $steps = [
            ['step_name' => 'Draft Created', 'step_order' => 1, 'status' => 'completed'],
            ['step_name' => 'Chief Secretary Review', 'step_order' => 2, 'status' => 'pending'],
            ['step_name' => 'Official Seal & Dispatch', 'step_order' => 3, 'status' => 'pending'],
        ];

        foreach ($steps as $step) {
            $this->approvalSteps()->create($step);
        }
    }
}
?>