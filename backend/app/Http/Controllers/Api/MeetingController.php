<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
use App\Models\Letter;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class MeetingController extends Controller
{
    public function __construct(private readonly NotificationService $notifications)
    {
    }

    /**
     * List meetings with subject and date filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Meeting::with('subject', 'creator');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('meeting_code', 'like', "%{$search}%")
                  ->orWhereHas('subject', function ($subjectQuery) use ($search) {
                      $subjectQuery->where('title', 'like', "%{$search}%")
                          ->orWhere('code', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('subject_code')) {
            $query->where('meeting_code', 'like', "%{$request->subject_code}%");
        }

        if ($request->filled('subject_title')) {
            $subjectTitle = $request->subject_title;
            $query->whereHas('subject', function ($subjectQuery) use ($subjectTitle) {
                $subjectQuery->where('title', 'like', "%{$subjectTitle}%");
            });
        }

        if ($request->filled('start_date')) {
            $query->whereDate('meeting_date', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('meeting_date', '<=', $request->end_date);
        }

        $meetings = $query->orderBy('meeting_date', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json($meetings);
    }

    /**
     * Single meeting with full details (for calendar popup / edit modal)
     */
    public function show(int $id): JsonResponse
    {
        $meeting = Meeting::with('creator', 'attendees')->findOrFail($id);
        return response()->json(['meeting' => $meeting]);
    }

    /**
     * Get meetings for a specific date (used by Calendar widget)
     */
    public function byDate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid date'], 422);
        }

        $meetings = Meeting::with('subject', 'creator', 'attendees')
            ->whereDate('meeting_date', $request->date)
            ->orderBy('start_time')
            ->get();

        return response()->json(['meetings' => $meetings]);
    }

    /**
     * Get meetings created by the authenticated officer for a specific date.
     */
    public function createdByDate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid date'], 422);
        }

        $meetings = Meeting::with('subject', 'creator')
            ->where('created_by', $request->user()->user_id)
            ->whereDate('meeting_date', $request->date)
            ->where('status', '!=', 'cancelled')
            ->orderBy('start_time')
            ->get();

        return response()->json(['meetings' => $meetings]);
    }

    /**
     * Upcoming meetings created by the authenticated officer.
     */
    public function createdUpcoming(Request $request): JsonResponse
    {
        $meetings = Meeting::with('subject', 'creator')
            ->where('created_by', $request->user()->user_id)
            ->whereDate('meeting_date', '>=', now()->toDateString())
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->orderBy('meeting_date')
            ->orderBy('start_time')
            ->limit(5)
            ->get();

        return response()->json(['meetings' => $meetings]);
    }

    /**
     * Upcoming meetings assigned to the authenticated officer.
     */
    public function assignedUpcoming(Request $request): JsonResponse
    {
        $userId = $request->user()->user_id;

        $meetings = Meeting::with('subject')
            ->whereHas('attendees', fn ($query) => $query->where('users.user_id', $userId))
            ->whereDate('meeting_date', '>=', now()->toDateString())
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->orderBy('meeting_date')
            ->orderBy('start_time')
            ->limit(5)
            ->get();

        return response()->json(['meetings' => $meetings]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'meeting_date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'location' => 'required|string|max:255',
            'location_type' => 'sometimes|in:physical,virtual,not_assigned',
            'meeting_code' => 'nullable|string|max:50|exists:subjects,code',
            'status' => 'sometimes|in:draft,scheduled,completed,cancelled',
            'description' => 'nullable|string',
            'attendee_ids' => 'nullable|array',
            'attendee_ids.*' => 'exists:users,user_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $meetingData = $validator->safe()->except('attendee_ids');
        $meetingData['location_type'] = $meetingData['location_type'] ?? 'physical';
        $meetingData['status'] = $meetingData['status'] ?? 'draft';
        $meetingData['created_by'] = $request->user()->user_id;

        $meeting = Meeting::create($meetingData);

        if ($request->filled('attendee_ids')) {
            $meeting->attendees()->attach($request->attendee_ids);
        }

        $this->notifyMeetingAttendees($meeting->load('attendees.role'), 'meeting_assigned', 'New meeting assigned');

        return response()->json([
            'message' => 'Meeting created successfully',
            'meeting' => $meeting->load('attendees'),
        ], 201);
    }

    /**
     * Update meeting - this powers the Calendar click-to-edit popup
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $meeting = Meeting::findOrFail($id);

        $canEdit = (int) $meeting->created_by === (int) $request->user()->user_id;

        if ($request->filled('letter_id')) {
            $canEdit = Letter::where('letter_id', $request->integer('letter_id'))
                ->where('meeting_id', $meeting->meeting_id)
                ->where('created_by', $request->user()->user_id)
                ->exists();
        }

        if (!$canEdit) {
            return response()->json([
                'message' => 'Only the creator can edit these meeting details.',
            ], 403);
        }
        
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'meeting_date' => 'sometimes|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'location' => 'nullable|string|max:255',
            'location_type' => 'sometimes|in:physical,virtual,not_assigned',
            'status' => 'sometimes|in:draft,scheduled,completed,cancelled',
            'description' => 'nullable|string',
            'letter_id' => 'nullable|exists:letters,letter_id',
            'attendee_ids' => 'nullable|array',
            'attendee_ids.*' => 'exists:users,user_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $meeting->update($validator->safe()->except(['attendee_ids', 'letter_id']));

        if ($request->has('attendee_ids')) {
            $meeting->attendees()->sync($request->attendee_ids);
        }

        $this->notifyMeetingAttendees($meeting->load('attendees.role'), 'meeting_updated', 'Meeting details updated');

        return response()->json([
            'message' => 'Meeting updated successfully',
            'meeting' => $meeting->load('attendees'),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $meeting = Meeting::with('attendees.role')->findOrFail($id);

        if ((int) $meeting->created_by !== (int) $request->user()->user_id) {
            return response()->json(['message' => 'Only the creator can cancel this meeting.'], 403);
        }

        $meeting->update(['status' => 'cancelled']);

        $this->notifyMeetingAttendees($meeting, 'meeting_cancelled', 'Meeting cancelled', 'urgent');

        return response()->json(['message' => 'Meeting cancelled']);
    }

    private function notifyMeetingAttendees(
        Meeting $meeting,
        string $type,
        string $title,
        string $priority = 'important',
    ): void {
        foreach ($meeting->attendees as $attendee) {
            if ((int) $attendee->user_id === (int) $meeting->created_by) {
                continue;
            }

            $actionUrl = $attendee->role?->role_name === 'external_officer'
                ? '/dashboard/external-officer#meetings'
                : "/meetings/{$meeting->meeting_id}";

            $this->notifications->sendToUser(
                $attendee->user_id,
                $type,
                $title,
                "{$meeting->title} — {$meeting->meeting_date} {$meeting->start_time}",
                $actionUrl,
                'meeting',
                $meeting->meeting_id,
                $priority,
            );
        }
    }
}


?>
