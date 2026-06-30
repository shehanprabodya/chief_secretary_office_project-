<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalComment extends Model
{
    protected $table = 'approval_comments';
    protected $primaryKey = 'comment_id';
    public $timestamps = false;

    protected $fillable = ['document_id', 'user_id', 'comment'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}