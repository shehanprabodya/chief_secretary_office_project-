<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceExcuseRequest;
use App\Models\Meeting;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ExternalOfficerController extends Controller
{
    /**
     * Return only meetings assigned to the authenticated external officer.
     * Letters are limited to approved/dispatched documents so workflow drafts
     * are never exposed outside the office.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $userId = $request->user()->user_id;

        $meetings = Meeting::query()
            ->with([
                'subject:id,code,title',
                'creator:user_id,full_name,designation',
                'letters' => fn ($query) => $query
                    ->whereIn('status', ['approved', 'dispatched'])
                    ->latest('letter_id')
                    ->select([
                        'letter_id',
                        'meeting_id',
                        'sender_name',
                        'title',
                        'content',
                        'designation',
                        'organization_name',
                        'organization_address',
                        'signatory_name',
                        'signature_date',
                        'status',
                    ]),
            ])
            ->withCount('attendees')
            ->whereHas('attendees', fn ($query) => $query->where('users.user_id', $userId))
            ->where('status', '!=', 'cancelled')
            ->orderByRaw("CASE WHEN meeting_date >= ? THEN 0 ELSE 1 END", [now()->toDateString()])
            ->orderBy('meeting_date')
            ->orderBy('start_time')
            ->get()
            ->map(function (Meeting $meeting) {
                $letter = $meeting->letters->first();

                return [
                    'meeting_id' => $meeting->meeting_id,
                    'reference_id' => $meeting->reference_id,
                    'meeting_code' => $meeting->meeting_code,
                    'title' => $meeting->title,
                    'meeting_date' => $meeting->meeting_date?->toDateString(),
                    'start_time' => $meeting->start_time,
                    'end_time' => $meeting->end_time,
                    'location' => $meeting->location,
                    'location_type' => $meeting->location_type,
                    'status' => $meeting->status,
                    'description' => $meeting->description,
                    'attendees_count' => $meeting->attendees_count,
                    'subject' => $meeting->subject,
                    'organizer' => $meeting->creator?->full_name,
                    'organizer_designation' => $meeting->creator?->designation,
                    'letter' => $letter ? [
                        'letter_id' => $letter->letter_id,
                        'sender_name' => $letter->sender_name,
                        'title' => $letter->title,
                        'content' => $letter->content,
                        'designation' => $letter->designation,
                        'organization_name' => $letter->organization_name,
                        'organization_address' => $letter->organization_address,
                        'signatory_name' => $letter->signatory_name,
                        'signature_date' => $letter->signature_date,
                        'status' => $letter->status,
                    ] : null,
                ];
            });

        return response()->json(['meetings' => $meetings]);
    }

    public function submitExcuseRequest(Request $request, int $meetingId): JsonResponse
    {
        $validator = $this->validateExcuseRequest($request);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Please provide a valid reason for being unable to attend.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $meeting = $this->assignedMeeting($request, $meetingId);

        if (!$meeting) {
            return response()->json([
                'message' => 'You are not assigned to this meeting.',
            ], 403);
        }

        if (!$this->canRequestExcuse($meeting)) {
            return response()->json([
                'message' => 'Excuse requests can only be submitted before an upcoming meeting begins.',
            ], 422);
        }

        $excuseRequest = AttendanceExcuseRequest::where('meeting_id', $meeting->meeting_id)
            ->where('user_id', $request->user()->user_id)
            ->first();

        if ($excuseRequest && $excuseRequest->status !== 'withdrawn') {
            return response()->json([
                'message' => 'You have already submitted an excuse request for this meeting.',
                'excuse_request' => $this->excuseRequestData($excuseRequest),
            ], 409);
        }

        $values = [
            'reason_category' => $validator->validated()['reason_category'],
            'reason_details' => $validator->validated()['reason_details'],
            'status' => 'pending',
            'reviewed_by' => null,
            'review_comment' => null,
            'reviewed_at' => null,
        ];

        if ($excuseRequest) {
            $excuseRequest->update($values);
        } else {
            $excuseRequest = AttendanceExcuseRequest::create($values + [
                'meeting_id' => $meeting->meeting_id,
                'user_id' => $request->user()->user_id,
            ]);
        }

        return response()->json([
            'message' => 'Your excuse request has been submitted for review.',
            'excuse_request' => $this->excuseRequestData($excuseRequest->fresh()),
        ], 201);
    }

    public function updateExcuseRequest(Request $request, int $meetingId): JsonResponse
    {
        $validator = $this->validateExcuseRequest($request);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Please provide a valid reason for being unable to attend.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $meeting = $this->assignedMeeting($request, $meetingId);

        if (!$meeting) {
            return response()->json(['message' => 'You are not assigned to this meeting.'], 403);
        }

        if (!$this->canRequestExcuse($meeting)) {
            return response()->json([
                'message' => 'Excuse requests cannot be changed after the meeting begins.',
            ], 422);
        }

        $excuseRequest = AttendanceExcuseRequest::where('meeting_id', $meeting->meeting_id)
            ->where('user_id', $request->user()->user_id)
            ->first();

        if (!$excuseRequest) {
            return response()->json(['message' => 'No excuse request was found for this meeting.'], 404);
        }

        if ($excuseRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Only a pending excuse request can be edited.',
            ], 409);
        }

        $excuseRequest->update($validator->validated());

        return response()->json([
            'message' => 'Your excuse request has been updated.',
            'excuse_request' => $this->excuseRequestData($excuseRequest->fresh()),
        ]);
    }

    public function withdrawExcuseRequest(Request $request, int $meetingId): JsonResponse
    {
        $meeting = $this->assignedMeeting($request, $meetingId);

        if (!$meeting) {
            return response()->json(['message' => 'You are not assigned to this meeting.'], 403);
        }

        if (!$this->canRequestExcuse($meeting)) {
            return response()->json([
                'message' => 'Excuse requests cannot be withdrawn after the meeting begins.',
            ], 422);
        }

        $excuseRequest = AttendanceExcuseRequest::where('meeting_id', $meeting->meeting_id)
            ->where('user_id', $request->user()->user_id)
            ->first();

        if (!$excuseRequest) {
            return response()->json(['message' => 'No excuse request was found for this meeting.'], 404);
        }

        if ($excuseRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Only a pending excuse request can be withdrawn.',
            ], 409);
        }

        $excuseRequest->update(['status' => 'withdrawn']);

        return response()->json([
            'message' => 'Your excuse request has been withdrawn.',
            'excuse_request' => $this->excuseRequestData($excuseRequest->fresh()),
        ]);
    }

    private function validateExcuseRequest(Request $request): \Illuminate\Validation\Validator
    {
        return Validator::make($request->all(), [
            'reason_category' => 'required|in:official_duty,medical,schedule_conflict,other',
            'reason_details' => 'required|string|min:5|max:2000',
        ]);
    }

    private function assignedMeeting(Request $request, int $meetingId): ?Meeting
    {
        return Meeting::where('meeting_id', $meetingId)
            ->whereHas('attendees', fn ($query) => $query
                ->where('users.user_id', $request->user()->user_id))
            ->first();
    }

    private function canRequestExcuse(Meeting $meeting): bool
    {
        if (in_array($meeting->status, ['completed', 'cancelled'], true)) {
            return false;
        }

        if (!$meeting->meeting_date || $meeting->meeting_date->isBefore(now()->startOfDay())) {
            return false;
        }

        if ($meeting->meeting_date->isToday() && $meeting->start_time) {
            $startsAt = Carbon::parse(
                $meeting->meeting_date->toDateString() . ' ' . $meeting->start_time,
                config('app.timezone')
            );

            return now()->isBefore($startsAt);
        }

        return true;
    }

    private function excuseRequestData(AttendanceExcuseRequest $excuseRequest): array
    {
        return [
            'excuse_request_id' => $excuseRequest->excuse_request_id,
            'meeting_id' => $excuseRequest->meeting_id,
            'reason_category' => $excuseRequest->reason_category,
            'reason_details' => $excuseRequest->reason_details,
            'status' => $excuseRequest->status,
            'review_comment' => $excuseRequest->review_comment,
            'submitted_at' => $excuseRequest->created_at?->toISOString(),
            'updated_at' => $excuseRequest->updated_at?->toISOString(),
            'reviewed_at' => $excuseRequest->reviewed_at?->toISOString(),
        ];
    }
}
