<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApprovableDocument extends Model
{
    protected $table = 'approvable_documents';
    protected $primaryKey = 'document_id';

    protected $fillable = [
        'reference_id', 'document_type', 'source_id', 'subject', 'description',
        'full_content', 'amount', 'status', 'submitted_by', 'current_step_order',
    ];

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by', 'user_id');
    }

    public function sourceLetter(): BelongsTo
    {
        return $this->belongsTo(Letter::class, 'source_id', 'letter_id');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(ApprovalWorkflowStep::class, 'document_id', 'document_id')->orderBy('step_order');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(ApprovalComment::class, 'document_id', 'document_id')->orderBy('created_at');
    }

    public static function generateReferenceId(string $type): string
    {
        $prefixMap = [
            'letter' => 'SPC/DEV',
            'grant' => 'SPC/DEV',
            'training_request' => 'SPC/ADMIN',
            'hr_transfer' => 'SPC/HR',
        ];
        $prefix = $prefixMap[$type] ?? 'SPC/GEN';
        $year = now()->year;
        $count = self::where('document_type', $type)->whereYear('created_at', $year)->count() + 1;

        return sprintf('%s/%d/%03d', $prefix, $year, $count);
    }

    /**
     * Standard 4-stage workflow matching your UI: Officer -> Dept Head -> Deputy -> Chief Secretary
     */
    public function initializeWorkflow(): void
    {
        $steps = [
            ['step_label' => 'Officer', 'step_order' => 1, 'required_role' => 'officer', 'status' => 'approved'],
            ['step_label' => 'Dept Head', 'step_order' => 2, 'required_role' => 'dept_head', 'status' => 'pending'],
            ['step_label' => 'Deputy', 'step_order' => 3, 'required_role' => 'deputy', 'status' => 'waiting'],
            ['step_label' => 'Chief Secretary', 'step_order' => 4, 'required_role' => 'chief_secretary', 'status' => 'waiting'],
        ];

        foreach ($steps as $step) {
            $this->steps()->create([
                ...$step,
                'actioned_by' => $step['status'] === 'approved' ? $this->submitted_by : null,
                'actioned_at' => $step['status'] === 'approved' ? now() : null,
            ]);
        }
    }
}
