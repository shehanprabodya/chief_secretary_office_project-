<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActionItem;
use App\Models\Meeting;
use App\Models\MeetingMinute;
use App\Models\MinuteDecision;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class MinuteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $minutes = MeetingMinute::with('meeting')
            ->where('created_by', $request->user()->user_id)
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json($minutes);
    }

    public function show(int $id): JsonResponse
    {
        $minute = MeetingMinute::with('meeting.attendees', 'decisions', 'actionItems.responsibleOfficer')
            ->findOrFail($id);

        return response()->json(['minute' => $minute]);
    }

    /**
     * Create or load draft minutes for a given meeting
     */
    public function getOrCreateForMeeting(Request $request, int $meetingId): JsonResponse
    {
        $meeting = Meeting::with('attendees')->findOrFail($meetingId);

        $minute = MeetingMinute::firstOrCreate(
            ['meeting_id' => $meetingId],
            ['status' => 'draft', 'created_by' => $request->user()->user_id]
        );

        $minute->load('decisions', 'actionItems.responsibleOfficer');

        return response()->json(['minute' => $minute, 'meeting' => $meeting]);
    }

    public function saveDraft(Request $request, int $id): JsonResponse
    {
        $minute = MeetingMinute::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'discussion_summary' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $minute->update($validator->validated());

        return response()->json(['message' => 'Saved as draft', 'minute' => $minute]);
    }

    public function submitForApproval(int $id): JsonResponse
    {
        $minute = MeetingMinute::findOrFail($id);
        $minute->update(['status' => 'pending_approval']);

        return response()->json(['message' => 'Minutes submitted for approval', 'minute' => $minute]);
    }

    /**
     * Add a Formal Decision (the numbered list)
     */
    public function addDecision(Request $request, int $minuteId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'decision_text' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $nextOrder = MinuteDecision::where('minute_id', $minuteId)->max('decision_order') + 1;

        $decision = MinuteDecision::create([
            'minute_id' => $minuteId,
            'decision_order' => $nextOrder,
            'decision_text' => $request->decision_text,
        ]);

        return response()->json(['decision' => $decision], 201);
    }

    public function deleteDecision(int $decisionId): JsonResponse
    {
        MinuteDecision::findOrFail($decisionId)->delete();
        return response()->json(['message' => 'Decision removed']);
    }

    /**
     * Add an Action Item (right sidebar form)
     */
    public function addActionItem(Request $request, int $minuteId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'task_description' => 'required|string|max:500',
            'responsible_officer_id' => 'required|exists:users,user_id',
            'deadline' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $item = ActionItem::create([
            'minute_id' => $minuteId,
            ...$validator->validated(),
        ]);

        return response()->json([
            'action_item' => $item->load('responsibleOfficer'),
        ], 201);
    }

    public function deleteActionItem(int $itemId): JsonResponse
    {
        ActionItem::findOrFail($itemId)->delete();
        return response()->json(['message' => 'Action item removed']);
    }
}