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

    $query = ApprovableDocument::query()
        ->where('status', 'pending')
        ->with([
            'submitter',
            'steps',
            'sourceLetter.subject',
            'sourceMinute.meeting',
        ]);

    // Officers only see their own pending documents
    if ($request->user()->hasRole('officer')) {
        $query->where(
            'submitted_by',
            $request->user()->user_id
        );
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
    public function show(Request $request, int $id): JsonResponse
    {
        $document = ApprovableDocument::with('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting', 'sourceMinute.decisions')
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
            $existingDocument = ApprovableDocument::where('document_type', $validated['document_type'])
                ->where('source_id', $validated['source_id'])
                ->with('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting', 'sourceMinute.decisions')
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

                    if ($existingDocument->document_type === 'minute' && $existingDocument->source_id) {
                        MeetingMinute::where('minute_id', $existingDocument->source_id)->update(['status' => 'pending_approval']);
                    }

                    $this->notifyCurrentReviewer($existingDocument, $request->user()->user_id, true);

                    return response()->json([
                        'message' => 'Revised approved document submitted for approval',
                        'document' => $this->withSubjectCode(
                            $existingDocument->load('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting', 'sourceMinute.decisions')
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

                    if ($existingDocument->document_type === 'minute' && $existingDocument->source_id) {
                        MeetingMinute::where('minute_id', $existingDocument->source_id)->update(['status' => 'pending_approval']);
                    }

                    $this->notifyCurrentReviewer($existingDocument, $request->user()->user_id, true);

                    return response()->json([
                        'message' => 'Rejected document resubmitted for approval',
                        'document' => $this->withSubjectCode(
                            $existingDocument->load('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting', 'sourceMinute.decisions')
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

        if ($document->document_type === 'minute' && $document->source_id) {
            MeetingMinute::where('minute_id', $document->source_id)->update(['status' => 'pending_approval']);
        }

        return response()->json([
            'message' => 'Document submitted for approval',
            'document' => $this->withSubjectCode($document->load('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting', 'sourceMinute.decisions')),
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

            if ($document->document_type === 'minute' && $document->source_id) {
                MeetingMinute::where('minute_id', $document->source_id)->update(['status' => 'approved']);
                $this->notifyApprovedMinuteTargets($document);
            }
        }

        if ($request->filled('notes')) {
            $document->comments()->create([
                'user_id' => $request->user()->user_id,
                'comment' => $request->notes,
            ]);
        }

        if ((int) $document->submitted_by !== (int) $request->user()->user_id) {
            [$entityName, $entityCode] = $this->notificationIdentity($document);
            $actionDate = now()->format('d M Y, h:i A');
            $this->notifications->sendToUser(
                $document->submitted_by,
                'approval_step_approved',
                $nextStep ? "{$entityName} approved and forwarded" : "{$entityName} approved",
                $nextStep
                    ? "{$entityName} {$entityCode} was approved by {$request->user()->full_name} on {$actionDate} and forwarded to {$this->roleLabel($nextStep->required_role)}."
                    : "{$entityName} {$entityCode} received final approval from {$request->user()->full_name} on {$actionDate}.",
                '/approvals',
                'approval_document',
                $document->document_id,
                'important',
            );
        }

        if ($nextStep) {
            [$entityName, $entityCode] = $this->notificationIdentity($document);
            $actionDate = now()->format('d M Y, h:i A');
            $this->notifications->sendToRole(
                $nextStep->required_role,
                'approval_action_required',
                "{$entityName} awaiting your approval",
                "{$entityName} {$entityCode} was forwarded by {$request->user()->full_name} on {$actionDate} and is ready for your review.",
                '/approvals',
                'approval_document',
                $document->document_id,
                'important',
                $request->user()->user_id,
            );
        }

        return response()->json([
                'message' => 'Approved',
                'document_id' => $document->document_id,
                'status' => $document->status,
                'current_step_order' => $document->current_step_order,
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
                $letter->refresh();
                $document->update([
                    'subject' => $plainTitle,
                    'description' => trim(mb_substr($plainContent, 0, 255)),
                    'full_content' => $plainContent,
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
            if ($nextStep) {
                $nextStep->update(['status' => 'pending']);
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
            $this->notifications->sendToRole(
                $nextStep->required_role,
                'approval_action_required',
                "{$entityName} awaiting your approval",
                "{$entityName} {$entityCode} was edited and forwarded by {$request->user()->full_name} on {$actionDate} and is ready for your review.",
                '/approvals', 'approval_document', $updatedDocument->document_id, 'important', $request->user()->user_id,
            );
        }

        $updatedDocument->load('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting', 'sourceMinute.decisions');
        return response()->json([
            'message' => 'Changes saved and document forwarded for approval.',
            'document' => $this->withSubjectCode($updatedDocument),
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

        if ($document->document_type === 'minute' && $document->source_id) {
            MeetingMinute::where('minute_id', $document->source_id)->update(['status' => 'rejected']);
        }

        if ($request->filled('notes')) {
            $document->comments()->create([
                'user_id' => $request->user()->user_id,
                'comment' => $request->notes,
            ]);
        }

        if ((int) $document->submitted_by !== (int) $request->user()->user_id) {
            [$entityName, $entityCode] = $this->notificationIdentity($document);
            $actionDate = now()->format('d M Y, h:i A');
            $this->notifications->sendToUser(
                $document->submitted_by,
                'approval_rejected',
                "{$entityName} rejected",
                "{$entityName} {$entityCode} was rejected by {$request->user()->full_name} on {$actionDate}.",
                '/approvals',
                'approval_document',
                $document->document_id,
                'urgent',
            );
        }

        return response()->json([
            'message' => 'Rejected',
            'document' => $this->withSubjectCode($document->load('submitter', 'steps.actionedBy', 'comments.user', 'sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting', 'sourceMinute.decisions')),
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
        $document->loadMissing('steps', 'submitter', 'sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting', 'sourceMinute.decisions');
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
        $document->loadMissing('sourceLetter.subject', 'sourceLetter.recipients.organization', 'sourceLetter.recipients.user.organization', 'sourceMinute.meeting', 'sourceMinute.decisions');
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
            'deputy' => 'the Deputy Secretary',
            'chief_secretary' => 'the Chief Secretary',
            default => ucfirst(str_replace('_', ' ', $role)),
        };
    }
}
