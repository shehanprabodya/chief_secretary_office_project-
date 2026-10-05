<?php

namespace Tests\Feature;

use App\Services\LetterPdfService;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class LetterPdfRenderingTest extends TestCase
{
    public function test_sinhala_letter_pdf_uses_embedded_iskoola_pota_and_preserves_test_text(): void
    {
        $fontPath = base_path('../frontend/public/fonts/Iskoola Pota Regular.ttf');
        $fixturePath = base_path('tests/Fixtures/sinhala-letter-pdf.txt');

        $this->assertFileIsReadable($fontPath);
        $fixtureLines = file($fixturePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $this->assertIsArray($fixtureLines);

        $standalone = true;
        $fontFace = app(LetterPdfService::class)->fontFaceCss();
        $subjectCode = 'CS-01';
        $date = '2026.10.04';
        $recipientLines = collect(['ගාල්ල දිස්ත්‍රික් සෞඛ්‍ය සේවා දෙපාර්තමේන්තුව']);
        $titleHtml = 'ප්‍රතිසංස්කරණ ව්‍යාපෘතිය';
        $bodyHtml = collect($fixtureLines)
            ->map(fn (string $line) => '<p>' . e($line) . '</p>')
            ->implode('');
        $signatoryName = 'ප්‍රධාන ලේකම්';
        $designation = 'ප්‍රධාන ලේකම්';
        $office = 'කාර්යාලය';
        $html = view('letters.document', compact(
            'standalone',
            'fontFace',
            'subjectCode',
            'date',
            'recipientLines',
            'titleHtml',
            'bodyHtml',
            'signatoryName',
            'designation',
            'office',
        ))->render();
        $requestedHtmlPath = getenv('LETTER_PDF_TEST_HTML_OUTPUT') ?: null;
        if ($requestedHtmlPath) {
            $this->assertNotFalse(file_put_contents($requestedHtmlPath, $html));
        }

        $pdf = app(LetterPdfService::class)->generate($html);
        $this->assertStringStartsWith('%PDF-', $pdf);

        $requestedOutputPath = getenv('LETTER_PDF_TEST_OUTPUT') ?: null;
        $temporaryPdf = $requestedOutputPath ?: tempnam(sys_get_temp_dir(), 'sinhala-letter-test-');
        $this->assertIsString($temporaryPdf);

        try {
            $this->assertNotFalse(file_put_contents($temporaryPdf, $pdf));

            $fontProcess = new Process(['pdffonts', $temporaryPdf]);
            $fontProcess->setTimeout(15);
            $fontProcess->mustRun();
            $fontList = $fontProcess->getOutput();
            $this->assertMatchesRegularExpression('/Iskoola\s*Pota/i', $fontList);
            $this->assertDoesNotMatchRegularExpression('/Noto Sans Sinhala|DejaVu Sans/i', $fontList);

            $infoProcess = new Process(['pdfinfo', $temporaryPdf]);
            $infoProcess->setTimeout(15);
            $infoProcess->mustRun();
            $this->assertMatchesRegularExpression('/Page size:.*\(A4\)/i', $infoProcess->getOutput());

            $textProcess = new Process(['pdftotext', '-enc', 'UTF-8', $temporaryPdf, '-']);
            $textProcess->setTimeout(15);
            $textProcess->mustRun();
            $extractedText = $textProcess->getOutput();

            foreach ([
                'දිස්ත්‍රික් සෞඛ්‍ය සේවා අධ්‍යක්ෂ, ගාල්ල දිස්ත්‍රික් සෞඛ්‍ය සේවා දෙපාර්තමේන්තුව',
                'දිස්ත්‍රික් සෞඛ්‍ය සේවා අධ්‍යක්ෂ',
                'ගාල්ල දිස්ත්‍රික් සෞඛ්‍ය සේවා දෙපාර්තමේන්තුව',
                'ශ්‍රී ලංකාව',
                'ප්‍රධාන ලේකම්',
                'කාර්යාලය',
                'ප්‍රතිසංස්කරණ ව්‍යාපෘතිය',
                'සංවර්ධන',
                'කාර්ය සාධනය',
                'අධ්‍යාපන',
                'ව්‍යාපෘති',
                'ක්‍රියාමාර්ග',
                'ප්‍රගතිය',
            ] as $expectedText) {
                $this->assertStringContainsString($expectedText, $extractedText);
            }
        } finally {
            if (!$requestedOutputPath) {
                @unlink($temporaryPdf);
            }
        }
    }
}
