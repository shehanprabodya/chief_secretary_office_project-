<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SigningDelegation extends Model
{
    protected $table = 'signing_delegations';
    protected $primaryKey = 'id';

    protected $fillable = [
        'primary_signer_id',
        'delegated_signer_id',
        'authorized_by',
        'reason',
        'start_date',
        'end_date',
        'status',
        'authorized_at',
        'revoked_at',
        'revoked_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'authorized_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function primarySigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'primary_signer_id', 'user_id');
    }

    public function delegatedSigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegated_signer_id', 'user_id');
    }

    public function authorizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authorized_by', 'user_id');
    }

    public function revokedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by', 'user_id');
    }

    public function documentSignatures(): HasMany
    {
        return $this->hasMany(DocumentSignature::class, 'delegation_id', 'id');
    }

    public function isActiveForNow(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        $today = now()->toDateString();

        return $this->start_date <= $today && $this->end_date >= $today;
    }
}
