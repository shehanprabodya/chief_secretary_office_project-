<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActionItem;
use App\Models\ApprovableDocument;
use App\Models\Meeting;
use App\Models\MeetingMinute;
use App\Models\MinuteDecision;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\Process\Process;
use Throwable;

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
        $minute = MeetingMinute::with('meeting.attendees', 'decisions')
            ->findOrFail($id);

        return response()->json(['minute' => $minute]);
    }

    /**
     * Create or load draft minutes for a given meeting
     */
    public function getOrCreateForMeeting(Request $request, int $meetingId): JsonResponse
    {
        $meeting = Meeting::with(
                'attendees.organization',
                'letters.recipients.user',
                'letters.recipients.organization',
            )
            ->findOrFail($meetingId);

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

    public function deleteDecision(int $decisionId): JsonResponse
    {
        MinuteDecision::findOrFail($decisionId)->delete();
        return response()->json(['message' => 'Decision removed']);
    }

    public function updateDecision(Request $request, int $decisionId): JsonResponse
    {
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

    public function downloadPdf(Request $request, int $id)
    {
        $minute = MeetingMinute::with([
            'meeting.attendees.organization',
            'decisions',
        ])->findOrFail($id);

        // Basic authorization
        if (
            (int) $minute->created_by !== (int) $request->user()->user_id
            && !$request->user()->hasRole('dept_head')
            && !$request->user()->hasRole('deputy')
            && !$request->user()->hasRole('chief_secretary')
        ) {
            return response()->json([
                'message' => 'You do not have permission to export these minutes.'
            ], 403);
        }

        $fontPath = base_path('../frontend/public/fonts/Iskoola Pota Regular.ttf');
        $fontFace = is_file($fontPath)
            ? '@font-face { font-family: "Iskoola Pota"; src: url("data:font/ttf;base64,'
                . base64_encode((string) file_get_contents($fontPath))
                . '") format("truetype"); font-style: normal; font-weight: 400; }'
            : '';

        $html = view('minutes.pdf', [
            'minute' => $minute,
            'meeting' => $minute->meeting,
            'fontFace' => $fontFace,
        ])->render();

        $filename = 'minutes-' .
            ($minute->meeting->meeting_code ?? $minute->minute_id) .
            '-' .
            now()->format('Ymd') .
            '.pdf';

        try {
            $pdfPath = $this->convertHtmlWithLibreOffice($html);

            return response()->download($pdfPath, $filename, [
                'Content-Type' => 'application/pdf',
            ])->deleteFileAfterSend(true);
        } catch (Throwable) {
            // Use Dompdf when LibreOffice is unavailable.
        }

        $options = new \Dompdf\Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', true);
        $options->set('defaultFont', 'Iskoola Pota');
        $options->setChroot(['/usr/share/fonts', base_path(), dirname($fontPath)]);

        $dompdfFontDir = storage_path('app/dompdf-fonts');
        if (!is_dir($dompdfFontDir)) {
            mkdir($dompdfFontDir, 0775, true);
        }
        $options->set('fontDir', $dompdfFontDir);
        $options->set('fontCache', $dompdfFontDir);

        $dompdf = new \Dompdf\Dompdf($options);
        if (is_file($fontPath)) {
            $dompdf->getFontMetrics()->registerFont([
                'family' => 'Iskoola Pota',
                'weight' => 'normal',
                'style' => 'normal',
            ], 'file://' . $fontPath);
        }
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
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
