<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Meeting extends Model
{
    protected $table = 'meetings';
    protected $primaryKey = 'meeting_id';

    protected $fillable = [
        'reference_id', 'title', 'meeting_date', 'start_time', 'end_time',
        'location', 'location_type', 'department_id', 'status', 'description', 'created_by',
    ];

    protected $casts = [
        'meeting_date' => 'date',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id', 'department_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }

    public function attendees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'meeting_attendees', 'meeting_id', 'user_id')
            ->withPivot('attendance_role');
    }

    public function letters(): HasMany
    {
        return $this->hasMany(Letter::class, 'meeting_id', 'meeting_id');
    }

    /**
     * Auto-generate reference like SPC-MTG-2024-089
     */
    public static function generateReferenceId(): string
    {
        $year = now()->year;
        $count = self::whereYear('created_at', $year)->count() + 1;
        return sprintf('SPC-MTG-%d-%03d', $year, $count);
    }
}



?>