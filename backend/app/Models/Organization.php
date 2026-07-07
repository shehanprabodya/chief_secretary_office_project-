<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    protected $table = 'organizations';

    protected $primaryKey = 'organization_id';

    protected $fillable = [
        'organization_name',
        'abbreviation',
        'address',
        'telephone',
        'email',
        'status'
    ];

     public function users(): HasMany
    {
        return $this->hasMany(User::class, 'organization_id', 'organization_id');
    }
}
