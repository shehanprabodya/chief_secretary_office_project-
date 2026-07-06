<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
     use HasApiTokens, HasFactory;

    protected $table = 'users';
    protected $primaryKey = 'user_id';

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    protected $fillable = [
        'full_name',
        'email',
        'username',
        'password_hash',
        'designation',
        'role_id',
        'organization_id',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Sanctum/Auth facade expects this to return the password field.
     * Your column is "password_hash", not "password".
     */
    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id', 'role_id');
    }

    public function organization(): BelongsTo
    {
    return $this->belongsTo(
        Organization::class,
        'organization_id',
        'organization_id'
    );
    }
    public function isActive(): bool
    {
        return $this->status === 'ACTIVE';
    }

    public function hasRole(string|array $roleNames): bool
    {
        $this->loadMissing('role');

        if (is_array($roleNames)) {
            return in_array($this->role->role_name, $roleNames);
        }

        return $this->role->role_name === $roleNames;
    }
}   
