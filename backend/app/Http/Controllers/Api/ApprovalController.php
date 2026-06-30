<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovableDocument;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class ApprovalController extends Controller
{
    /**
     * List documents this user's role needs to see/act on,
     * plus a search by reference ID or subject.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ApprovableDocument::with('submitter', 'steps');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference_id', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $documents = $query->orderBy('created_at', 'desc')->get();

        return response()->json(['documents' => $documents]);
    }

    public function show(int $id): JsonResponse
    {
        $document = ApprovableDocument::with('submitter', 'steps.actionedBy', 'comments.user')
            ->findOrFail($id);

        return response()->json(['document' => $document]);
    }

    /**
     * Generic creation - works for grants, training requests, transfers, or letters
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'document_type' => 'required|in:letter,grant,training_request,hr_transfer',
            'source_id' => 'nullable|integer',
            'subject' => 'required|string|max:255',
            'description' => 'nullable|string',
            'full_content' => 'nullable|string',
            'amount' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $document = ApprovableDocument::create([
            ...$validator->validated(),
            'reference_id' => ApprovableDocument::generateReferenceId($request->document_type),
            'submitted_by' => $request->user()->user_id,
            'status' => 'pending',
        ]);

        $document->initializeWorkflow();

        return response()->json([
            'message' => 'Document submitted for approval',
            'document' => $document->load('steps'),
        ], 201);
    }

    /**
     * Approve current step - advances workflow to next stage
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $document = ApprovableDocument::with('steps')->findOrFail($id);
        $currentStep = $document->steps->firstWhere('step_order', $document->current_step_order);

        if (!$currentStep || $currentStep->required_role !== $request->user()->role->role_name) {
            return response()->json(['message' => 'You are not authorized to approve this step'], 403);
        }

        $currentStep->update([
            'status' => 'approved',
            'actioned_by' => $request->user()->user_id,
            'actioned_at' => now(),
        ]);

        $nextStep = $document->steps->firstWhere('step_order', $document->current_step_order + 1);

        if ($nextStep) {
            $nextStep->update(['status' => 'pending']);
            $document->update(['current_step_order' => $nextStep->step_order]);
        } else {
            $document->update(['status' => 'approved']);
        }

        if ($request->filled('notes')) {
            $document->comments()->create([
                'user_id' => $request->user()->user_id,
                'comment' => $request->notes,
            ]);
        }

        return response()->json([
            'message' => 'Approved',
            'document' => $document->load('steps.actionedBy', 'comments.user'),
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $document = ApprovableDocument::with('steps')->findOrFail($id);
        $currentStep = $document->steps->firstWhere('step_order', $document->current_step_order);

        $currentStep?->update([
            'status' => 'rejected',
            'actioned_by' => $request->user()->user_id,
            'actioned_at' => now(),
        ]);

        $document->update(['status' => 'rejected']);

        if ($request->filled('notes')) {
            $document->comments()->create([
                'user_id' => $request->user()->user_id,
                'comment' => $request->notes,
            ]);
        }

        return response()->json([
            'message' => 'Rejected',
            'document' => $document->load('steps.actionedBy', 'comments.user'),
        ]);
    }

    public function addComment(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'comment' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $document = ApprovableDocument::findOrFail($id);
        $comment = $document->comments()->create([
            'user_id' => $request->user()->user_id,
            'comment' => $request->comment,
        ]);

        return response()->json(['comment' => $comment->load('user')], 201);
    }
}