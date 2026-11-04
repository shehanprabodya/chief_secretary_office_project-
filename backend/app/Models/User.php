<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'full_name_si',
        'email',
        'username',
        'password_hash',
        'designation',
        'designation_si',
        'role_id',
        'organization_id',
        'status',
        'preferred_locale',
        'invitation_pending',
        'invited_at',
        'password_changed_at',
        'last_login_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'invitation_pending' => 'boolean',
        'invited_at' => 'datetime',
        'password_changed_at' => 'datetime',
        'last_login_at' => 'datetime',
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

    public function attendanceExcuseRequests(): HasMany
    {
        return $this->hasMany(AttendanceExcuseRequest::class, 'user_id', 'user_id');
    }

    public function reviewedAttendanceExcuseRequests(): HasMany
    {
        return $this->hasMany(AttendanceExcuseRequest::class, 'reviewed_by', 'user_id');
    }

    public function additionalAttendanceEntries(): HasMany
    {
        return $this->hasMany(AdditionalAttendee::class, 'user_id', 'user_id');
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(UserInvitation::class, 'user_id', 'user_id');
    }

    public function addedAttendanceEntries(): HasMany
    {
        return $this->hasMany(AdditionalAttendee::class, 'added_by', 'user_id');
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

    public function displayNameSinhala(): string
    {
        return trim((string) ($this->full_name_si ?: $this->full_name));
    }

    public function designationSinhala(): ?string
    {
        $designation = trim((string) ($this->designation_si ?: $this->designation));
        return $designation !== '' ? $designation : null;
    }
}   
