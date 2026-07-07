<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Letter;
use App\Models\Meeting;
use App\Models\Organization;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class LetterController extends Controller
{
    /**
     * List all letters created by the logged-in officer (for draft resuming)
     */
    public function index(Request $request): JsonResponse
    {
        $letters = Letter::with('recipients.organization', 'recipients.user', 'subject')
            ->where('created_by', $request->user()->user_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['letters' => $letters]);
    }

    /**
     * Get a single letter with all relations
     */
    public function show(int $id): JsonResponse
    {
        $letter = Letter::with(
            'recipients.organization',
            'recipients.user.organization',
            'subject',
            'meeting',
            'creator'
        )->findOrFail($id);

        return response()->json(['letter' => $letter]);
    }

    /**
     * Save as draft — create or update
     */
    public function saveDraft(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'letter_id'         => 'nullable|exists:letters,letter_id',
            'meeting_code'      => 'nullable|string|max:50',
            'subject_id'        => 'nullable|exists:subjects,id',
            'title'             => 'nullable|string|max:255',
            'content'           => 'nullable|string',
            'designation'       => 'nullable|string|max:150',
            'signatory_name'    => 'nullable|string|max:150',
            'signature_date'    => 'nullable|date',
            'recipients'        => 'nullable|array',
            'recipients.*.organization_id' => 'nullable|exists:organizations,organization_id',
            'recipients.*.user_id'         => 'nullable|exists:users,user_id',
            'recipients.*.recipient_label' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $user = $request->user();

        $data = [
            'sender_name'    => 'දකුණු පළාත් ප්‍රධාන ලේකම් කාර්යාලය',
            'meeting_code'   => $request->meeting_code,
            'subject_id'     => $request->subject_id,
            'title'          => $request->title ?? '',
            'content'        => $request->content ?? '',
            'designation'    => $request->designation ?? 'ප්‍රධාන ලේකම්',
            'signatory_name' => $request->signatory_name,
            'signature_date' => $request->signature_date,
            'status'         => 'draft',
            'created_by'     => $user->user_id,
        ];

        // Resolve meeting_id from meeting_code if provided
        if ($request->filled('meeting_code')) {
            $meeting = Meeting::where('meeting_code', $request->meeting_code)->first();
            if ($meeting) {
                $data['meeting_id'] = $meeting->meeting_id;
            }
        }

        if ($request->filled('letter_id')) {
            $letter = Letter::where('letter_id', $request->letter_id)
                ->where('created_by', $user->user_id)
                ->firstOrFail();
            $letter->update($data);
        } else {
            $letter = Letter::create($data);
        }

        // Sync recipients
        if ($request->has('recipients')) {
            $letter->recipients()->delete();
            foreach ($request->recipients as $r) {
                $letter->recipients()->create([
                    'organization_id' => $r['organization_id'] ?? null,
                    'user_id'         => $r['user_id'] ?? null,
                    'recipient_label' => $r['recipient_label'] ?? null,
                ]);
            }
        }

        return response()->json([
            'message' => 'Draft saved',
            'letter'  => $letter->load('recipients.organization', 'recipients.user.organization', 'subject'),
        ]);
    }

    /**
     * Generate the letter — builds the formatted letter HTML from stored data.
     * This is what "Generate Letter" button calls.
     * Returns structured letter content ready for preview/PDF/DOCX.
     */
    public function generate(int $id): JsonResponse
    {
        $letter = Letter::with(
            'recipients.organization',
            'recipients.user.organization',
            'subject',
            'meeting',
            'creator'
        )->findOrFail($id);

        if (empty($letter->content)) {
            return response()->json(['message' => 'Letter content is empty. Please write the letter body first.'], 422);
        }

        $generatedHtml = $this->buildLetterHtml($letter);

        return response()->json([
            'letter'         => $letter,
            'generated_html' => $generatedHtml,
        ]);
    }

    /**
     * Preview — same as generate but returns lightweight preview data
     */
    public function preview(int $id): JsonResponse
    {
        $letter = Letter::with(
            'recipients.organization',
            'recipients.user.organization',
            'subject',
            'creator'
        )->findOrFail($id);

        $generatedHtml = $this->buildLetterHtml($letter);

        return response()->json([
            'preview_html' => $generatedHtml,
            'letter'       => $letter,
        ]);
    }

    /**
     * Download as PDF — returns base64 encoded PDF
     * (Uses a simple HTML-to-PDF approach; swap with wkhtmltopdf/Dompdf if needed)
     */
    public function downloadPdf(int $id): \Illuminate\Http\Response
    {
        $letter = Letter::with(
            'recipients.organization',
            'recipients.user.organization',
            'subject',
            'creator'
        )->findOrFail($id);

        $html = $this->buildLetterHtml($letter, true); // true = include full page CSS

        // Using Dompdf (composer require dompdf/dompdf)
        $dompdf = new \Dompdf\Dompdf();
        $dompdf->set_option('isHtml5ParserEnabled', true);
        $dompdf->set_option('isRemoteEnabled', true);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        $filename = 'letter-' . $letter->letter_id . '-' . now()->format('Ymd') . '.pdf';

        return response($dompdf->output(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Build formatted letter HTML — the core generation logic.
     * Matches the official Sri Lanka government letter format.
     */
    private function buildLetterHtml(Letter $letter, bool $standalone = false): string
    {
        $date = $letter->signature_date
            ? \Carbon\Carbon::parse($letter->signature_date)->format('d/m/Y')
            : now()->format('d/m/Y');

        $recipients = $letter->recipients->map(function ($r) {
            if ($r->recipient_label) return $r->recipient_label;
            if ($r->organization) return $r->organization->organization_name;
            if ($r->user) return "{$r->user->designation}, {$r->user->organization?->organization_name}";
            return '';
        })->filter()->implode("\n");

        $subjectCode = $letter->subject?->code ?? $letter->meeting_code ?? '';
        $subjectTitle = $letter->subject?->title ?? '';

        $css = $standalone ? '
            <style>
                body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.8; color: #000; margin: 0; padding: 0; }
                .letter-page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 25mm 20mm 20mm 30mm; box-sizing: border-box; background: white; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
                .header h1 { font-size: 14pt; font-weight: bold; margin: 0 0 4px 0; }
                .header p { font-size: 10pt; margin: 0; }
                .meta-row { display: flex; justify-content: space-between; margin-bottom: 16px; }
                .to-block { margin-bottom: 20px; }
                .to-block p { margin: 0; }
                .subject-line { font-weight: bold; margin-bottom: 20px; text-decoration: underline; }
                .content { text-align: justify; margin-bottom: 40px; }
                .signature-block { margin-top: 60px; }
                .signature-line { border-top: 1px solid #000; width: 200px; margin-bottom: 4px; }
                .footer-bar { border-top: 1px solid #000; margin-top: 40px; padding-top: 6px; font-size: 9pt; text-align: center; }
            </style>' : '';

        $wrap = $standalone ? "<html><head><meta charset='UTF-8'>{$css}</head><body>" : '';
        $wrapEnd = $standalone ? '</body></html>' : '';

        return <<<HTML
{$wrap}
<div class="letter-page">
    <div class="header">
        <h1>දකුණු පළාත් ප්‍රධාන ලේකම් කාර්යාලය</h1>
        <h1>OFFICE OF THE CHIEF SECRETARY — SOUTHERN PROVINCIAL COUNCIL</h1>
        <p>Development Division &nbsp;|&nbsp; Administrative Portal</p>
    </div>

    <div class="meta-row">
        <div>
            <strong>කේතය / Reference:</strong> {$subjectCode}
        </div>
        <div>
            <strong>දිනය / Date:</strong> {$date}
        </div>
    </div>

    <div class="to-block">
        <p><strong>වෙත / To:</strong></p>
        <p style="white-space: pre-line;">{$recipients}</p>
    </div>

    <div class="subject-line">
        විෂය / Subject: {$letter->title}
        {$subjectTitle}
    </div>

    <div class="content">
        {$letter->content}
    </div>

    <div class="signature-block">
        <p>ඔබගේ විශ්වාසී,<br>Yours faithfully,</p>
        <br><br><br>
        <div class="signature-line"></div>
        <p><strong>{$letter->signatory_name}</strong></p>
        <p>{$letter->designation}</p>
        <p>දකුණු පළාත් ප්‍රධාන ලේකම් කාර්යාලය</p>
    </div>

    <div class="footer-bar">
        © 2024 OFFICE OF THE CHIEF SECRETARY — SOUTHERN PROVINCIAL COUNCIL
    </div>
</div>
{$wrapEnd}
HTML;
    }

    /**
     * Get all organizations for recipient dropdown
     */
    public function getOrganizations(): JsonResponse
    {
        $orgs = Organization::where('status', 'ACTIVE')
            ->with(['users' => fn($q) => $q->whereHas('role', fn($r) => $r->where('role_name', 'external_officer'))])
            ->get()
            ->map(fn($org) => [
                'organization_id'   => $org->organization_id,
                'organization_name' => $org->organization_name,
                'abbreviation'      => $org->abbreviation,
                'officers'          => $org->users->map(fn($u) => [
                    'user_id'     => $u->user_id,
                    'full_name'   => $u->full_name,
                    'designation' => $u->designation,
                    'label'       => "{$u->designation}, {$org->organization_name}",
                ]),
            ]);

        return response()->json(['organizations' => $orgs]);
    }

    /**
     * Get subjects/projects for the meeting code dropdown
     */
    public function getSubjects(): JsonResponse
    {
        $subjects = Subject::orderBy('code')->get(['id', 'code', 'title']);
        return response()->json(['subjects' => $subjects]);
    }
}


