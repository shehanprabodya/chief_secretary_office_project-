<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Letter extends Model
{
    protected $table = 'letters';
    protected $primaryKey = 'letter_id';

    protected $fillable = [
        'meeting_id', 'meeting_code', 'sender_name', 'title', 'content',
        'designation', 'organization_name', 'organization_address',
        'signatory_name', 'signature_date', 'status', 'created_by', 'subject_id',
    ];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class, 'meeting_id', 'meeting_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(LetterRecipient::class, 'letter_id', 'letter_id');
    }
}
