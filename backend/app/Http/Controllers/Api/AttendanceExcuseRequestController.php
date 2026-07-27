<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceExcuseRequest;
use App\Models\AttendanceRecord;
use App\Models\Letter;
use App\Models\Meeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AttendanceExcuseRequestController extends Controller
{
    public function index(Request $request, int $meetingId): JsonResponse
    {
        $meeting = Meeting::findOrFail($meetingId);

        if (!$this->isOrganizer($request, $meeting)) {
            return response()->json([
                'message' => 'Only the meeting organizer can view excuse requests.',
            ], 403);
        }

        $excuseRequests = AttendanceExcuseRequest::where('meeting_id', $meeting->meeting_id)
            ->with([
                'externalOfficer:user_id,full_name,email,designation,organization_id',
                'externalOfficer.organization:organization_id,organization_name',
                'reviewer:user_id,full_name,designation',
            ])
            ->latest('created_at')
            ->get()
            ->map(fn (AttendanceExcuseRequest $excuseRequest) => $this->requestData($excuseRequest));

        return response()->json([
            'meeting_id' => $meeting->meeting_id,
            'excuse_requests' => $excuseRequests,
        ]);
    }

    public function approve(Request $request, int $meetingId, int $requestId): JsonResponse
    {
        return $this->review($request, $meetingId, $requestId, 'approved');
    }

    public function reject(Request $request, int $meetingId, int $requestId): JsonResponse
    {
        return $this->review($request, $meetingId, $requestId, 'rejected');
    }

    private function review(
        Request $request,
        int $meetingId,
        int $requestId,
        string $decision
    ): JsonResponse {
        $validator = Validator::make($request->all(), [
            'review_comment' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'The review comment is invalid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $meeting = Meeting::findOrFail($meetingId);

        if (!$this->isOrganizer($request, $meeting)) {
            return response()->json([
                'message' => 'Only the meeting organizer can review excuse requests.',
            ], 403);
        }

        $excuseRequest = AttendanceExcuseRequest::where('excuse_request_id', $requestId)
            ->where('meeting_id', $meeting->meeting_id)
            ->first();

        if (!$excuseRequest) {
            return response()->json([
                'message' => 'The excuse request was not found for this meeting.',
            ], 404);
        }

        if ($excuseRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Only a pending excuse request can be reviewed.',
            ], 409);
        }

        $letter = null;
        if ($decision === 'approved') {
            $letter = $this->approvedLetterFor($meeting, $excuseRequest);

            if (!$letter) {
                return response()->json([
                    'message' => 'This request cannot be approved until the external officer has an approved meeting letter.',
                ], 422);
            }
        }

        [$excuseRequest, $attendanceRecord, $wasReviewed] = DB::transaction(function () use (
            $request,
            $meeting,
            $excuseRequest,
            $letter,
            $decision,
            $validator
        ) {
            $lockedRequest = AttendanceExcuseRequest::where(
                'excuse_request_id',
                $excuseRequest->excuse_request_id
            )->lockForUpdate()->firstOrFail();

            if ($lockedRequest->status !== 'pending') {
                return [$lockedRequest, null, false];
            }

            $attendanceRecord = null;
            if ($decision === 'approved' && $letter) {
                $attendanceRecord = AttendanceRecord::firstOrNew([
                    'letter_id' => $letter->letter_id,
                    'user_id' => $lockedRequest->user_id,
                ]);
                $attendanceRecord->meeting_id = $meeting->meeting_id;
                $attendanceRecord->letter_recipient_id = null;
                $attendanceRecord->status = 'excused';
                $attendanceRecord->recorded_by = $request->user()->user_id;

                if (!$attendanceRecord->exists) {
                    $attendanceRecord->is_draft = true;
                }

                $attendanceRecord->save();
            }

            $lockedRequest->update([
                'status' => $decision,
                'reviewed_by' => $request->user()->user_id,
                'review_comment' => $validator->validated()['review_comment'] ?? null,
                'reviewed_at' => now(),
            ]);

            return [$lockedRequest, $attendanceRecord, true];
        });

        if (!$wasReviewed) {
            return response()->json([
                'message' => 'This excuse request has already been reviewed.',
            ], 409);
        }

        $excuseRequest->load([
            'externalOfficer:user_id,full_name,email,designation,organization_id',
            'externalOfficer.organization:organization_id,organization_name',
            'reviewer:user_id,full_name,designation',
        ]);

        return response()->json([
            'message' => $decision === 'approved'
                ? 'The excuse request has been approved.'
                : 'The excuse request has been rejected.',
            'excuse_request' => $this->requestData($excuseRequest),
            'attendance_record' => $attendanceRecord ? [
                'attendance_id' => $attendanceRecord->attendance_id,
                'meeting_id' => $attendanceRecord->meeting_id,
                'letter_id' => $attendanceRecord->letter_id,
                'user_id' => $attendanceRecord->user_id,
                'status' => $attendanceRecord->status,
                'is_draft' => $attendanceRecord->is_draft,
            ] : null,
        ]);
    }

    private function approvedLetterFor(
        Meeting $meeting,
        AttendanceExcuseRequest $excuseRequest
    ): ?Letter {
        $externalOfficer = $excuseRequest->externalOfficer()->first();

        if (!$externalOfficer) {
            return null;
        }

        return $meeting->letters()
            ->where('status', 'approved')
            ->whereHas('recipients', function ($query) use ($externalOfficer) {
                $query->where('user_id', $externalOfficer->user_id);

                if ($externalOfficer->organization_id) {
                    $query->orWhere(function ($organizationQuery) use ($externalOfficer) {
                        $organizationQuery->whereNull('user_id')
                            ->where('organization_id', $externalOfficer->organization_id);
                    });
                }
            })
            ->latest('letter_id')
            ->first();
    }

    private function isOrganizer(Request $request, Meeting $meeting): bool
    {
        $userId = $request->user()->user_id;

        return (int) $meeting->created_by === (int) $userId
            || $meeting->letters()->where('created_by', $userId)->exists();
    }

    private function requestData(AttendanceExcuseRequest $excuseRequest): array
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
            'external_officer' => $excuseRequest->externalOfficer ? [
                'user_id' => $excuseRequest->externalOfficer->user_id,
                'full_name' => $excuseRequest->externalOfficer->full_name,
                'email' => $excuseRequest->externalOfficer->email,
                'designation' => $excuseRequest->externalOfficer->designation,
                'organization' => $excuseRequest->externalOfficer->organization?->organization_name,
            ] : null,
            'reviewer' => $excuseRequest->reviewer ? [
                'user_id' => $excuseRequest->reviewer->user_id,
                'full_name' => $excuseRequest->reviewer->full_name,
                'designation' => $excuseRequest->reviewer->designation,
            ] : null,
        ];
    }
}
