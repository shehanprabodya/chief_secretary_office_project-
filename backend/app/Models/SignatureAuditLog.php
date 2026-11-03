<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SignatureAuditLog extends Model
{
    public $timestamps = false;

    protected $table = 'signature_audit_logs';
    protected $primaryKey = 'id';

    protected $fillable = [
        'actor_id',
        'signature_id',
        'document_signature_id',
        'action',
        'document_type',
        'document_id',
        'ip_address',
        'user_agent',
        'result',
        'failure_reason',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id', 'user_id');
    }

    public function signature(): BelongsTo
    {
        return $this->belongsTo(UserSignature::class, 'signature_id', 'id');
    }

    public function documentSignature(): BelongsTo
    {
        return $this->belongsTo(DocumentSignature::class, 'document_signature_id', 'id');
    }
}
