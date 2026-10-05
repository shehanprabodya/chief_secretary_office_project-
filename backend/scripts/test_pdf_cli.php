<?php
// Simple script to emit HTML using the local iskpota.ttf font for testing
$fontPath = __DIR__ . '/../../frontend/public/fonts/iskpota.ttf';
if (!is_file($fontPath) || !is_readable($fontPath)) {
    fwrite(STDERR, "Font not found: $fontPath\n");
    exit(2);
}
$fontData = file_get_contents($fontPath);
$fontBase64 = base64_encode($fontData);
$fontFace = "@font-face { font-family: \"Iskoola Pota\"; src: url(\"data:font/ttf;base64,$fontBase64\") format(\"truetype\"); font-style: normal; font-weight: 400; font-display: block; unicode-range: U+0D80-0DFF; }";
$lines = file(__DIR__ . '/../tests/Fixtures/sinhala-letter-pdf.txt', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
if ($lines === false) {
    fwrite(STDERR, "Failed to read fixture lines\n");
    exit(3);
}
$body = '';
foreach ($lines as $line) {
    $body .= '<p>' . htmlspecialchars($line, ENT_HTML5 | ENT_SUBSTITUTE, 'UTF-8') . '</p>' . "\n";
}
$html = "<!doctype html><html><head><meta charset=\"utf-8\"><style>$fontFace body{font-family: 'Iskoola Pota', sans-serif; font-size: 12pt;}</style></head><body><div class=\"letter-page\">$body</div></body></html>";
// Output HTML to stdout so caller can pipe into renderer
fwrite(STDOUT, $html);
