<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;
use Throwable;

/**
 * Render official letter HTML with Chromium so the PDF uses browser-grade
 * OpenType shaping and the exact Iskoola Pota font embedded in the HTML.
 */
class LetterPdfService
{
    public function fontFaceCss(): string
    {
        $fontDirectory = base_path('../frontend/public/fonts');
        $faces = [];

        foreach ([400 => 'iskpota.ttf', 700 => 'iskpotab.ttf'] as $weight => $filename) {
            $fontPath = $fontDirectory . DIRECTORY_SEPARATOR . $filename;
            if (!is_file($fontPath) || !is_readable($fontPath)) {
                if ($weight === 400) {
                    throw new RuntimeException('The bundled regular Iskoola Pota font is missing or unreadable.');
                }

                continue;
            }

            $fontData = file_get_contents($fontPath);
            if ($fontData === false) {
                throw new RuntimeException('Failed to read bundled Iskoola Pota font: ' . $filename);
            }

            $faces[] = '@font-face { font-family: "Iskoola Pota"; src: url("data:font/ttf;base64,'
                . base64_encode($fontData)
                . '") format("truetype"); font-style: normal; font-weight: ' . $weight
                . '; font-display: block; unicode-range: U+0D80-0DFF, U+200C-200D, U+111E0-111FF; }';
        }

        return implode("\n", $faces);
    }

    public function generate(string $html): string
    {
        $scriptPath = base_path('scripts/render-letter-pdf.mjs');
        if (!is_file($scriptPath)) {
            throw new RuntimeException('The letter PDF renderer script is missing.');
        }

        $environment = [
            'LETTER_PDF_CHROMIUM_PATH' => config('services.letter_pdf.chromium_path'),
            'PLAYWRIGHT_BROWSERS_PATH' => config('services.letter_pdf.browsers_path'),
        ];

        $process = new Process(
            [config('services.letter_pdf.node_binary', 'node'), $scriptPath],
            base_path(),
            $environment,
        );
        $process->setInput($html);
        $process->setTimeout(config('services.letter_pdf.timeout', 75));

        try {
            $process->run();
        } catch (ProcessTimedOutException $exception) {
            throw new RuntimeException('The Chromium letter PDF renderer timed out.', previous: $exception);
        } catch (Throwable $exception) {
            throw new RuntimeException('The Chromium letter PDF renderer could not start.', previous: $exception);
        }

        if (!$process->isSuccessful()) {
            $details = trim($process->getErrorOutput());
            throw new RuntimeException(
                $details !== ''
                    ? 'The Chromium letter PDF renderer failed: ' . $details
                    : 'The Chromium letter PDF renderer failed.'
            );
        }

        $pdf = $process->getOutput();
        if (!str_starts_with($pdf, '%PDF-')) {
            throw new RuntimeException('Chromium did not return a valid PDF document.');
        }

        return $pdf;
    }

        /**
     * Generate PDF once and reuse it until the HTML content changes.
     */
    public function generateCached(
        int $letterId,
        string $html,
        string $version = '1'
    ): string {
        $hash = hash('sha256', $version . '|' . $html);

        $directory = storage_path('app/private/letters/pdf');

        if (!is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        $path = $directory . "/letter-{$letterId}-{$hash}.pdf";

        // PDF already exists.
        if (is_file($path) && filesize($path) > 0) {
            return $path;
        }

        $pdf = $this->generate($html);

        if (file_put_contents($path, $pdf, LOCK_EX) === false) {
            throw new RuntimeException('Unable to save generated letter PDF.');
        }

        return $path;
    }
}
