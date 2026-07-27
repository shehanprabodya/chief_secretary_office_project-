<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceExcuseRequest;
use App\Models\Meeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        $excuseRequest->update([
            'status' => $decision,
            'reviewed_by' => $request->user()->user_id,
            'review_comment' => $validator->validated()['review_comment'] ?? null,
            'reviewed_at' => now(),
        ]);

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
        ]);
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
