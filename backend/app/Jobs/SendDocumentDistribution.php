<?php

namespace App\Jobs;

use App\Http\Controllers\Api\LetterController;
use App\Mail\OfficialDocumentMail;
use App\Models\DocumentSignature;
use App\Models\EmailDistribution;
use App\Models\Letter;
use App\Models\MeetingMinute;
use App\Services\LetterPdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

class SendDocumentDistribution implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 120;
    public array $backoff = [30, 120, 600];

    public function __construct(
        public readonly int $distributionId
    ) {}

    public function handle(): void
    {
        $distribution = EmailDistribution::query()
            ->lockForUpdate()
            ->find($this->distributionId);

        if (
            !$distribution ||
            in_array($distribution->status, ['sending', 'sent'], true)
        ) {
            return;
        }

        $distribution->update([
            'status' => 'sending',
            'attempt_count' => $distribution->attempt_count + 1,
            'last_attempted_at' => now(),
            'error_details' => null,
        ]);

        $isLetter = $distribution->document_type === 'letter';

        $class = $isLetter ? Letter::class : MeetingMinute::class;
        $key = $isLetter ? 'letter_id' : 'minute_id';

        $relations = $isLetter
            ? [
                'meeting',
                'recipients.organization',
                'recipients.user.organization',
                'subject',
                'creator',
            ]
            : [
                'meeting',
                'decisions',
                'actionItems.responsibleOfficer',
            ];

        $document = $class::with($relations)
            ->findOrFail($distribution->document_id);

        if (
            $document->status !== 'approved' &&
            !($isLetter && $document->status === 'dispatched')
        ) {
            throw new RuntimeException(
                'Only approved documents may be distributed.'
            );
        }

        /*
         * Validate the original signed PDF.
         * This file is never modified by the email-letterhead feature.
         */
        $signature = DocumentSignature::query()
            ->where('document_type', $distribution->document_type)
            ->where('document_id', $document->$key)
            ->latest('signed_at')
            ->first();

        $signedPdfPath = $signature?->signed_pdf_path
            ? storage_path('app/' . $signature->signed_pdf_path)
            : null;

        if (
            !$signedPdfPath ||
            !is_file($signedPdfPath) ||
            (
                $signature->signed_pdf_sha256 &&
                !hash_equals(
                    $signature->signed_pdf_sha256,
                    hash_file('sha256', $signedPdfPath)
                )
            )
        ) {
            throw new RuntimeException(
                'The final signed PDF is unavailable or invalid.'
            );
        }

        $attachmentPath = $signedPdfPath;
        $temporaryEmailPdfPath = null;

        $filename = (
            $isLetter
                ? 'official-meeting-invitation-'
                : 'approved-minutes-'
        ) . $document->$key . '.pdf';

        /*
         * LETTER:
         * Generate a separate PDF containing the official letterhead.
         *
         * MINUTES:
         * Continue attaching the existing signed PDF.
         */
        try {
            if ($isLetter) {
                $letterController = app(LetterController::class);

                $emailHtml = $letterController->renderSignedLetterHtml(
                    $document,
                    true,
                    false,
                    true
                );

                $emailPdf = app(LetterPdfService::class)
                    ->generate($emailHtml);

                $temporaryDirectory = storage_path(
                    'app/private/email-pdfs'
                );

                if (
                    !is_dir($temporaryDirectory) &&
                    !mkdir($temporaryDirectory, 0775, true) &&
                    !is_dir($temporaryDirectory)
                ) {
                    throw new RuntimeException(
                        'Unable to create temporary email PDF directory.'
                    );
                }

                $temporaryEmailPdfPath = $temporaryDirectory
                    . '/letter-email-'
                    . $document->letter_id
                    . '-'
                    . bin2hex(random_bytes(8))
                    . '.pdf';

                if (
                    file_put_contents(
                        $temporaryEmailPdfPath,
                        $emailPdf,
                        LOCK_EX
                    ) === false
                ) {
                    throw new RuntimeException(
                        'Unable to save the email letter PDF.'
                    );
                }

                $attachmentPath = $temporaryEmailPdfPath;
            }

            $locale = $distribution->recipientUser?->preferred_locale ?? 'en';

            Mail::to($distribution->recipient_email)->send(
                new OfficialDocumentMail(
                    $document,
                    $distribution->document_type,
                    $attachmentPath,
                    $filename,
                    $locale
                )
            );
        } finally {
            /*
             * Delete only the temporary email PDF.
             * Never delete the original signed PDF.
             */
            if (
                $temporaryEmailPdfPath &&
                is_file($temporaryEmailPdfPath)
            ) {
                @unlink($temporaryEmailPdfPath);
            }
        }

        $distribution->update([
            'status' => 'sent',
            'processed_at' => now(),
            'error_details' => null,
        ]);

        if ($isLetter) {
            $document->update([
                'status' => 'dispatched',
            ]);
        }
    }

    public function failed(\Throwable $exception): void
    {
        EmailDistribution::query()
            ->whereKey($this->distributionId)
            ->update([
                'status' => 'failed',
                'error_details' => str($exception->getMessage())->limit(1000),
                'last_attempted_at' => now(),
            ]);
    }
}