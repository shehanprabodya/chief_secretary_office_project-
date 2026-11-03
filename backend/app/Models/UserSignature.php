<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserSignature extends Model
{
    use HasFactory;

    protected $table = 'user_signatures';
    protected $primaryKey = 'id';

    protected $fillable = [
        'user_id',
        'encrypted_file_path',
        'mime_type',
        'file_size',
        'encryption_version',
        'is_active',
        'uploaded_by',
        'uploaded_at',
        'deactivated_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'uploaded_at' => 'datetime',
        'deactivated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by', 'user_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(SignatureAuditLog::class, 'signature_id', 'id');
    }

    public function documentSignatures(): HasMany
    {
        return $this->hasMany(DocumentSignature::class, 'signature_id', 'id');
    }
}
