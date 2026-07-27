<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdditionalAttendeeRequest;
use App\Models\AdditionalAttendee;
use App\Models\AttendanceRecord;
use App\Models\Letter;
use App\Models\Meeting;
use App\Models\User;
use App\Services\AdditionalAttendeeAuthorizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdditionalAttendeeController extends Controller
{
    public function __construct(
        private readonly AdditionalAttendeeAuthorizationService $authorization
    ) {
    }

    public function store(AdditionalAttendeeRequest $request, int $meetingId): JsonResponse
    {
        $meeting = Meeting::findOrFail($meetingId);
        $letter = Letter::where('letter_id', $request->integer('letter_id'))
            ->where('meeting_id', $meeting->meeting_id)
            ->where('status', 'approved')
            ->first();

        if (!$letter) {
            return response()->json([
                'message' => 'Additional attendees can only be added to an approved meeting letter.',
            ], 422);
        }

        if ($this->attendanceIsFinalized($meeting)) {
            return response()->json([
                'message' => 'Additional attendees cannot be added after attendance is finalized.',
            ], 409);
        }

        $validated = $request->validated();
        $registeredUser = !empty($validated['user_id'])
            ? User::with('organization')->find($validated['user_id'])
            : null;

        [$additionalAttendee, $attendanceRecord] = DB::transaction(function () use (
            $request,
            $meeting,
            $letter,
            $validated,
            $registeredUser
        ) {
            $additionalAttendee = AdditionalAttendee::create([
                'meeting_id' => $meeting->meeting_id,
                'letter_id' => $letter->letter_id,
                'user_id' => $registeredUser?->user_id,
                'full_name' => $registeredUser?->full_name ?? $validated['full_name'],
                'organization' => $registeredUser?->organization?->organization_name
                    ?? $validated['organization'],
                'designation' => $registeredUser?->designation ?? $validated['designation'],
                'email' => $registeredUser?->email ?? ($validated['email'] ?? null),
                'addition_reason' => $validated['addition_reason'],
                'added_by' => $request->user()->user_id,
            ]);

            $attendanceRecord = AttendanceRecord::create([
                'meeting_id' => $meeting->meeting_id,
                'letter_id' => $letter->letter_id,
                'letter_recipient_id' => null,
                'additional_attendee_id' => $additionalAttendee->additional_attendee_id,
                'user_id' => null,
                'status' => $validated['attendance_status'] ?? 'present',
                'is_draft' => true,
                'recorded_by' => $request->user()->user_id,
            ]);

            return [$additionalAttendee, $attendanceRecord];
        });

        return response()->json([
            'message' => 'The additional attendee has been added to the attendance draft.',
            'participant' => $this->participantData($additionalAttendee, $attendanceRecord),
        ], 201);
    }

    public function update(
        AdditionalAttendeeRequest $request,
        int $meetingId,
        int $additionalAttendeeId
    ): JsonResponse {
        $meeting = Meeting::findOrFail($meetingId);
        $additionalAttendee = AdditionalAttendee::where(
            'additional_attendee_id',
            $additionalAttendeeId
        )->where('meeting_id', $meeting->meeting_id)->first();

        if (!$additionalAttendee) {
            return response()->json([
                'message' => 'The additional attendee was not found for this meeting.',
            ], 404);
        }

        if ((int) $request->integer('letter_id') !== (int) $additionalAttendee->letter_id) {
            return response()->json([
                'message' => 'An additional attendee cannot be moved to another meeting letter.',
            ], 422);
        }

        $letter = Letter::where('letter_id', $additionalAttendee->letter_id)
            ->where('meeting_id', $meeting->meeting_id)
            ->where('status', 'approved')
            ->first();

        if (!$letter) {
            return response()->json([
                'message' => 'The linked meeting letter is not approved.',
            ], 422);
        }

        if ($this->attendanceIsFinalized($meeting)) {
            return response()->json([
                'message' => 'Additional attendees cannot be edited after attendance is finalized.',
            ], 409);
        }

        $validated = $request->validated();
        $registeredUser = !empty($validated['user_id'])
            ? User::with('organization')->find($validated['user_id'])
            : null;

        [$additionalAttendee, $attendanceRecord] = DB::transaction(function () use (
            $additionalAttendee,
            $validated,
            $registeredUser
        ) {
            $additionalAttendee->update([
                'user_id' => $registeredUser?->user_id,
                'full_name' => $registeredUser?->full_name ?? $validated['full_name'],
                'organization' => $registeredUser?->organization?->organization_name
                    ?? $validated['organization'],
                'designation' => $registeredUser?->designation ?? $validated['designation'],
                'email' => $registeredUser?->email ?? ($validated['email'] ?? null),
                'addition_reason' => $validated['addition_reason'],
            ]);

            $attendanceRecord = $additionalAttendee->attendanceRecord()->firstOrFail();
            if (!empty($validated['attendance_status'])) {
                $attendanceRecord->update(['status' => $validated['attendance_status']]);
            }

            return [$additionalAttendee->fresh(), $attendanceRecord->fresh()];
        });

        return response()->json([
            'message' => 'The additional attendee has been updated.',
            'participant' => $this->participantData($additionalAttendee, $attendanceRecord),
        ]);
    }

    public function destroy(
        Request $request,
        int $meetingId,
        int $additionalAttendeeId
    ): JsonResponse {
        $meeting = Meeting::findOrFail($meetingId);

        if (!$this->authorization->canManage($request->user(), $meeting)) {
            return response()->json([
                'message' => 'Only the meeting creator or a linked meeting-letter creator can manage additional attendees.',
            ], 403);
        }

        $additionalAttendee = AdditionalAttendee::where(
            'additional_attendee_id',
            $additionalAttendeeId
        )->where('meeting_id', $meeting->meeting_id)->first();

        if (!$additionalAttendee) {
            return response()->json([
                'message' => 'The additional attendee was not found for this meeting.',
            ], 404);
        }

        if ($this->attendanceIsFinalized($meeting)) {
            return response()->json([
                'message' => 'Additional attendees cannot be removed after attendance is finalized.',
            ], 409);
        }

        DB::transaction(fn () => $additionalAttendee->delete());

        return response()->json([
            'message' => 'The additional attendee and draft attendance record have been removed.',
        ]);
    }

    private function attendanceIsFinalized(Meeting $meeting): bool
    {
        return AttendanceRecord::where('meeting_id', $meeting->meeting_id)
            ->where('is_draft', false)
            ->exists();
    }

    private function participantData(
        AdditionalAttendee $additionalAttendee,
        AttendanceRecord $attendanceRecord
    ): array {
        return [
            'participant_type' => 'additional',
            'additional_attendee_id' => $additionalAttendee->additional_attendee_id,
            'user_id' => $additionalAttendee->user_id,
            'letter_recipient_id' => null,
            'full_name' => $additionalAttendee->full_name,
            'email' => $additionalAttendee->email ?? '',
            'department' => $additionalAttendee->organization,
            'role' => $additionalAttendee->designation,
            'addition_reason' => $additionalAttendee->addition_reason,
            'status' => $attendanceRecord->status,
        ];
    }
}
