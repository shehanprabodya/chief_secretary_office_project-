<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovableDocument;
use App\Models\Letter;
use App\Models\Meeting;
use App\Models\MeetingMinute;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

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
    $perPage = min(
        max((int) $request->input('per_page', 10), 1),
        50
    );

    $user = $request->user();
    $roleName = $user->role?->role_name;
    $query = ApprovableDocument::query()
        ->select([
            'document_id', 'reference_id', 'document_type', 'source_id',
            'subject', 'description', 'status', 'submitted_by',
            'current_step_order', 'created_at',
        ])
        ->where('status', 'pending')
        ->with([
            'submitter:user_id,full_name,role_id',
            'submitter.role:role_id,role_name',
            'steps:step_id,document_id,step_label,step_order,required_role,assigned_to,status,actioned_by,actioned_at',
            'steps.assignee:user_id,full_name',
            'sourceLetter:letter_id,subject_id',
            'sourceLetter.subject:id,code',
            'sourceMinute:minute_id,meeting_id',
            'sourceMinute.meeting:meeting_id,meeting_code',
        ]);

    if ($roleName !== 'admin') {
        $query->where(function ($visible) use ($user, $roleName) {
            $visible->where('submitted_by', $user->user_id);

            if ($roleName) {
                $visible->orWhereHas('steps', function ($step) use ($user, $roleName) {
                    $step->whereColumn('approval_workflow_steps.document_id', 'approvable_documents.document_id')
                        ->whereColumn('approval_workflow_steps.step_order', 'approvable_documents.current_step_order')
                        ->where('approval_workflow_steps.required_role', $roleName)
                        ->where('approval_workflow_steps.status', 'pending')
                        ->where(function ($assignment) use ($user) {
                            $assignment->whereNull('approval_workflow_steps.assigned_to')
                                ->orWhere('approval_workflow_steps.assigned_to', $user->user_id);
                        });
                });
            }
        });
    }

    // Search
    if ($request->filled('search')) {
        $search = trim($request->input('search'));

        $query->where(function ($q) use ($search) {
            $q->where('reference_id', 'like', "%{$search}%")
                ->orWhere('subject', 'like', "%{$search}%")
                ->orWhereHas('sourceLetter.subject', function ($subjectQuery) use ($search) {
                    $subjectQuery->where('code', 'like', "%{$search}%");
                });
        });
    }

    $documents = $query
        ->orderByDesc('created_at')
        ->paginate($perPage);

    $documents->getCollection()->transform(
        fn (ApprovableDocument $document) =>
            $this->withSubjectCode($document)
    );

    return response()->json([
        'documents' => $documents->items(),

        'pagination' => [
            'current_page' => $documents->currentPage(),
            'last_page' => $documents->lastPage(),
            'per_page' => $documents->perPage(),
            'total' => $documents->total(),
            'from' => $documents->firstItem(),
            'to' => $documents->lastItem(),
        ],
    ]);
}

    public function eligibleDeputies(Request $request): JsonResponse
    {
        $users = \App\Models\User::query()
            ->select(['user_id', 'full_name', 'designation', 'organization_id'])
            ->with('organization:organization_id,organization_name')
            ->where('status', 'ACTIVE')
            ->whereHas('role', fn ($query) => $query->where('role_name', 'deputy'))
            ->orderBy('full_name')
            ->get();

        return response()->json(['deputies' => $users]);
    }

    public function submitLetter(Request $request, int $letterId): JsonResponse
    {
        $letter = Letter::with('recipients.organization', 'recipients.user.organization', 'subject', 'meeting')
            ->findOrFail($letterId);
        abort_unless((int) $letter->created_by === (int) $request->user()->user_id, 403, 'Only the letter creator can submit this letter for approval.');
        abort_if(trim((string) $letter->content) === '', 422, 'Letter content is empty. Please write the letter body first.');

        $html = app(LetterController::class)->renderApprovalHtml($letter);
        $submitRequest = Request::create('/api/approvals', 'POST', [
            'document_type' => 'letter',
            'source_id' => $letter->letter_id,
            'subject' => $this->plainText((string) $letter->title),
            'description' => mb_substr($this->plainText((string) $letter->content), 0, 300),
            'full_content' => $html,
        ]);
        $submitRequest->setUserResolver(fn () => $request->user());

        return $this->store($submitRequest);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $document = ApprovableDocument::with('submitter.role', 'steps.actionedBy', 'steps.assignee.organization', 'comments.user', 'sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting.attendees', 'sourceMinute.decisions')
            ->findOrFail($id);

        if (!$this->canViewDocument($document, $request->user())) {
            return response()->json(['message' => 'You are not authorized to view this approval document.'], 403);
        }

        // The source letter is authoritative. Older Department Head edits stored
        // plain text in full_content, which made later approvers see a different
        // layout from the Officer's generated letter preview. Rebuild the same
        // generated HTML for the detail response so every approval role sees the
        // current saved letter in the official template.
        if ($document->document_type === 'letter' && $document->sourceLetter) {
            $document->full_content = app(LetterController::class)->renderApprovalHtml($document->sourceLetter);
        }

        return response()->json(['document' => $this->withSubjectCode($document)]);
    }

    private function canViewDocument(ApprovableDocument $document, \App\Models\User $user): bool
    {
        if ($user->hasRole('admin') || (int) $document->submitted_by === (int) $user->user_id) {
            return true;
        }

        return $document->steps()->where(function ($steps) use ($user) {
            $steps->where('actioned_by', $user->user_id)
                ->orWhere('assigned_to', $user->user_id);
        })->exists() || $document->steps()
            ->where('step_order', $document->current_step_order)
            ->where('status', 'pending')
            ->where('required_role', $user->role?->role_name)
            ->where(function ($assignment) use ($user) {
                $assignment->whereNull('assigned_to')->orWhere('assigned_to', $user->user_id);
            })
            ->exists();
    }

    /**
     * Generic creation - works for grants, training requests, transfers, or letters
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'document_type' => 'required|in:letter,minute,grant,training_request,hr_transfer',
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
            if ($validated['document_type'] === 'letter') {
                $source = Letter::findOrFail($validated['source_id']);
                abort_unless((int) $source->created_by === (int) $request->user()->user_id, 403, 'Only the letter creator can submit this letter for approval.');
            } elseif ($validated['document_type'] === 'minute') {
                $source = MeetingMinute::findOrFail($validated['source_id']);
                abort_unless((int) $source->created_by === (int) $request->user()->user_id, 403, 'Only the minute creator can submit these minutes for approval.');
            }

            $existingDocument = ApprovableDocument::select([
                    'document_id', 'reference_id', 'document_type', 'source_id', 'subject',
                    'description', 'amount', 'status', 'submitted_by', 'current_step_order', 'created_at',
                ])
                ->where('document_type', $validated['document_type'])
                ->where('source_id', $validated['source_id'])
                ->with('sourceLetter:letter_id,created_by,subject_id', 'sourceLetter.subject:id,code', 'sourceMinute:minute_id,meeting_id', 'sourceMinute.meeting:meeting_id,meeting_code')
                ->first();

            if ($existingDocument) {
                if ($existingDocument->document_type === 'letter'
                    && $existingDocument->sourceLetter
                    && (int) $existingDocument->sourceLetter->created_by !== (int) $request->user()->user_id) {
                    return response()->json(['message' => 'Only the letter creator can resubmit a revised letter.'], 403);
                }

                $savedContent = $existingDocument->status === 'approved' && array_key_exists('full_content', $validated)
                    ? ApprovableDocument::whereKey($existingDocument->document_id)->value('full_content')
                    : null;
                $approvedContentChanged = $existingDocument->status === 'approved'
                    && array_key_exists('full_content', $validated)
                    && trim((string) $savedContent) !== trim((string) $validated['full_content']);

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

                    if ($existingDocument->document_type === 'minute' && $existingDocument->source_id) {
                        MeetingMinute::where('minute_id', $existingDocument->source_id)->update(['status' => 'pending_approval']);
                    }

                    $this->notifyCurrentReviewer($existingDocument, $request->user()->user_id, true);

                    return response()->json([
                        'message' => 'Revised approved document submitted for approval',
                        'document' => $this->submissionResponse($existingDocument),
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

                    if ($existingDocument->document_type === 'minute' && $existingDocument->source_id) {
                        MeetingMinute::where('minute_id', $existingDocument->source_id)->update(['status' => 'pending_approval']);
                    }

                    $this->notifyCurrentReviewer($existingDocument, $request->user()->user_id, true);

                    return response()->json([
                        'message' => 'Rejected document resubmitted for approval',
                        'document' => $this->submissionResponse($existingDocument),
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

                if ($existingDocument->document_type === 'minute' && $existingDocument->source_id) {
                    $minuteStatus = match ($existingDocument->status) {
                        'pending' => 'pending_approval',
                        'approved' => 'approved',
                        'rejected' => 'rejected',
                    };
                    MeetingMinute::where('minute_id', $existingDocument->source_id)->update(['status' => $minuteStatus]);
                }

                return response()->json([
                    'message' => 'Document is already in the approval workflow',
                    'document' => $this->submissionResponse($existingDocument),
                ]);
            }
        }

        $document = DB::transaction(function () use ($validated, $request) {
            if (!empty($validated['source_id']) && $validated['document_type'] === 'letter') {
                Letter::where('letter_id', $validated['source_id'])->lockForUpdate()->first();
            } elseif (!empty($validated['source_id']) && $validated['document_type'] === 'minute') {
                MeetingMinute::where('minute_id', $validated['source_id'])->lockForUpdate()->first();
            }

            $existing = !empty($validated['source_id'])
                ? ApprovableDocument::where('document_type', $validated['document_type'])
                    ->where('source_id', $validated['source_id'])
                    ->lockForUpdate()
                    ->first()
                : null;
            if ($existing) {
                return $existing;
            }

            $document = ApprovableDocument::create([
                ...$validated,
                'reference_id' => ApprovableDocument::generateReferenceId($request->document_type),
                'submitted_by' => $request->user()->user_id,
                'status' => 'pending',
                'current_step_order' => 2,
            ]);
            $document->initializeWorkflow();

            if ($document->document_type === 'letter' && $document->source_id) {
                Letter::where('letter_id', $document->source_id)->update(['status' => 'pending_approval']);
            }
            if ($document->document_type === 'minute' && $document->source_id) {
                MeetingMinute::where('minute_id', $document->source_id)->update(['status' => 'pending_approval']);
            }

            return $document;
        });

        if ($document->wasRecentlyCreated) {
            $this->notifyCurrentReviewer($document, $request->user()->user_id);
        }

        return response()->json([
            'message' => 'Document submitted for approval',
            'document' => $this->submissionResponse($document),
        ], 201);
    }

    private function notifyApprovedMinuteTargets(ApprovableDocument $document): void
    {
        $minute = MeetingMinute::with([
            'decisions',
            'meeting.letters' => fn ($query) => $query->whereIn('status', ['approved', 'dispatched'])->with('recipients'),
        ])
            ->find($document->source_id);
        if (!$minute) {
            return;
        }

        $meetingCode = $minute->meeting?->meeting_code ?: $document->subject;
        foreach ($minute->decisions as $decision) {
            $responsibleIds = json_decode((string) $decision->responsibility, true);
            if (!is_array($responsibleIds)) {
                continue;
            }
            foreach ($responsibleIds as $responsibleId) {
                if (filter_var($responsibleId, FILTER_VALIDATE_INT)) {
                    $responsibleId = (int) $responsibleId;
                    $isExternalOfficer = \App\Models\User::query()
                        ->where('user_id', $responsibleId)
                        ->whereHas('role', fn ($query) => $query->where('role_name', 'external_officer'))
                        ->exists();
                    if (!$isExternalOfficer) {
                        continue;
                    }
                    $responsibilityLabel = $decision->topic ?: 'a meeting decision';
                    $this->notifications->sendToUser(
                        $responsibleId,
                        'minute_responsibility_assigned',
                        'You have a responsibility in approved meeting minutes',
                        "You were selected as responsible for {$responsibilityLabel} in meeting {$meetingCode}. The approved minutes are now available in your external officer portal.",
                        '/dashboard/external-officer#minutes',
                        'meeting_minute',
                        $minute->minute_id,
                        'important',
                    );
                }
            }
        }

        $latestLetter = $minute->meeting?->letters?->sortByDesc('letter_id')->first();
        foreach ($latestLetter?->recipients ?? [] as $recipient) {
            $recipientUserIds = collect();
            if ($recipient->user_id && \App\Models\User::query()
                ->where('user_id', $recipient->user_id)
                ->whereHas('role', fn ($query) => $query->where('role_name', 'external_officer'))
                ->exists()) {
                $recipientUserIds->push((int) $recipient->user_id);
            }
            if ($recipient->organization_id) {
                $recipientUserIds = $recipientUserIds->merge(
                    \App\Models\User::query()
                        ->where('organization_id', $recipient->organization_id)
                        ->whereHas('role', fn ($query) => $query->where('role_name', 'external_officer'))
                        ->pluck('user_id')
                );
            }
            $recipientUserIds->unique()->each(fn (int $userId) => $this->notifications->sendToUser(
                $userId,
                'approved_minutes_available',
                'Approved meeting minutes are available',
                "The approved minutes for meeting {$meetingCode} are now available in your external officer portal.",
                '/dashboard/external-officer',
                'meeting_minute',
                $minute->minute_id,
            ));
        }
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
            'assigned_to' => null,
            'actioned_by' => null,
            'actioned_at' => null,
        ]);

        $document->steps()->whereIn('step_order', [3, 4])->update([
            'status' => 'waiting',
            'assigned_to' => null,
            'actioned_by' => null,
            'actioned_at' => null,
        ]);
    }

    /**
     * Approve current step - advances workflow to next stage
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        $notes = $request->input('notes');
        $updatedDocument = DB::transaction(function () use ($request, $id, $actor, $notes) {
            $document = ApprovableDocument::lockForUpdate()->findOrFail($id);
            $currentStep = $document->steps()->where('step_order', $document->current_step_order)->lockForUpdate()->first();
            abort_unless(
                $document->status === 'pending'
                    && $currentStep
                    && $currentStep->status === 'pending'
                    && $currentStep->required_role === $actor->role?->role_name
                    && (!$currentStep->assigned_to || (int) $currentStep->assigned_to === (int) $actor->user_id),
                403,
                'You are not authorized to approve this step.'
            );

            $nextStep = $document->steps()->where('step_order', $currentStep->step_order + 1)->lockForUpdate()->first();
            $selectedDeputyId = null;
            $isDepartmentHeadLetterOrMinute = $currentStep->required_role === 'dept_head'
                && in_array($document->document_type, ['letter', 'minute'], true);
            if ($isDepartmentHeadLetterOrMinute) {
                abort_unless($nextStep?->step_order === 3, 409, 'The Deputy approval step is missing from this workflow.');
                $request->validate(['selected_deputy_id' => 'required|integer|exists:users,user_id']);
                $deputy = \App\Models\User::query()
                    ->where('user_id', $request->integer('selected_deputy_id'))
                    ->where('status', 'ACTIVE')
                    ->whereHas('role', fn ($query) => $query->where('role_name', 'deputy'))
                    ->first();
                abort_unless($deputy, 422, 'Select an active Deputy Secretary.');
                $selectedDeputyId = (int) $deputy->user_id;
            }

            $currentStep->update([
                'status' => 'approved',
                'actioned_by' => $actor->user_id,
                'actioned_at' => now(),
            ]);

            if ($nextStep) {
                $nextStep->update([
                    'status' => 'pending',
                    'assigned_to' => $selectedDeputyId,
                ]);
                $document->update(['current_step_order' => $nextStep->step_order]);
            } else {
                $document->update(['status' => 'approved']);
                if ($document->document_type === 'letter' && $document->source_id) {
                    Letter::where('letter_id', $document->source_id)->update(['status' => 'approved']);
                }
                if ($document->document_type === 'minute' && $document->source_id) {
                    MeetingMinute::where('minute_id', $document->source_id)->update(['status' => 'approved']);
                }
            }

            if (is_string($notes) && trim($notes) !== '') {
                $document->comments()->create(['user_id' => $actor->user_id, 'comment' => $notes]);
            }

            return $document->fresh();
        });

        $nextStep = $updatedDocument->steps()->where('step_order', $updatedDocument->current_step_order)->first();
        [$entityName, $entityCode] = $this->notificationIdentity($updatedDocument);
        $actionDate = now()->format('d M Y, h:i A');
        if ((int) $updatedDocument->submitted_by !== (int) $actor->user_id) {
            $this->notifications->sendToUser(
                $updatedDocument->submitted_by,
                'approval_step_approved',
                $nextStep ? "{$entityName} approved and forwarded" : "{$entityName} approved",
                $nextStep
                    ? "{$entityName} {$entityCode} was approved by {$actor->full_name} on {$actionDate} and forwarded to {$this->roleLabel($nextStep->required_role)}."
                    : "{$entityName} {$entityCode} received final approval from {$actor->full_name} on {$actionDate}.",
                '/approvals', 'approval_document', $updatedDocument->document_id, 'important',
            );
        }
        if ($nextStep) {
            $message = "{$entityName} {$entityCode} was forwarded by {$actor->full_name} on {$actionDate} and is ready for your review.";
            if ($nextStep->assigned_to) {
                $this->notifications->sendToUser(
                    (int) $nextStep->assigned_to,
                    'approval_action_required',
                    "{$entityName} awaiting your approval",
                    $message,
                    '/approvals', 'approval_document', $updatedDocument->document_id, 'important',
                );
            } else {
                $this->notifications->sendToRole(
                    $nextStep->required_role,
                    'approval_action_required',
                    "{$entityName} awaiting your approval",
                    $message,
                    '/approvals', 'approval_document', $updatedDocument->document_id, 'important', $actor->user_id,
                );
            }
        } elseif ($updatedDocument->document_type === 'minute') {
            $this->notifyApprovedMinuteTargets($updatedDocument);
        }

        $updatedDocument->load('submitter.role', 'steps.actionedBy', 'steps.assignee.organization', 'comments.user', 'sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting.attendees', 'sourceMinute.decisions');
        return response()->json([
            'message' => 'Approved',
            'document' => $this->withSubjectCode($updatedDocument),
        ]);
    }

    /** Save the department head's edits to the source record and forward it. */
    public function editAndForward(Request $request, int $id): JsonResponse
    {
        if (!$request->user()->hasRole('dept_head')) {
            return response()->json(['message' => 'Only the Department Head can edit and forward this document.'], 403);
        }

        $document = ApprovableDocument::with('steps')->findOrFail($id);
        $currentStep = $document->steps->firstWhere('step_order', $document->current_step_order);
        if ($document->status !== 'pending'
            || !$currentStep
            || $currentStep->required_role !== 'dept_head'
            || $currentStep->status !== 'pending') {
            return response()->json(['message' => 'This document is not awaiting Department Head review.'], 409);
        }

        $rules = $document->document_type === 'letter'
            ? [
                'selected_deputy_id' => 'required|integer|exists:users,user_id',
                'title' => 'required|string|max:255',
                'content' => 'required|string',
                'designation' => 'nullable|string|max:150',
                'signatory_name' => 'nullable|string|max:150',
                'signature_date' => 'nullable|date',
                'recipients' => 'present|array',
                'recipients.*.organization_id' => 'nullable|exists:organizations,organization_id',
                'recipients.*.user_id' => 'nullable|exists:users,user_id',
                'recipients.*.recipient_label' => 'nullable|string|max:255',
            ]
            : ($document->document_type === 'minute'
                ? [
                    'selected_deputy_id' => 'required|integer|exists:users,user_id',
                    'meeting_description' => 'nullable|string',
                    'discussion_summary' => 'nullable|string',
                    'closing_remarks' => 'nullable|string',
                    'signatory_name' => 'nullable|string|max:255',
                    'signatory_designation' => 'nullable|string|max:255',
                    'decisions' => 'required|array',
                    'decisions.*.decision_id' => 'required|integer',
                    'decisions.*.topic' => 'nullable|string|max:500',
                    'decisions.*.decision_text' => 'required|string',
                    'decisions.*.responsibility' => 'nullable|string|max:1000',
                ]
                : []);

        if (!$rules) {
            return response()->json(['message' => 'Only letters and minutes can be edited in this workflow.'], 422);
        }

        $validated = Validator::make($request->all(), $rules)->validate();
        $notes = $request->input('notes');

        $updatedDocument = DB::transaction(function () use ($document, $currentStep, $validated, $notes, $request) {
            $document = ApprovableDocument::with('steps')->lockForUpdate()->findOrFail($document->document_id);
            $currentStep = $document->steps->firstWhere('step_order', $document->current_step_order);
            abort_unless(
                $document->status === 'pending'
                    && $currentStep
                    && $currentStep->required_role === 'dept_head'
                    && $currentStep->status === 'pending',
                409,
                'This document is no longer awaiting Department Head review.'
            );

            $selectedDeputy = \App\Models\User::query()
                ->where('user_id', $validated['selected_deputy_id'])
                ->where('status', 'ACTIVE')
                ->whereHas('role', fn ($query) => $query->where('role_name', 'deputy'))
                ->first();
            abort_unless($selectedDeputy, 422, 'Select an active Deputy Secretary.');

            if ($document->document_type === 'letter') {
                $letter = Letter::where('letter_id', $document->source_id)->lockForUpdate()->firstOrFail();
                $plainTitle = $this->plainText($validated['title']);
                $plainContent = $this->plainText($validated['content']);
                $letter->update([
                    'title' => $plainTitle,
                    'content' => $plainContent,
                    'designation' => isset($validated['designation']) ? $this->plainText($validated['designation']) : null,
                    'signatory_name' => isset($validated['signatory_name']) ? $this->plainText($validated['signatory_name']) : null,
                    'signature_date' => $validated['signature_date'] ?? null,
                ]);
                $meeting = $letter->meeting_id
                    ? Meeting::lockForUpdate()->find($letter->meeting_id)
                    : null;
                if (!$meeting && $letter->meeting_code) {
                    $meetingsWithCode = Meeting::where('meeting_code', $letter->meeting_code)
                        ->lockForUpdate()
                        ->limit(2)
                        ->get();
                    // Legacy letters may only carry the subject/meeting code.
                    // Update by code only when it identifies one meeting unambiguously.
                    if ($meetingsWithCode->count() === 1) {
                        $meeting = $meetingsWithCode->first();
                    }
                }
                if ($meeting) {
                    $meeting->update(['title' => $plainTitle]);
                }
                $letter->recipients()->delete();
                foreach ($validated['recipients'] as $recipient) {
                    $letter->recipients()->create([
                        'organization_id' => $recipient['organization_id'] ?? null,
                        'user_id' => $recipient['user_id'] ?? null,
                        'recipient_label' => isset($recipient['recipient_label']) ? $this->plainText($recipient['recipient_label']) : null,
                    ]);
                }
                if ($letter->meeting_id) {
                    app(LetterController::class)->syncExternalMeetingAttendees($letter->meeting_id);
                }
                $letter->load('recipients.organization', 'recipients.user.organization', 'subject', 'meeting');
                $document->update([
                    'subject' => $plainTitle,
                    'description' => trim(mb_substr($plainContent, 0, 255)),
                    'full_content' => app(LetterController::class)->renderApprovalHtml($letter),
                ]);
            } else {
                $minute = MeetingMinute::where('minute_id', $document->source_id)->lockForUpdate()->firstOrFail();
                $minute->update(collect($validated)->only([
                    'meeting_description', 'discussion_summary', 'closing_remarks',
                    'signatory_name', 'signatory_designation',
                ])->all());

                $decisionIds = collect($validated['decisions'])->pluck('decision_id')->map(fn ($id) => (int) $id);
                $existingIds = $minute->decisions()->pluck('decision_id')->map(fn ($id) => (int) $id);
                abort_unless($decisionIds->sort()->values()->all() === $existingIds->sort()->values()->all(), 422, 'The submitted decisions do not match this minute.');

                foreach ($validated['decisions'] as $decision) {
                    $minute->decisions()->where('decision_id', $decision['decision_id'])->update(collect($decision)->only([
                        'topic', 'decision_text', 'responsibility',
                    ])->all());
                }

                $document->update([
                    'description' => trim(mb_substr((string) ($validated['discussion_summary'] ?? ''), 0, 255)),
                    'full_content' => $validated['discussion_summary'] ?? '',
                ]);
            }

            $currentStep->update([
                'status' => 'approved',
                'actioned_by' => $request->user()->user_id,
                'actioned_at' => now(),
            ]);
            $nextStep = $document->steps->firstWhere('step_order', $document->current_step_order + 1);
            abort_unless($nextStep?->step_order === 3, 409, 'The Deputy approval step is missing from this workflow.');
            if ($nextStep) {
                $nextStep->update([
                    'status' => 'pending',
                    'assigned_to' => (int) $selectedDeputy->user_id,
                ]);
                $document->update(['current_step_order' => $nextStep->step_order]);
            } else {
                $document->update(['status' => 'approved']);
                if ($document->document_type === 'letter') {
                    Letter::where('letter_id', $document->source_id)->update(['status' => 'approved']);
                } else {
                    MeetingMinute::where('minute_id', $document->source_id)->update(['status' => 'approved']);
                }
            }

            if (is_string($notes) && trim($notes) !== '') {
                $document->comments()->create([
                    'user_id' => $request->user()->user_id,
                    'comment' => $notes,
                ]);
            }

            return $document->fresh();
        });

        $nextStep = $updatedDocument->steps()->where('step_order', $updatedDocument->current_step_order)->first();
        [$entityName, $entityCode] = $this->notificationIdentity($updatedDocument);
        $actionDate = now()->format('d M Y, h:i A');
        if ($nextStep) {
            if ((int) $updatedDocument->submitted_by !== (int) $request->user()->user_id) {
                $this->notifications->sendToUser(
                    $updatedDocument->submitted_by,
                    'approval_step_approved',
                    "{$entityName} edited and forwarded",
                    "{$entityName} {$entityCode} was edited and forwarded by {$request->user()->full_name} on {$actionDate} to {$this->roleLabel($nextStep->required_role)}.",
                    '/approvals', 'approval_document', $updatedDocument->document_id, 'important',
                );
            }
            if ($nextStep->assigned_to) {
                $this->notifications->sendToUser(
                    (int) $nextStep->assigned_to,
                    'approval_action_required',
                    "{$entityName} awaiting your approval",
                    "{$entityName} {$entityCode} was edited and forwarded by {$request->user()->full_name} on {$actionDate} and is ready for your review.",
                    '/approvals', 'approval_document', $updatedDocument->document_id, 'important',
                );
            } else {
                $this->notifications->sendToRole(
                    $nextStep->required_role,
                    'approval_action_required',
                    "{$entityName} awaiting your approval",
                    "{$entityName} {$entityCode} was edited and forwarded by {$request->user()->full_name} on {$actionDate} and is ready for your review.",
                    '/approvals', 'approval_document', $updatedDocument->document_id, 'important', $request->user()->user_id,
                );
            }
        }

        $updatedDocument->load('submitter.role', 'steps.actionedBy', 'steps.assignee.organization', 'comments.user', 'sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting.attendees', 'sourceMinute.decisions');
        return response()->json([
            'message' => 'Changes saved and document forwarded for approval.',
            'document' => $this->withSubjectCode($updatedDocument),
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $actor = $request->user();
        $document = DB::transaction(function () use ($request, $id, $actor) {
            $document = ApprovableDocument::lockForUpdate()->findOrFail($id);
            $currentStep = $document->steps()->where('step_order', $document->current_step_order)->lockForUpdate()->first();
            abort_unless(
                $document->status === 'pending'
                    && $currentStep
                    && $currentStep->status === 'pending'
                    && $currentStep->required_role === $actor->role?->role_name
                    && (!$currentStep->assigned_to || (int) $currentStep->assigned_to === (int) $actor->user_id),
                403,
                'You are not authorized to reject this step.'
            );

            $currentStep->update([
                'status' => 'rejected',
                'actioned_by' => $actor->user_id,
                'actioned_at' => now(),
            ]);
            $document->update(['status' => 'rejected']);
            if ($document->document_type === 'letter' && $document->source_id) {
                Letter::where('letter_id', $document->source_id)->update(['status' => 'rejected']);
            }
            if ($document->document_type === 'minute' && $document->source_id) {
                MeetingMinute::where('minute_id', $document->source_id)->update(['status' => 'rejected']);
            }
            if ($request->filled('notes')) {
                $document->comments()->create(['user_id' => $actor->user_id, 'comment' => $request->input('notes')]);
            }
            return $document->fresh();
        });

        if ((int) $document->submitted_by !== (int) $actor->user_id) {
            [$entityName, $entityCode] = $this->notificationIdentity($document);
            $actionDate = now()->format('d M Y, h:i A');
            $this->notifications->sendToUser(
                $document->submitted_by,
                'approval_rejected',
                "{$entityName} rejected",
                "{$entityName} {$entityCode} was rejected by {$actor->full_name} on {$actionDate}.",
                '/approvals',
                'approval_document',
                $document->document_id,
                'urgent',
            );
        }

        $document->load('submitter.role', 'steps.actionedBy', 'steps.assignee.organization', 'comments.user', 'sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting.attendees', 'sourceMinute.decisions');
        return response()->json([
            'message' => 'Rejected',
            'document' => $this->withSubjectCode($document),
        ]);
    }

    private function withSubjectCode(ApprovableDocument $document): ApprovableDocument
    {
        $document->setAttribute(
            'subject_code',
            match ($document->document_type) {
                'letter' => $document->sourceLetter?->subject?->code,
                'minute' => $document->sourceMinute?->meeting?->meeting_code ?? $document->subject,
                default => null,
            }
        );

        return $document;
    }

    private function submissionResponse(ApprovableDocument $document): ApprovableDocument
    {
        $document->loadMissing('submitter', 'steps');
        $document->makeHidden(['full_content']);

        return $this->withSubjectCode($document);
    }

    private function plainText(string $value): string
    {
        $decoded = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $withLineBreaks = preg_replace('/<\s*br\s*\/?\s*>/i', "\n", $decoded) ?? $decoded;
        $withLineBreaks = preg_replace('/<\/(p|div|li|h[1-6])\s*>/i', "\n", $withLineBreaks) ?? $withLineBreaks;

        return trim(strip_tags($withLineBreaks));
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
        if (!$this->canViewDocument($document, $request->user())) {
            return response()->json(['message' => 'You are not authorized to comment on this approval document.'], 403);
        }
        $comment = $document->comments()->create([
            'user_id' => $request->user()->user_id,
            'comment' => $request->comment,
        ]);

        if ((int) $document->submitted_by !== (int) $request->user()->user_id) {
            [$entityName, $entityCode] = $this->notificationIdentity($document);
            $actionDate = now()->format('d M Y, h:i A');
            $this->notifications->sendToUser(
                $document->submitted_by,
                'approval_comment_added',
                "New comment on {$entityName}",
                "{$request->user()->full_name} added a comment to {$entityName} {$entityCode} on {$actionDate}.",
                '/approvals',
                'approval_document',
                $document->document_id,
            );
        }

        return response()->json(['comment' => $comment->load('user')], 201);
    }

    private function notifyCurrentReviewer(ApprovableDocument $document, int $actorUserId, bool $resubmitted = false): void
    {
        $document->loadMissing('steps', 'submitter', 'sourceLetter.subject', 'sourceMinute.meeting');
        $currentStep = $document->steps->firstWhere('step_order', $document->current_step_order);

        if (!$currentStep) {
            return;
        }

        [$entityName, $entityCode] = $this->notificationIdentity($document);
        $submittedAt = now()->format('d M Y, h:i A');
        $submitterName = $document->submitter?->full_name ?? 'An officer';

        $this->notifications->sendToRole(
            $currentStep->required_role,
            'approval_action_required',
            $resubmitted ? "{$entityName} resubmitted for approval" : "New {$entityName} awaiting approval",
            "{$entityName} {$entityCode} was " . ($resubmitted ? 'resubmitted' : 'submitted') . " by {$submitterName} on {$submittedAt} and is ready for your review.",
            '/approvals',
            'approval_document',
            $document->document_id,
            'important',
            $actorUserId,
        );
    }

    /** @return array{0: string, 1: string} */
    private function notificationIdentity(ApprovableDocument $document): array
    {
        $document->loadMissing('sourceLetter.subject', 'sourceMinute.meeting');
        $entityName = ucfirst(str_replace('_', ' ', $document->document_type));
        $entityCode = match ($document->document_type) {
            'letter' => $document->sourceLetter?->subject?->code ?: $document->subject,
            'minute' => $document->sourceMinute?->meeting?->meeting_code ?: $document->subject,
            default => $document->subject,
        };

        return [$entityName, $entityCode];
    }

    private function roleLabel(string $role): string
    {
        return match ($role) {
            'dept_head' => 'the Department Head',
            'deputy' => 'the Deputy Chief Secretary',
            'chief_secretary' => 'the Chief Secretary',
            default => ucfirst(str_replace('_', ' ', $role)),
        };
    }
}
