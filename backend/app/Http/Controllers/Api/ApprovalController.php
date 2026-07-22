<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovableDocument;
use App\Models\Letter;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class ApprovalController extends Controller
{
    public function __construct(private readonly NotificationService $notifications)
    {
    }

    /**
     * List documents this user's role needs to see/act on,
     * plus a search by reference ID or subject.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ApprovableDocument::with('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject');

        // Officers may track only the documents they personally submitted.
        // Reviewing roles retain the shared workflow queue they need to act on.
        if ($request->user()->hasRole('officer')) {
            $query->where('submitted_by', $request->user()->user_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('reference_id', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%")
                  ->orWhereHas('sourceLetter.subject', function ($subjectQuery) use ($search) {
                      $subjectQuery->where('code', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $documents = $query->orderBy('created_at', 'desc')->get()
            ->unique(fn (ApprovableDocument $document) => $document->document_type . ':' . ($document->source_id ?? 'document-' . $document->document_id))
            ->values()
            ->map(fn (ApprovableDocument $document) => $this->withSubjectCode($document));

        return response()->json(['documents' => $documents]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $document = ApprovableDocument::with('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject')
            ->findOrFail($id);

        if ($request->user()->hasRole('officer')
            && (int) $document->submitted_by !== (int) $request->user()->user_id) {
            return response()->json(['message' => 'You can only view documents you submitted.'], 403);
        }

        return response()->json(['document' => $this->withSubjectCode($document)]);
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

        $validated = $validator->validated();

        if (!empty($validated['source_id'])) {
            $existingDocument = ApprovableDocument::where('document_type', $validated['document_type'])
                ->where('source_id', $validated['source_id'])
                ->with('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject')
                ->first();

            if ($existingDocument) {
                if ($existingDocument->document_type === 'letter'
                    && $existingDocument->sourceLetter
                    && (int) $existingDocument->sourceLetter->created_by !== (int) $request->user()->user_id) {
                    return response()->json(['message' => 'Only the letter creator can resubmit a revised letter.'], 403);
                }

                $approvedContentChanged = $existingDocument->status === 'approved'
                    && array_key_exists('full_content', $validated)
                    && trim((string) $existingDocument->full_content) !== trim((string) $validated['full_content']);

                if ($approvedContentChanged) {
                    $existingDocument->update([
                        'subject' => $validated['subject'],
                        'description' => $validated['description'] ?? null,
                        'full_content' => $validated['full_content'],
                        'amount' => $validated['amount'] ?? null,
                        'submitted_by' => $request->user()->user_id,
                        'status' => 'pending',
                        'current_step_order' => 2,
                    ]);

                    $this->resetWorkflowForResubmission($existingDocument, $request->user()->user_id);

                    if ($existingDocument->document_type === 'letter' && $existingDocument->source_id) {
                        Letter::where('letter_id', $existingDocument->source_id)->update(['status' => 'pending_approval']);
                    }

                    $this->notifyCurrentReviewer($existingDocument, $request->user()->user_id, true);

                    return response()->json([
                        'message' => 'Revised approved document submitted for approval',
                        'document' => $this->withSubjectCode(
                            $existingDocument->load('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject')
                        ),
                    ]);
                }

                if ($existingDocument->status === 'rejected') {
                    $existingDocument->update([
                        'subject' => $validated['subject'],
                        'description' => $validated['description'] ?? null,
                        'full_content' => $validated['full_content'] ?? null,
                        'amount' => $validated['amount'] ?? null,
                        'submitted_by' => $request->user()->user_id,
                        'status' => 'pending',
                        'current_step_order' => 2,
                    ]);

                    $this->resetWorkflowForResubmission($existingDocument, $request->user()->user_id);

                    if ($existingDocument->document_type === 'letter' && $existingDocument->source_id) {
                        Letter::where('letter_id', $existingDocument->source_id)->update(['status' => 'pending_approval']);
                    }

                    $this->notifyCurrentReviewer($existingDocument, $request->user()->user_id, true);

                    return response()->json([
                        'message' => 'Rejected document resubmitted for approval',
                        'document' => $this->withSubjectCode(
                            $existingDocument->load('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject')
                        ),
                    ]);
                }

                if ($existingDocument->document_type === 'letter' && $existingDocument->source_id) {
                    $letterStatus = match ($existingDocument->status) {
                        'pending' => 'pending_approval',
                        'approved' => 'approved',
                        'rejected' => 'rejected',
                    };
                    Letter::where('letter_id', $existingDocument->source_id)->update(['status' => $letterStatus]);
                }

                return response()->json([
                    'message' => 'Document is already in the approval workflow',
                    'document' => $this->withSubjectCode($existingDocument),
                ]);
            }
        }

        $document = ApprovableDocument::create([
            ...$validated,
            'reference_id' => ApprovableDocument::generateReferenceId($request->document_type),
            'submitted_by' => $request->user()->user_id,
            'status' => 'pending',
            'current_step_order' => 2,
        ]);

        $document->initializeWorkflow();

        $this->notifyCurrentReviewer($document, $request->user()->user_id);

        if ($document->document_type === 'letter' && $document->source_id) {
            Letter::where('letter_id', $document->source_id)->update(['status' => 'pending_approval']);
        }

        return response()->json([
            'message' => 'Document submitted for approval',
            'document' => $this->withSubjectCode($document->load('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject')),
        ], 201);
    }

    private function resetWorkflowForResubmission(ApprovableDocument $document, int $submittedBy): void
    {
        $document->steps()->where('step_order', 1)->update([
            'status' => 'approved',
            'actioned_by' => $submittedBy,
            'actioned_at' => now(),
        ]);

        $document->steps()->where('step_order', 2)->update([
            'status' => 'pending',
            'actioned_by' => null,
            'actioned_at' => null,
        ]);

        $document->steps()->whereIn('step_order', [3, 4])->update([
            'status' => 'waiting',
            'actioned_by' => null,
            'actioned_at' => null,
        ]);
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

            if ($document->document_type === 'letter' && $document->source_id) {
                Letter::where('letter_id', $document->source_id)->update(['status' => 'approved']);
            }
        }

        if ($request->filled('notes')) {
            $document->comments()->create([
                'user_id' => $request->user()->user_id,
                'comment' => $request->notes,
            ]);
        }

        if ((int) $document->submitted_by !== (int) $request->user()->user_id) {
            $this->notifications->sendToUser(
                $document->submitted_by,
                'approval_step_approved',
                $nextStep ? 'Document moved to the next approval stage' : 'Document approved',
                $nextStep
                    ? "{$document->reference_id} was approved by {$request->user()->full_name}."
                    : "{$document->reference_id} received final approval.",
                '/approvals',
                'approval_document',
                $document->document_id,
                'important',
            );
        }

        if ($nextStep) {
            $this->notifications->sendToRole(
                $nextStep->required_role,
                'approval_action_required',
                'Approval action required',
                "{$document->reference_id} is ready for your review.",
                '/approvals',
                'approval_document',
                $document->document_id,
                'important',
                $request->user()->user_id,
            );
        }

        return response()->json([
            'message' => 'Approved',
            'document' => $this->withSubjectCode($document->load('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject')),
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

        if ($document->document_type === 'letter' && $document->source_id) {
            Letter::where('letter_id', $document->source_id)->update(['status' => 'rejected']);
        }

        if ($request->filled('notes')) {
            $document->comments()->create([
                'user_id' => $request->user()->user_id,
                'comment' => $request->notes,
            ]);
        }

        if ((int) $document->submitted_by !== (int) $request->user()->user_id) {
            $this->notifications->sendToUser(
                $document->submitted_by,
                'approval_rejected',
                'Document rejected',
                "{$document->reference_id} was rejected by {$request->user()->full_name}.",
                '/approvals',
                'approval_document',
                $document->document_id,
                'urgent',
            );
        }

        return response()->json([
            'message' => 'Rejected',
            'document' => $this->withSubjectCode($document->load('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject')),
        ]);
    }

    private function withSubjectCode(ApprovableDocument $document): ApprovableDocument
    {
        $document->setAttribute(
            'subject_code',
            $document->document_type === 'letter' ? $document->sourceLetter?->subject?->code : null
        );

        return $document;
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

        if ((int) $document->submitted_by !== (int) $request->user()->user_id) {
            $this->notifications->sendToUser(
                $document->submitted_by,
                'approval_comment_added',
                'New approval comment',
                "{$request->user()->full_name} commented on {$document->reference_id}.",
                '/approvals',
                'approval_document',
                $document->document_id,
            );
        }

        return response()->json(['comment' => $comment->load('user')], 201);
    }

    private function notifyCurrentReviewer(ApprovableDocument $document, int $actorUserId, bool $resubmitted = false): void
    {
        $document->loadMissing('steps');
        $currentStep = $document->steps->firstWhere('step_order', $document->current_step_order);

        if (!$currentStep) {
            return;
        }

        $this->notifications->sendToRole(
            $currentStep->required_role,
            'approval_action_required',
            $resubmitted ? 'Document resubmitted' : 'New document awaiting approval',
            "{$document->reference_id} is ready for your review.",
            '/approvals',
            'approval_document',
            $document->document_id,
            'important',
            $actorUserId,
        );
    }
}
