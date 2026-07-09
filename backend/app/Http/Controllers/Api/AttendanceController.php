<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovableDocument;
use App\Models\AttendanceRecord;
use App\Models\Meeting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class AttendanceController extends Controller
{
    /**
     * Search fully approved meeting letters that can open attendance.
     */
    public function approvedMeetingLetters(Request $request): JsonResponse
    {
        $search = trim((string) $request->get('search', ''));

        $documents = ApprovableDocument::where('document_type', 'letter')
            ->where('status', 'approved')
            ->with([
                'sourceLetter.meeting',
                'sourceLetter.subject',
                'sourceLetter.recipients.user.organization',
                'sourceLetter.recipients.organization',
            ])
            ->whereHas('sourceLetter', function ($letterQuery) use ($search) {
                $letterQuery->whereNotNull('meeting_id');

                if ($search !== '') {
                    $letterQuery->where(function ($q) use ($search) {
                        $q->where('title', 'like', "%{$search}%")
                            ->orWhere('meeting_code', 'like', "%{$search}%")
                            ->orWhereHas('meeting', function ($meetingQuery) use ($search) {
                                $meetingQuery->where('title', 'like', "%{$search}%")
                                    ->orWhere('meeting_code', 'like', "%{$search}%");
                            })
                            ->orWhereHas('subject', function ($subjectQuery) use ($search) {
                                $subjectQuery->where('title', 'like', "%{$search}%")
                                    ->orWhere('code', 'like', "%{$search}%");
                            });
                    });
                }
            })
            ->latest('document_id')
            ->limit(100)
            ->get();

        $letters = $documents
            ->map(function ($document) {
                $letter = $document->sourceLetter;
                $meeting = $letter?->meeting;

                if (!$letter || !$meeting) {
                    return null;
                }

                return [
                    'letter_id' => $letter->letter_id,
                    'meeting_id' => $meeting->meeting_id,
                    'meeting_title' => $meeting->title,
                    'letter_title' => strip_tags($letter->title ?: ($letter->subject?->title ?? '')),
                    'subject_code' => $letter->subject?->code ?? $letter->meeting_code,
                    'subject_title' => $letter->subject?->title,
                    'meeting_date' => optional($meeting->meeting_date)->toDateString(),
                    'start_time' => $meeting->start_time,
                    'end_time' => $meeting->end_time,
                    'location' => $meeting->location,
                    'recipient_count' => $letter->recipients->whereNotNull('user_id')->count(),
                ];
            })
            ->filter()
            ->values();

        return response()->json(['letters' => $letters]);
    }

    /**
     * Get attendance sheet from the approved meeting letter recipients.
     * New recipient rows default to absent until the officer marks them otherwise.
     */
    public function show(Request $request, int $meetingId): JsonResponse
    {
        $meeting = Meeting::findOrFail($meetingId);
        $letterId = $request->integer('letter_id');
        $approvedDocumentQuery = ApprovableDocument::where('document_type', 'letter')
            ->where('status', 'approved')
            ->whereHas('sourceLetter', function ($letterQuery) use ($meetingId, $letterId) {
                $letterQuery->where('meeting_id', $meetingId);

                if ($letterId) {
                    $letterQuery->where('letter_id', $letterId);
                }
            })
            ->with([
                'sourceLetter.recipients.user.organization',
                'sourceLetter.recipients.organization',
            ])
            ->latest('document_id');

        $approvedDocument = $approvedDocumentQuery->first();

        if (!$approvedDocument?->sourceLetter) {
            return response()->json([
                'message' => 'Attendance can be opened only after the meeting letter is fully approved.',
            ], 422);
        }

        $approvedLetter = $approvedDocument->sourceLetter;

        $existingRecords = AttendanceRecord::where('meeting_id', $meetingId)
            ->with('user.organization', 'user.role')
            ->get()
            ->keyBy('user_id');

        $participants = $approvedLetter->recipients
            ->filter(fn ($recipient) => $recipient->user_id && $recipient->user)
            ->unique('user_id')
            ->map(function ($recipient) use ($existingRecords) {
                $user = $recipient->user;
                $record = $existingRecords->get($user->user_id);

                return [
                    'user_id' => $user->user_id,
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'department' => $user->organization->organization_name
                        ?? $recipient->organization?->organization_name,
                    'role' => $user->designation ?? $recipient->recipient_label,
                    'status' => $record?->status ?? 'absent',
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
     * Save draft.
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
