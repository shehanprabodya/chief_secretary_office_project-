<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActionItem;
use App\Models\ApprovableDocument;
use App\Models\DocumentSignature;
use App\Models\Meeting;
use App\Models\MeetingMinute;
use App\Models\MinuteDecision;
use App\Services\SignatureManagementService;
use App\Services\DocumentDistributionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\Process\Process;
use Throwable;

class MinuteController extends Controller
{
    public function __construct(private readonly DocumentDistributionService $distributionService) {}
    public function index(Request $request): JsonResponse
    {
        $minutes = MeetingMinute::with('meeting')
            ->where('created_by', $request->user()->user_id)
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        return response()->json($minutes);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $minute = MeetingMinute::with('meeting.attendees', 'decisions')
            ->findOrFail($id);

        if ((int) $minute->created_by !== (int) $request->user()->user_id) {
            return response()->json([
                'message' => 'Only the meeting minute creator can access this minute.',
            ], 403);
        }

        return response()->json(['minute' => $minute]);
    }

    /**
     * Create or load draft minutes for a given meeting
     */
    public function getOrCreateForMeeting(Request $request, int $meetingId): JsonResponse
    {
        $meeting = Meeting::with(
                'creator',
                'attendees.organization',
                'letters.recipients.user',
                'letters.recipients.organization',
            )
            ->findOrFail($meetingId);

        $isMeetingCreator = (int) $meeting->created_by === (int) $request->user()->user_id;
        if (!$isMeetingCreator) {
            $existingMinute = MeetingMinute::where('meeting_id', $meetingId)->first();

            if (!$existingMinute) {
                return response()->json([
                    'message' => 'Only the officer who created this meeting can create minutes for it.',
                ], 403);
            }

            $existingMinute->load('decisions');
            $latestLetter = $meeting->letters->sortByDesc('letter_id')->first();
            $letterRecipients = $latestLetter
                ? $latestLetter->recipients->map(fn ($recipient) => [
                    'letter_recipient_id' => $recipient->letter_recipient_id,
                    'user_id' => $recipient->user_id,
                    'organization_id' => $recipient->organization_id,
                    'recipient_label' => $recipient->recipient_label,
                    'designation' => optional($recipient->user)->designation,
                    'full_name' => optional($recipient->user)->full_name,
                    'organization_name' => optional($recipient->organization)->organization_name,
                ])->values()
                : collect();

            return response()->json([
                'minute' => $existingMinute,
                'meeting' => $meeting,
                'letter_recipients' => $letterRecipients,
            ]);
        }

        $minute = MeetingMinute::firstOrCreate(
            ['meeting_id' => $meetingId],
            ['status' => 'draft', 'created_by' => $request->user()->user_id]
        );

        $minute->load('decisions');

        $latestLetter = $meeting->letters->sortByDesc('letter_id')->first();
        $letterRecipients = $latestLetter
            ? $latestLetter->recipients->map(fn ($recipient) => [
                'letter_recipient_id' => $recipient->letter_recipient_id,
                'user_id' => $recipient->user_id,
                'organization_id' => $recipient->organization_id,
                'recipient_label' => $recipient->recipient_label,
                'designation' => optional($recipient->user)->designation,
                'full_name' => optional($recipient->user)->full_name,
                'organization_name' => optional($recipient->organization)->organization_name,
            ])->values()
            : collect();

        return response()->json([
            'minute' => $minute,
            'meeting' => $meeting,
            'letter_recipients' => $letterRecipients,
        ]);
    }

    public function store(Request $request, int $meetingId): JsonResponse
    {
        $meeting = Meeting::with('attendees')->findOrFail($meetingId);

        if ((int) $meeting->created_by !== (int) $request->user()->user_id) {
            return response()->json([
                'message' => 'Only the officer who created this meeting can create minutes for it.',
            ], 403);
        }

        $minute = MeetingMinute::firstOrCreate(
            ['meeting_id' => $meetingId],
            [
                'meeting_description' => $request->input('meeting_description'),
                'discussion_summary' => $request->input('discussion_summary'),
                'status' => 'draft',
                'created_by' => $request->user()->user_id,
            ]
        );

        if (!$minute->wasRecentlyCreated && ($request->exists('meeting_description') || $request->exists('discussion_summary'))) {
            $minute->update($request->only(['meeting_description', 'discussion_summary']));
        }

        $minute->load('decisions');

        return response()->json(['minute' => $minute, 'meeting' => $meeting], $minute->wasRecentlyCreated ? 201 : 200);
    }

    public function saveDraft(Request $request, int $id): JsonResponse
    {
        $minute = MeetingMinute::findOrFail($id);

        if ($minute->status === 'approved') {
            return response()->json([
                'message' => 'Approved meeting minutes are read-only and cannot be edited.',
            ], 409);
        }

        if ((int) $minute->created_by !== (int) $request->user()->user_id) {
            return response()->json([
                'message' => 'Only the minute creator can save changes to this minute.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'meeting_description' => 'nullable|string',
            'discussion_summary' => 'nullable|string',
            'closing_remarks' => 'nullable|string',
            'signatory_name' => 'nullable|string|max:255',
            'signatory_designation' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $minute->update($validator->validated());

        return response()->json(['message' => 'Saved as draft', 'minute' => $minute]);
    }

    public function submitForApproval(Request $request, int $id): JsonResponse
    {
        $minute = MeetingMinute::with('meeting')->findOrFail($id);

        if ((int) $minute->created_by !== (int) $request->user()->user_id) {
            return response()->json([
                'message' => 'Only the minute creator can submit this minute for approval.',
            ], 403);
        }

        $minute->update(['status' => 'pending_approval']);

        $approvalDocument = ApprovableDocument::firstOrCreate(
            [
                'document_type' => 'minute',
                'source_id' => $minute->minute_id,
            ],
            [
                'reference_id' => ApprovableDocument::generateReferenceId('minute'),
                'subject' => $minute->meeting?->title ?? 'Meeting Minutes',
                'description' => (string) str($minute->discussion_summary ?? '')->limit(255),
                'full_content' => $minute->discussion_summary,
                'status' => 'pending',
                'submitted_by' => $request->user()->user_id,
                'current_step_order' => 2,
            ]
        );

        if ($approvalDocument->wasRecentlyCreated) {
            $approvalDocument->initializeWorkflow();
            $approvalDocument->load('submitter', 'steps.actionedBy', 'comments.user', 'sourceMinute.meeting');
        }

        $approvalDocument->refresh();

        return response()->json([
            'message' => 'Minutes submitted for approval',
            'minute' => $minute,
            'approval_document' => $approvalDocument,
        ]);
    }

    /**
     * Add a Formal Decision (the numbered list)
     */
    public function addDecision(Request $request, int $minuteId): JsonResponse
    {
        $minute = MeetingMinute::findOrFail($minuteId);

        if ($minute->status === 'approved') {
            return response()->json([
                'message' => 'Approved meeting minutes are read-only and cannot be edited.',
            ], 409);
        }

        if ((int) $minute->created_by !== (int) $request->user()->user_id) {
            return response()->json([
                'message' => 'Only the minute creator can modify decisions for this minute.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'topic' => 'nullable|string|max:500',
            'decision_text' => 'required|string',
            'responsibility' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $nextOrder = MinuteDecision::where('minute_id', $minuteId)->max('decision_order') + 1;

        $decision = MinuteDecision::create([
            'minute_id' => $minuteId,
            'decision_order' => $nextOrder,
            'topic' => $request->input('topic'),
            'decision_text' => $request->decision_text,
            'responsibility' => $request->input('responsibility'),
        ]);

        return response()->json(['decision' => $decision], 201);
    }

    public function deleteDecision(Request $request, int $decisionId): JsonResponse
    {
        $decision = MinuteDecision::with('minute')->findOrFail($decisionId);

        if ($decision->minute->status === 'approved') {
            return response()->json([
                'message' => 'Approved meeting minutes are read-only and cannot be edited.',
            ], 409);
        }

        if ((int) $decision->minute->created_by !== (int) $request->user()->user_id) {
            return response()->json([
                'message' => 'Only the minute creator can delete decisions from this minute.',
            ], 403);
        }

        $decision->delete();
        return response()->json(['message' => 'Decision removed']);
    }

    public function updateDecision(Request $request, int $decisionId): JsonResponse
    {
        $decision = MinuteDecision::with('minute')->findOrFail($decisionId);

        if ($decision->minute->status === 'approved') {
            return response()->json([
                'message' => 'Approved meeting minutes are read-only and cannot be edited.',
            ], 409);
        }

        if ((int) $decision->minute->created_by !== (int) $request->user()->user_id) {
            return response()->json([
                'message' => 'Only the minute creator can update decisions for this minute.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'topic' => 'nullable|string|max:500',
            'decision_text' => 'required|string',
            'responsibility' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $decision = MinuteDecision::findOrFail($decisionId);
        $decision->update($validator->validated());

        return response()->json(['decision' => $decision]);
    }

    /**
     * Add an Action Item (right sidebar form)
     */
    public function addActionItem(Request $request, int $minuteId): JsonResponse
    {
        $minute = MeetingMinute::findOrFail($minuteId);

        if ($minute->status === 'approved') {
            return response()->json([
                'message' => 'Approved meeting minutes are read-only and cannot be edited.',
            ], 409);
        }

        if ((int) $minute->created_by !== (int) $request->user()->user_id) {
            return response()->json([
                'message' => 'Only the minute creator can add action items to this minute.',
            ], 403);
        }

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

    public function deleteActionItem(Request $request, int $itemId): JsonResponse
    {
        $item = ActionItem::with('minute')->findOrFail($itemId);

        if ($item->minute->status === 'approved') {
            return response()->json([
                'message' => 'Approved meeting minutes are read-only and cannot be edited.',
            ], 409);
        }

        if ((int) $item->minute->created_by !== (int) $request->user()->user_id) {
            return response()->json([
                'message' => 'Only the minute creator can remove action items from this minute.',
            ], 403);
        }

        $item->delete();
        return response()->json(['message' => 'Action item removed']);
    }

    public function downloadPdf(Request $request, int $id)
    {
        $minute = MeetingMinute::with([
            'meeting.attendees.organization',
            'meeting.letters.recipients',
            'decisions',
        ])->findOrFail($id);

        // Officers may preview the minute, but editing remains limited to the creator.
        if ($request->user()->hasRole('external_officer')) {
            $userId = (int) $request->user()->user_id;

            $isMeetingAttendee = collect($minute->meeting->attendees ?? [])->contains(
                fn ($attendee) => (int) $attendee->user_id === $userId
            );

            $isApprovedRecipient = collect($minute->meeting->letters ?? [])->contains(function ($letter) use ($userId) {
                if (!in_array($letter->status, ['approved', 'dispatched'], true)) {
                    return false;
                }

                return collect($letter->recipients ?? [])->contains(
                    fn ($recipient) => (int) ($recipient->user_id ?? 0) === $userId
                );
            });

            if ($minute->status !== 'approved' || (!$isMeetingAttendee && !$isApprovedRecipient)) {
                return response()->json([
                    'message' => 'You do not have permission to export these minutes.',
                ], 403);
            }
        } elseif (
            !$request->user()->hasRole('officer')
            && !$request->user()->hasRole('dept_head')
            && !$request->user()->hasRole('deputy')
            && !$request->user()->hasRole('chief_secretary')
        ) {
            return response()->json([
                'message' => 'You do not have permission to export these minutes.'
            ], 403);
        }

        // Use the shared LetterPdfService font embedding so minutes and letters
        // use the same base64-embedded Iskoola Pota font that Playwright verifies.
        $fontFace = (new \App\Services\LetterPdfService())->fontFaceCss();

        $signatureContext = $this->resolveSignatureContext($minute);
        $signatureDataUri = $signatureContext['signatureDataUri'];
        $signatoryName = $signatureContext['signatoryName'];
        $signatoryDesignation = $signatureContext['signatoryDesignation'];
        $signatoryOffice = $signatureContext['signatoryOffice'];
        $isDelegatedSignature = $signatureContext['isDelegatedSignature'];
        $delegatedPrefixLine = $signatureContext['delegatedPrefixLine'];

        $html = $this->renderSignedMinuteHtml($minute, $fontFace, $signatureDataUri, $signatoryName, $signatoryDesignation, $signatoryOffice, $isDelegatedSignature, $delegatedPrefixLine);

        $filename = 'minutes-' .
            ($minute->meeting->meeting_code ?? $minute->minute_id) .
            '-' .
            now()->format('Ymd') .
            '.pdf';

        $pdf = (new \App\Services\LetterPdfService())->generate($html);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    public function emailRecipients(Request $request, int $id): JsonResponse
    {
        $minute = MeetingMinute::with('meeting')->findOrFail($id);
        if ((int) $minute->created_by !== (int) $request->user()->user_id) return response()->json(['message' => 'Only the minute creator can distribute these minutes.'], 403);
        return response()->json(['recipients' => $this->distributionService->recipients('minute', $minute)]);
    }

    public function queueEmailDistribution(Request $request, int $id): JsonResponse
    {
        $minute = MeetingMinute::with('meeting')->findOrFail($id);
        if ((int) $minute->created_by !== (int) $request->user()->user_id) return response()->json(['message' => 'Only the minute creator can distribute these minutes.'], 403);
        $data = $request->validate(['recipient_keys' => ['required', 'array', 'min:1'], 'recipient_keys.*' => ['string', 'max:160']]);
        $summary = $this->distributionService->queue('minute', $minute, $request->user(), $data['recipient_keys']);
        return response()->json(['message' => 'Approved minutes email distribution has been queued.', 'summary' => $summary], 202);
    }

    public function emailDistributionHistory(Request $request, int $id): JsonResponse
    {
        $minute = MeetingMinute::findOrFail($id);
        if ((int) $minute->created_by !== (int) $request->user()->user_id) return response()->json(['message' => 'Only the minute creator can view this distribution history.'], 403);
        return response()->json($this->distributionService->history('minute', $minute->minute_id));
    }

    public function renderSignedMinuteHtml(
        MeetingMinute $minute,
        ?string $fontFace = null,
        ?string $signatureDataUri = null,
        ?string $signatoryName = null,
        ?string $signatoryDesignation = null,
        ?string $signatoryOffice = null,
        ?bool $isDelegatedSignature = null,
        ?string $delegatedPrefixLine = null,
    ): string {
        $minute->loadMissing('meeting.attendees.organization', 'decisions');

        $signatureContext = $this->resolveSignatureContext($minute);

        return view('minutes.pdf', [
            'minute' => $minute,
            'meeting' => $minute->meeting,
            'fontFace' => $fontFace ?? (new \App\Services\LetterPdfService())->fontFaceCss(),
            'signatureDataUri' => $signatureDataUri ?? $signatureContext['signatureDataUri'],
            'signatoryName' => $signatoryName ?? $signatureContext['signatoryName'],
            'signatoryDesignation' => $signatoryDesignation ?? $signatureContext['signatoryDesignation'],
            'signatoryOffice' => $signatoryOffice ?? $signatureContext['signatoryOffice'],
            'isDelegatedSignature' => $isDelegatedSignature ?? $signatureContext['isDelegatedSignature'],
            'delegatedPrefixLine' => $delegatedPrefixLine ?? $signatureContext['delegatedPrefixLine'],
        ])->render();
    }

    private function resolveSignatureContext(MeetingMinute $minute): array
    {
        $signatoryName = $minute->signatory_name;
        $signatoryDesignation = $minute->signatory_designation;
        $signatoryOffice = 'දකුණු පළාත';
        $signatureDataUri = null;
        $isDelegatedSignature = false;
        $delegatedPrefixLine = null;

        $documentSignature = DocumentSignature::query()
            ->where('document_type', 'minute')
            ->where('document_id', $minute->minute_id)
            ->with('signer')
            ->latest('signed_at')
            ->first();

        if ($documentSignature && $documentSignature->signer) {
            $signatureDataUri = app(SignatureManagementService::class)->dataUriForUser($documentSignature->signer);

            if ($documentSignature->signing_type === 'DELEGATED') {
                $isDelegatedSignature = true;
                $delegatedPrefixLine = 'ප්‍රධාන ලේකම් වෙනුවෙන්,';
                $signatoryName = $documentSignature->signer_name_snapshot ?: $documentSignature->signer->displayNameSinhala();
                $signatoryDesignation = $documentSignature->signer_designation_snapshot
                    ?: ($documentSignature->signer->designationSinhala() ?? 'නියෝජ්‍ය ප්‍රධාන ලේකම්');
                $signatoryOffice = $documentSignature->signer_office_snapshot ?: 'දකුණු පළාත් සභාව';
            }
        }

        return [
            'signatureDataUri' => $signatureDataUri,
            'signatoryName' => $signatoryName,
            'signatoryDesignation' => $signatoryDesignation,
            'signatoryOffice' => $signatoryOffice,
            'isDelegatedSignature' => $isDelegatedSignature,
            'delegatedPrefixLine' => $delegatedPrefixLine,
        ];
    }

    private function convertHtmlWithLibreOffice(string $html): string
    {
        $binary = $this->libreOfficeBinary();
        if (!$binary) {
            throw new \RuntimeException('LibreOffice is not installed.');
        }

        $workDir = sys_get_temp_dir() . '/minutes-export-' . uniqid('', true);
        mkdir($workDir, 0775, true);

        $htmlPath = $workDir . '/minutes.html';
        $profileDir = $workDir . '/lo-profile';
        $runtimeDir = $workDir . '/runtime';
        mkdir($profileDir, 0775, true);
        mkdir($runtimeDir, 0700, true);
        file_put_contents($htmlPath, $html);

        $fontDir = base_path('../frontend/public/fonts');
        $cacheDir = $workDir . '/font-cache';
        mkdir($cacheDir, 0775, true);
        $escapeXml = static fn (string $value): string => htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $fontConfigPath = $workDir . '/fonts.conf';
        $fontConfig = '<?xml version="1.0"?>'
            . '<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">'
            . '<fontconfig><dir>' . $escapeXml($fontDir) . '</dir>'
            . '<cachedir>' . $escapeXml($cacheDir) . '</cachedir>'
            . '<config><rescan><int>0</int></rescan></config></fontconfig>';
        file_put_contents($fontConfigPath, $fontConfig);

        $process = new Process([
            $binary,
            '--headless',
            '-env:UserInstallation=file://' . $profileDir,
            '--convert-to',
            'pdf:writer_pdf_Export',
            '--outdir',
            $workDir,
            $htmlPath,
        ]);
        $process->setEnv([
            'HOME' => $workDir,
            'XDG_RUNTIME_DIR' => $runtimeDir,
            'FONTCONFIG_FILE' => $fontConfigPath,
            'FONTCONFIG_PATH' => $workDir,
            'SAL_FONTPATH' => $fontDir,
            'LANG' => 'en_US.UTF-8',
        ]);
        $process->setTimeout(60);
        $process->run();

        $pdfPath = $workDir . '/minutes.pdf';
        if (!is_file($pdfPath)) {
            throw new \RuntimeException(trim($process->getErrorOutput() . "\n" . $process->getOutput()));
        }

        return $pdfPath;
    }

    private function libreOfficeBinary(): ?string
    {
        foreach (['/usr/bin/libreoffice', '/usr/bin/soffice'] as $binary) {
            if (is_executable($binary)) return $binary;
        }

        return null;
    }
}
