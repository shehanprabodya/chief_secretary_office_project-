<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BackupArchive extends Model
{
    protected $primaryKey = 'backup_id';

    protected $fillable = [
        'type',
        'storage_disk',
        'storage_path',
        'size_bytes',
        'sha256_checksum',
        'encryption_algorithm',
        'retention_until',
        'created_by',
        'status',
        'restored_at',
        'metadata',
    ];

    protected $casts = [
        'retention_until' => 'datetime',
        'restored_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }
}
