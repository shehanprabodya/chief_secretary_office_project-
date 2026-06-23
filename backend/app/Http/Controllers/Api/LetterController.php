<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Letter;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class LetterController extends Controller
{
   public function index(Request $request): JsonResponse
    {
        $letters = Letter::with('departments', 'creator', 'approvalSteps')
            ->where('created_by', $request->user()->user_id)
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json($letters);
    }
    public function show(int $id): JsonResponse
    {
        $letter = Letter::with('departments', 'creator', 'approvalSteps.actionedBy', 'meeting')
            ->findOrFail($id);

        return response()->json(['letter' => $letter]);
    }
     /**
     * Save as draft
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'meeting_id' => 'nullable|exists:meetings,meeting_id',
            'sender_name' => 'required|string|max:255',
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
            'designation' => 'nullable|string|max:150',
            'signatory_name' => 'nullable|string|max:150',
            'signature_date' => 'nullable|date',
            'department_ids' => 'required|array|min:1',
            'department_ids.*' => 'exists:departments,department_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $letter = Letter::create([
            ...$validator->safe()->except('department_ids'),
            'status' => 'draft',
            'created_by' => $request->user()->user_id,
        ]);

        $letter->departments()->attach($request->department_ids);
        $letter->initializeApprovalWorkflow();

        return response()->json([
            'message' => 'Letter draft saved',
            'letter' => $letter->load('departments', 'approvalSteps'),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $letter = Letter::findOrFail($id);

        if ($letter->status !== 'draft') {
            return response()->json(['message' => 'Only drafts can be edited'], 403);
        }

        $validator = Validator::make($request->all(), [
            'sender_name' => 'sometimes|string|max:255',
            'title' => 'sometimes|string|max:255',
            'content' => 'nullable|string',
            'designation' => 'nullable|string|max:150',
            'signatory_name' => 'nullable|string|max:150',
            'signature_date' => 'nullable|date',
            'department_ids' => 'sometimes|array|min:1',
            'department_ids.*' => 'exists:departments,department_id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $letter->update($validator->safe()->except('department_ids'));

        if ($request->has('department_ids')) {
            $letter->departments()->sync($request->department_ids);
        }

        return response()->json([
            'message' => 'Letter updated',
            'letter' => $letter->load('departments', 'approvalSteps'),
        ]);
    }
    /**
     * "Send for Approval" button - advances workflow to step 2
     */
    public function sendForApproval(Request $request, int $id): JsonResponse
    {
        $letter = Letter::with('approvalSteps')->findOrFail($id);

        if (empty($letter->content)) {
            return response()->json(['message' => 'Cannot submit an empty letter'], 422);
        }

        $letter->update(['status' => 'pending_approval']);

        $reviewStep = $letter->approvalSteps->firstWhere('step_order', 2);
        $reviewStep?->update([
            'status' => 'current',
            'actioned_by' => $request->user()->user_id,
            'actioned_at' => now(),
        ]);

        return response()->json([
            'message' => 'Letter sent for approval',
            'letter' => $letter->load('approvalSteps'),
        ]);
    }
    /**
     * Chief Secretary approves -> advances to final stage
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $letter = Letter::with('approvalSteps')->findOrFail($id);

        $letter->update(['status' => 'approved']);

        $reviewStep = $letter->approvalSteps->firstWhere('step_order', 2);
        $reviewStep?->update([
            'status' => 'completed',
            'actioned_by' => $request->user()->user_id,
            'actioned_at' => now(),
            'notes' => $request->input('notes'),
        ]);

        $finalStep = $letter->approvalSteps->firstWhere('step_order', 3);
        $finalStep?->update(['status' => 'current']);

        return response()->json([
            'message' => 'Letter approved',
            'letter' => $letter->load('approvalSteps'),
        ]);
    }
    public function reject(Request $request, int $id): JsonResponse
    {
        $letter = Letter::with('approvalSteps')->findOrFail($id);

        $letter->update(['status' => 'rejected']);

        $reviewStep = $letter->approvalSteps->firstWhere('step_order', 2);
        $reviewStep?->update([
            'status' => 'rejected',
            'actioned_by' => $request->user()->user_id,
            'actioned_at' => now(),
            'notes' => $request->input('notes'),
        ]);

        return response()->json([
            'message' => 'Letter rejected',
            'letter' => $letter->load('approvalSteps'),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $letter = Letter::findOrFail($id);

        if ($letter->status !== 'draft') {
            return response()->json(['message' => 'Only drafts can be discarded'], 403);
        }

        $letter->delete();

        return response()->json(['message' => 'Draft discarded']);
    }
}


?>