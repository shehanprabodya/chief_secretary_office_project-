<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Meeting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class AttendanceController extends Controller
{
    /**
     * Get attendance sheet for a meeting.
     * If no records exist yet, auto-builds the list from meeting_attendees
     * with default status = 'present' (matches your "all present by default" UI pattern).
     */
    public function show(int $meetingId): JsonResponse
    {
        $meeting = Meeting::findOrFail($meetingId);

        $existingRecords = AttendanceRecord::where('meeting_id', $meetingId)
            ->with('user.organization', 'user.role')
            ->get()
            ->keyBy('user_id');

        $attendees = $meeting->attendees()->with('organization', 'role')->get();

        $participants = $attendees->map(function ($user) use ($existingRecords) {
            $record = $existingRecords->get($user->user_id);

            return [
                'user_id' => $user->user_id,
                'full_name' => $user->full_name,
                'email' => $user->email,
                'department' => $user->organization->organization_name ?? null,
                'role' => $user->role->role_name ?? null,
                'status' => $record?->status ?? 'present',
            ];
        });

        $present = $participants->where('status', 'present')->count();
        $absent = $participants->where('status', 'absent')->count();
        $excused = $participants->where('status', 'excused')->count();
        $total = $participants->count();

        return response()->json([
            'meeting' => $meeting,
            'participants' => $participants->values(),
            'statistics' => [
                'attendance_percentage' => $total > 0 ? round(($present / $total) * 100) : 0,
                'present' => $present,
                'absent' => $absent,
                'excused' => $excused,
            ],
        ]);
    }

    /**
     * Save draft (called automatically as the officer toggles statuses)
     */
    public function saveDraft(Request $request, int $meetingId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'records' => 'required|array',
            'records.*.user_id' => 'required|exists:users,user_id',
            'records.*.status' => 'required|in:present,absent,excused',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        foreach ($request->records as $record) {
            AttendanceRecord::updateOrCreate(
                ['meeting_id' => $meetingId, 'user_id' => $record['user_id']],
                [
                    'status' => $record['status'],
                    'is_draft' => true,
                    'recorded_by' => $request->user()->user_id,
                ]
            );
        }

        return response()->json(['message' => 'Draft saved']);
    }

    /**
     * Finalize attendance ("Submit Attendance" button)
     */
    public function submit(Request $request, int $meetingId): JsonResponse
    {
        AttendanceRecord::where('meeting_id', $meetingId)->update(['is_draft' => false]);

        return response()->json(['message' => 'Attendance submitted and synced']);
    }

    /**
     * Search participants by name, department, or role within a meeting
     */
    public function search(Request $request, int $meetingId): JsonResponse
    {
        $search = $request->get('q', '');

        $meeting = Meeting::findOrFail($meetingId);
        $attendees = $meeting->attendees()
            ->with('organization', 'role')
            ->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhereHas('organization', function ($orgQuery) use ($search) {
                        $orgQuery->where('organization_name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('role', function ($roleQuery) use ($search) {
                        $roleQuery->where('role_name', 'like', "%{$search}%");
                    });
            })
            ->get();

        return response()->json(['participants' => $attendees]);
    }
}

?>
