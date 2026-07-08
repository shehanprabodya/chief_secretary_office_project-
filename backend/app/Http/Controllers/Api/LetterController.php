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
use Symfony\Component\Process\Process;
use Throwable;
use ZipArchive;

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
    public function downloadPdf(int $id): \Symfony\Component\HttpFoundation\Response
    {
        $letter = Letter::with(
            'recipients.organization',
            'recipients.user.organization',
            'subject',
            'creator'
        )->findOrFail($id);

        $html = $this->buildLetterHtml($letter, true); // true = include full page CSS
        $filename = 'letter-' . $letter->letter_id . '-' . now()->format('Ymd') . '.pdf';

        try {
            $path = $this->convertHtmlWithLibreOffice($html, 'pdf');

            return response()->download($path, $filename, [
                'Content-Type' => 'application/pdf',
            ])->deleteFileAfterSend(true);
        } catch (Throwable) {
            // Fallback for environments without a working LibreOffice service.
        }

        // Fallback: Dompdf (composer require dompdf/dompdf)
        $options = new \Dompdf\Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', true);
        $options->set('defaultFont', 'Noto Sans Sinhala');
        $options->setChroot(['/usr/share/fonts', base_path()]);

        $dompdf = new \Dompdf\Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Download as Microsoft Word DOCX.
     */
    public function downloadDocx(int $id): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $letter = Letter::with(
            'recipients.organization',
            'recipients.user.organization',
            'subject',
            'creator'
        )->findOrFail($id);

        $filename = 'letter-' . $letter->letter_id . '-' . now()->format('Ymd') . '.docx';
        $html = $this->buildLetterHtml($letter, true);

        try {
            $path = $this->convertHtmlWithLibreOffice($html, 'docx');
        } catch (Throwable) {
            // Fallback for environments without a working LibreOffice service.
            $path = $this->buildHtmlDocxFile($html);
        }

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);
    }

    private function convertHtmlWithLibreOffice(string $html, string $format): string
    {
        $binary = $this->libreOfficeBinary();

        if (!$binary) {
            throw new \RuntimeException('LibreOffice is not installed.');
        }

        $workDir = sys_get_temp_dir() . '/letter-export-' . uniqid('', true);
        mkdir($workDir, 0775, true);

        $htmlPath = $workDir . '/letter.html';
        $profileDir = $workDir . '/lo-profile';
        mkdir($profileDir, 0775, true);
        file_put_contents($htmlPath, $html);

        $process = new Process([
            $binary,
            '--headless',
            '-env:UserInstallation=file://' . $profileDir,
            '--convert-to',
            $format,
            '--outdir',
            $workDir,
            $htmlPath,
        ]);
        $process->setEnv([
            'HOME' => $workDir,
            'XDG_RUNTIME_DIR' => $workDir,
        ]);
        $process->setTimeout(60);
        $process->run();

        $matches = glob($workDir . '/*.' . $format) ?: [];
        $outputPath = $matches[0] ?? $workDir . '/letter.' . $format;

        if (!file_exists($outputPath)) {
            throw new \RuntimeException(trim($process->getErrorOutput() . "\n" . $process->getOutput()));
        }

        return $outputPath;
    }

    private function libreOfficeBinary(): ?string
    {
        foreach (['/usr/bin/libreoffice', '/usr/bin/soffice'] as $binary) {
            if (is_executable($binary)) {
                return $binary;
            }
        }

        return null;
    }

    private function buildHtmlDocxFile(string $html): string
    {
        $path = tempnam(sys_get_temp_dir(), 'letter-html-docx-');
        $docxPath = $path . '.docx';
        rename($path, $docxPath);

        $zip = new ZipArchive();
        $zip->open($docxPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $zip->addFromString('[Content_Types].xml', <<<'XML'
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
            <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
            <Default Extension="xml" ContentType="application/xml"/>
            <Default Extension="html" ContentType="text/html"/>
            <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>
        XML);

        $zip->addFromString('_rels/.rels', <<<'XML'
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>
        XML);

        $zip->addFromString('word/_rels/document.xml.rels', <<<'XML'
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="letter.html"/>
        </Relationships>
        XML);

        $zip->addFromString('word/document.xml', <<<'XML'
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
            <w:body>
                <w:altChunk r:id="htmlChunk"/>
                <w:sectPr>
                    <w:pgSz w:w="11906" w:h="16838"/>
                    <w:pgMar w:top="1701" w:right="1134" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>
                </w:sectPr>
            </w:body>
        </w:document>
        XML);

        $zip->addFromString('word/letter.html', $html);
        $zip->close();

        return $docxPath;
    }

    private function buildDocxFile(Letter $letter): string
    {
        $path = tempnam(sys_get_temp_dir(), 'letter-docx-');
        $docxPath = $path . '.docx';
        rename($path, $docxPath);

        $date = $letter->signature_date
            ? \Carbon\Carbon::parse($letter->signature_date)->format('Y.m.d')
            : now()->format('Y.m.d');

        $reference = $letter->subject?->code
            ?? $letter->meeting_code
            ?? 'CSS/4/3/77';

        $recipientLines = $letter->recipients->map(function ($r) {
            if ($r->recipient_label) {
                return $r->recipient_label;
            }

            if ($r->user) {
                return trim(($r->user->designation ?? '') . ', ' . ($r->user->organization?->organization_name ?? ''));
            }

            if ($r->organization) {
                return $r->organization->organization_name;
            }

            return null;
        })->filter()->values()->all();

        $title = $this->htmlToText($letter->title ?: ($letter->subject?->title ?? ''));
        $bodyLines = $this->htmlToParagraphs($letter->content ?? '');
        $signatoryName = $letter->signatory_name ?? 'නදීකා සී. මුහන්දිරම්ගේ';
        $designation = $letter->designation ?? 'ප්‍රධාන ලේකම්';

        $documentXml = $this->buildDocxDocumentXml(
            $reference,
            $date,
            $recipientLines,
            $title,
            $bodyLines,
            $signatoryName,
            $designation,
            'දකුණු පළාත'
        );

        $zip = new ZipArchive();
        $zip->open($docxPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $zip->addFromString('[Content_Types].xml', <<<'XML'
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
            <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
            <Default Extension="xml" ContentType="application/xml"/>
            <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>
        XML);

        $zip->addFromString('_rels/.rels', <<<'XML'
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>
        XML);

        $zip->addFromString('word/_rels/document.xml.rels', <<<'XML'
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
        XML);

        $zip->addFromString('word/document.xml', $documentXml);
        $zip->close();

        return $docxPath;
    }

    private function buildDocxDocumentXml(
        string $reference,
        string $date,
        array $recipientLines,
        string $title,
        array $bodyLines,
        string $signatoryName,
        string $designation,
        string $office
    ): string {
        $paragraphs = [];

        $paragraphs[] = $this->docxTwoColumnParagraph($reference, $date);
        $paragraphs[] = $this->docxEmptyParagraph();

        foreach ($recipientLines as $line) {
            $paragraphs[] = $this->docxParagraph($line);
        }

        $paragraphs[] = $this->docxEmptyParagraph();
        $paragraphs[] = $this->docxParagraph($title, [
            'bold' => true,
            'underline' => true,
            'alignment' => 'center',
        ]);
        $paragraphs[] = $this->docxEmptyParagraph();

        foreach ($bodyLines as $index => $line) {
            $text = $index === 0 ? $line : str_pad($index + 1, 2, '0', STR_PAD_LEFT) . '. ' . $line;
            $paragraphs[] = $this->docxParagraph($text, ['alignment' => 'both']);
        }

        $paragraphs[] = $this->docxEmptyParagraph();
        $paragraphs[] = $this->docxEmptyParagraph();
        $paragraphs[] = $this->docxParagraph($signatoryName);
        $paragraphs[] = $this->docxParagraph($designation);
        $paragraphs[] = $this->docxParagraph($office);

        $body = implode('', $paragraphs);

        return <<<XML
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
            <w:body>
                {$body}
                <w:sectPr>
                    <w:pgSz w:w="11906" w:h="16838"/>
                    <w:pgMar w:top="1701" w:right="1134" w:bottom="1417" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/>
                </w:sectPr>
            </w:body>
        </w:document>
        XML;
    }

    private function docxTwoColumnParagraph(string $left, string $right): string
    {
        $left = $this->escapeXml($left);
        $right = $this->escapeXml($right);

        return <<<XML
        <w:p>
            <w:pPr>
                <w:tabs><w:tab w:val="right" w:pos="9360"/></w:tabs>
                <w:spacing w:after="0" w:line="420" w:lineRule="auto"/>
            </w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Noto Sans Sinhala" w:hAnsi="Noto Sans Sinhala" w:cs="Noto Sans Sinhala"/><w:sz w:val="24"/></w:rPr><w:t>{$left}</w:t></w:r>
            <w:r><w:tab/></w:r>
            <w:r><w:rPr><w:rFonts w:ascii="Noto Sans Sinhala" w:hAnsi="Noto Sans Sinhala" w:cs="Noto Sans Sinhala"/><w:sz w:val="24"/></w:rPr><w:t>{$right}</w:t></w:r>
        </w:p>
        XML;
    }

    private function docxParagraph(string $text, array $options = []): string
    {
        $text = $this->escapeXml($text);
        $alignment = $options['alignment'] ?? 'left';
        $bold = !empty($options['bold']) ? '<w:b/>' : '';
        $underline = !empty($options['underline']) ? '<w:u w:val="single"/>' : '';

        return <<<XML
        <w:p>
            <w:pPr>
                <w:jc w:val="{$alignment}"/>
                <w:spacing w:after="160" w:line="420" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
                <w:rPr>
                    <w:rFonts w:ascii="Noto Sans Sinhala" w:hAnsi="Noto Sans Sinhala" w:cs="Noto Sans Sinhala"/>
                    <w:sz w:val="24"/>
                    {$bold}
                    {$underline}
                </w:rPr>
                <w:t xml:space="preserve">{$text}</w:t>
            </w:r>
        </w:p>
        XML;
    }

    private function docxEmptyParagraph(): string
    {
        return '<w:p><w:r><w:t></w:t></w:r></w:p>';
    }

    private function escapeXml(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
    }

    private function htmlToText(string $html): string
    {
        return html_entity_decode(trim(strip_tags($html)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    private function htmlToParagraphs(string $html): array
    {
        $html = trim($html);

        if ($html === '') {
            return [];
        }

        $normalized = preg_replace('/<\/(p|div|h[1-6]|li|tr)>/i', "</$1>\n", $html) ?? $html;
        $text = $this->htmlToText($normalized);

        return collect(preg_split("/\r\n|\n|\r/", $text))
            ->map(fn ($line) => trim($line))
            ->filter()
            ->values()
            ->all();
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

        $fontFace = file_exists('/usr/share/fonts/truetype/noto/NotoSansSinhala-Regular.ttf')
            ? '@font-face {
                    font-family: "Noto Sans Sinhala";
                    font-style: normal;
                    font-weight: normal;
                    src: url("file:///usr/share/fonts/truetype/noto/NotoSansSinhala-Regular.ttf") format("truetype");
                }'
            : '';

        $css = '
            <style>
                ' . $fontFace . '

                @page {
                    size: A4;
                    /* Keep clear space for printer-supplied headers and footers. */
                    margin: 30mm 20mm 25mm 30mm;
                }

                .letter-page {
                    font-family: "Noto Sans Sinhala", "DejaVu Sans", sans-serif;
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
