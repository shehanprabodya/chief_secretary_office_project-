<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentSignature extends Model
{
    protected $table = 'document_signatures';
    protected $primaryKey = 'id';

    protected $fillable = [
        'document_type',
        'document_id',
        'signer_id',
        'primary_signer_id',
        'signature_id',
        'signing_type',
        'delegation_id',
        'document_reference',
        'document_hash',
        'signed_pdf_path',
        'signed_at',
        'authentication_method',
    ];

    protected $casts = [
        'signed_at' => 'datetime',
    ];

    public function signer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'signer_id', 'user_id');
    }

    public function primarySigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'primary_signer_id', 'user_id');
    }

    public function signature(): BelongsTo
    {
        return $this->belongsTo(UserSignature::class, 'signature_id', 'id');
    }

    public function delegation(): BelongsTo
    {
        return $this->belongsTo(SigningDelegation::class, 'delegation_id', 'id');
    }
}
