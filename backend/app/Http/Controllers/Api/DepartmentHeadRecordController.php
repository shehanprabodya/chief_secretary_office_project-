<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRecord;
use App\Models\Letter;
use App\Models\MeetingMinute;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DepartmentHeadRecordController extends Controller
{
    public function officers(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Letter::class);

        $search = trim((string) $request->query('search', ''));

        $officers = User::query()
            ->select('user_id', 'full_name', 'email', 'designation', 'organization_id')
            ->with('organization:organization_id,organization_name')
            ->whereHas('role', fn (Builder $query) => $query->where('role_name', 'officer'))
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search) {
                $query->where('full_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('designation', 'like', "%{$search}%");
            }))
            ->orderBy('full_name')
            ->get();

        return response()->json(['officers' => $officers]);
    }

    public function letters(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Letter::class);
        $filters = $this->filters($request, ['draft', 'pending_approval', 'approved', 'rejected', 'dispatched']);

        $letters = Letter::query()
            ->with([
                'creator:user_id,full_name,email,designation,organization_id',
                'creator.organization:organization_id,organization_name',
                'meeting',
                'subject',
            ])
            ->withCount('recipients')
            ->when($filters['officer_id'], fn (Builder $query, int $officerId) => $query->where('created_by', $officerId))
            ->when($filters['status'], fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['date_from'], fn (Builder $query, string $date) => $query->whereDate('created_at', '>=', $date))
            ->when($filters['date_to'], fn (Builder $query, string $date) => $query->whereDate('created_at', '<=', $date))
            ->when($filters['search'] !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($filters) {
                $search = $filters['search'];
                $query->where('title', 'like', "%{$search}%")
                    ->orWhere('meeting_code', 'like', "%{$search}%")
                    ->orWhereHas('subject', fn (Builder $subject) => $subject
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%"));
            }))
            ->latest('created_at')
            ->paginate($filters['per_page']);

        return response()->json($letters);
    }

    public function showLetter(Letter $letter): JsonResponse
    {
        $this->authorize('view', $letter);

        return response()->json([
            'letter' => $letter->load([
                'creator.organization',
                'meeting',
                'subject',
                'recipients.organization',
                'recipients.user.organization',
            ]),
        ]);
    }

    public function previewLetter(Letter $letter, LetterController $letterController): JsonResponse
    {
        $this->authorize('view', $letter);

        return $letterController->preview($letter->letter_id);
    }

    public function attendance(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AttendanceRecord::class);
        $filters = $this->filters($request, ['draft', 'finalized']);

        $sheets = Letter::query()
            ->select('letters.*')
            ->with([
                'creator:user_id,full_name,email,designation,organization_id',
                'creator.organization:organization_id,organization_name',
                'meeting',
                'subject',
            ])
            ->whereHas('attendanceRecords')
            ->withCount([
                'attendanceRecords as participant_count',
                'attendanceRecords as present_count' => fn (Builder $query) => $query->where('status', 'present'),
                'attendanceRecords as absent_count' => fn (Builder $query) => $query->where('status', 'absent'),
                'attendanceRecords as excused_count' => fn (Builder $query) => $query->where('status', 'excused'),
                'attendanceRecords as finalized_count' => fn (Builder $query) => $query->where('is_draft', false),
                'attendanceRecords as draft_count' => fn (Builder $query) => $query->where('is_draft', true),
            ])
            // Attendance sheets belong to the officer who created the linked
            // meeting letter. This keeps the filter stable even for legacy
            // rows recorded or reviewed by another user.
            ->when($filters['officer_id'], fn (Builder $query, int $officerId) => $query->where('created_by', $officerId))
            ->when($filters['status'] === 'draft', fn (Builder $query) => $query
                ->whereHas('attendanceRecords', fn (Builder $records) => $records->where('is_draft', true)))
            ->when($filters['status'] === 'finalized', fn (Builder $query) => $query
                ->whereHas('attendanceRecords', fn (Builder $records) => $records->where('is_draft', false))
                ->whereDoesntHave('attendanceRecords', fn (Builder $records) => $records->where('is_draft', true)))
            ->when($filters['date_from'], fn (Builder $query, string $date) => $query
                ->whereHas('meeting', fn (Builder $meeting) => $meeting->whereDate('meeting_date', '>=', $date)))
            ->when($filters['date_to'], fn (Builder $query, string $date) => $query
                ->whereHas('meeting', fn (Builder $meeting) => $meeting->whereDate('meeting_date', '<=', $date)))
            ->when($filters['search'] !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($filters) {
                $search = $filters['search'];
                $query->where('title', 'like', "%{$search}%")
                    ->orWhere('meeting_code', 'like', "%{$search}%")
                    ->orWhereHas('meeting', fn (Builder $meeting) => $meeting
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('meeting_code', 'like', "%{$search}%"))
                    ->orWhereHas('subject', fn (Builder $subject) => $subject
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%"));
            }))
            ->orderByDesc(
                \App\Models\Meeting::select('meeting_date')
                    ->whereColumn('meetings.meeting_id', 'letters.meeting_id')
                    ->limit(1)
            )
            ->latest('letters.updated_at')
            ->paginate($filters['per_page']);

        $sheets->getCollection()->transform(function (Letter $letter) {
            $letter->setAttribute(
                'is_finalized',
                $letter->finalized_count > 0 && $letter->draft_count === 0,
            );
            $letter->setAttribute(
                'attendance_percentage',
                $letter->participant_count > 0
                    ? round(($letter->present_count / $letter->participant_count) * 100)
                    : 0,
            );
            $letter->makeHidden(['finalized_count', 'draft_count']);

            return $letter;
        });

        return response()->json($sheets);
    }

    public function showAttendance(
        Request $request,
        int $meetingId,
        AttendanceController $attendanceController,
    ): JsonResponse {
        $this->authorize('viewAny', AttendanceRecord::class);

        return $attendanceController->show($request, $meetingId);
    }

    public function minutes(Request $request): JsonResponse
    {
        $this->authorize('viewAny', MeetingMinute::class);
        $filters = $this->filters($request, ['draft', 'pending_approval', 'approved']);

        $minutes = MeetingMinute::query()
            ->with([
                'creator:user_id,full_name,email,designation,organization_id',
                'creator.organization:organization_id,organization_name',
                'meeting',
            ])
            ->withCount(['decisions', 'actionItems'])
            ->when($filters['officer_id'], fn (Builder $query, int $officerId) => $query->where('created_by', $officerId))
            ->when($filters['status'], fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['date_from'], fn (Builder $query, string $date) => $query->whereDate('created_at', '>=', $date))
            ->when($filters['date_to'], fn (Builder $query, string $date) => $query->whereDate('created_at', '<=', $date))
            ->when($filters['search'] !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($filters) {
                $search = $filters['search'];
                $query->where('discussion_summary', 'like', "%{$search}%")
                    ->orWhereHas('meeting', fn (Builder $meeting) => $meeting
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('meeting_code', 'like', "%{$search}%"));
            }))
            ->latest('created_at')
            ->paginate($filters['per_page']);

        return response()->json($minutes);
    }

    public function showMinutes(MeetingMinute $minute): JsonResponse
    {
        $this->authorize('view', $minute);

        return response()->json([
            'minute' => $minute->load([
                'creator.organization',
                'meeting.attendees.organization',
                'decisions',
                'actionItems.responsibleOfficer.organization',
            ]),
        ]);
    }

    /**
     * @param array<int, string> $statuses
     * @return array{officer_id: int|null, search: string, status: string|null, date_from: string|null, date_to: string|null, per_page: int}
     */
    private function filters(Request $request, array $statuses): array
    {
        $validator = Validator::make($request->query(), [
            'officer_id' => ['nullable', 'integer', 'exists:users,user_id'],
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', Rule::in($statuses)],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $validated = $validator->validate();
        $officerId = isset($validated['officer_id']) ? (int) $validated['officer_id'] : null;

        if ($officerId && !User::whereKey($officerId)
            ->whereHas('role', fn (Builder $query) => $query->where('role_name', 'officer'))
            ->exists()) {
            throw ValidationException::withMessages([
                'officer_id' => ['The selected user must have the officer role.'],
            ]);
        }

        return [
            'officer_id' => $officerId,
            'search' => trim((string) ($validated['search'] ?? '')),
            'status' => $validated['status'] ?? null,
            'date_from' => $validated['date_from'] ?? null,
            'date_to' => $validated['date_to'] ?? null,
            'per_page' => (int) ($validated['per_page'] ?? 15),
        ];
    }
}
