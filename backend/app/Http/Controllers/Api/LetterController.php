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
        $meeting = null;

        if ($request->filled('meeting_code')) {
            $meeting = Meeting::where('meeting_code', $request->meeting_code)->first();

            if (!$meeting && !$request->filled('subject_id')) {
                return response()->json([
                    'message' => 'Selected meeting code does not exist. Please choose a valid subject or leave the meeting code empty.',
                ], 422);
            }
        }

        $data = [
            'sender_name'    => 'දකුණු පළාත් ප්‍රධාන ලේකම් කාර්යාලය',
            'meeting_code'   => $meeting?->meeting_code,
            'meeting_id'     => $meeting?->meeting_id,
            'subject_id'     => $request->subject_id,
            'title'          => $request->title ?? '',
            'content'        => $request->content ?? '',
            'designation'    => $request->designation ?? 'ප්‍රධාන ලේකම්',
            'signatory_name' => $request->signatory_name,
            'signature_date' => $request->signature_date,
            'status'         => 'draft',
            'created_by'     => $user->user_id,
        ];

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
            ? \Carbon\Carbon::parse($letter->signature_date)->format('Y.m.d')
            : now()->format('Y.m.d');

        $reference = $letter->subject?->code
            ?? $letter->meeting_code
            ?? 'CSS/4/3/77';

        $recipientsHtml = $letter->recipients->map(function ($r) {
            if ($r->recipient_label) {
                return e($r->recipient_label);
            }

            if ($r->user) {
                return e(trim(($r->user->designation ?? '') . ', ' . ($r->user->organization?->organization_name ?? '')));
            }

            if ($r->organization) {
                return e($r->organization->organization_name);
            }

            return null;
        })->filter()->map(fn ($line) => "<div>{$line}</div>")->implode('');

        $title = $letter->title ?? $letter->subject?->title ?? '';
        $titleHtml = $title !== strip_tags($title) ? $title : e($title);

        $content = $letter->content ?? '';
        $hasHtml = $content !== strip_tags($content);

        $bodyHtml = $hasHtml
            ? $content
            : collect(preg_split("/\r\n|\n|\r/", trim($content)))
                ->filter()
                ->values()
                ->map(function ($paragraph, $index) {
                    $number = $index === 0 ? '' : str_pad($index + 1, 2, '0', STR_PAD_LEFT) . '. ';
                    return '<p>' . $number . e($paragraph) . '</p>';
                })
                ->implode('');

        $signatoryName = e($letter->signatory_name ?? 'නදීකා සී. මුහන්දිරම්ගේ');
        $designation = e($letter->designation ?? 'ප්‍රධාන ලේකම්');
        $office = 'දකුණු පළාත';

        $css = '
            <style>
                @page {
                    size: A4;
                    /* Keep clear space for printer-supplied headers and footers. */
                    margin: 30mm 20mm 25mm 30mm;
                }

                .letter-page {
                    font-family: "DejaVu Sans", sans-serif;
                    font-size: 12pt;
                    line-height: 1.75;
                    color: #000;
                    width: 100%;
                    box-sizing: border-box;
                }

                .letterhead-meta {
                    width: 100%;
                    margin-bottom: 22px;
                    border-collapse: collapse;
                }

                .letterhead-meta td {
                    width: 50%;
                    padding: 0;
                    vertical-align: top;
                }

                .letterhead-date {
                    text-align: right;
                }

                .recipients {
                    margin-bottom: 22px;
                }

                .subject {
                    font-weight: bold;
                    text-align: center;
                    text-decoration: underline;
                    margin: 22px 0;
                }

                .subject p {
                    margin: 0;
                }

                .body {
                    text-align: justify;
                }

                .body p {
                    margin: 0 0 14px 0;
                }

                .signature {
                    margin-top: 42px;
                }

                .signature p {
                    margin: 0;
                }
            </style>
        ';

        $wrapStart = $standalone
            ? "<!DOCTYPE html><html><head><meta charset='UTF-8'>{$css}</head><body>"
            : $css;

        $wrapEnd = $standalone ? '</body></html>' : '';

        return <<<HTML
    {$wrapStart}
    <div class="letter-page">
        <table class="letterhead-meta" role="presentation">
            <tr>
                <td class="letterhead-reference">{$reference}</td>
                <td class="letterhead-date">{$date}</td>
            </tr>
        </table>

        <div class="recipients">
            {$recipientsHtml}
        </div>

        <div class="subject">
            {$titleHtml}
        </div>

        <div class="body">
            {$bodyHtml}
        </div>

        <div class="signature">
            <p>{$signatoryName}</p>
            <p>{$designation}</p>
            <p>{$office}</p>
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
