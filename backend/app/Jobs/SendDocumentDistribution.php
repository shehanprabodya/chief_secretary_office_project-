<?php

namespace App\Jobs;

use App\Mail\OfficialDocumentMail;
use App\Models\DocumentSignature;
use App\Models\EmailDistribution;
use App\Models\Letter;
use App\Models\MeetingMinute;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendDocumentDistribution implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    public int $tries = 3;
    public int $timeout = 120;
    public array $backoff = [30, 120, 600];

    public function __construct(public readonly int $distributionId) {}

    public function handle(): void
    {
        $distribution = EmailDistribution::query()->lockForUpdate()->find($this->distributionId);
        if (!$distribution || in_array($distribution->status, ['sending', 'sent'], true)) return;

        $distribution->update(['status' => 'sending', 'attempt_count' => $distribution->attempt_count + 1, 'last_attempted_at' => now(), 'error_details' => null]);
        $class = $distribution->document_type === 'letter' ? Letter::class : MeetingMinute::class;
        $key = $distribution->document_type === 'letter' ? 'letter_id' : 'minute_id';
        $relations = $distribution->document_type === 'minute'
            ? ['meeting', 'decisions', 'actionItems.responsibleOfficer']
            : ['meeting'];
        $document = $class::with($relations)->findOrFail($distribution->document_id);
        if ($document->status !== 'approved' && !($distribution->document_type === 'letter' && $document->status === 'dispatched')) throw new \RuntimeException('Only approved documents may be distributed.');

        $signature = DocumentSignature::query()->where('document_type', $distribution->document_type)->where('document_id', $document->$key)->latest('signed_at')->first();
        $path = $signature?->signed_pdf_path ? storage_path('app/'.$signature->signed_pdf_path) : null;
        if (!$path || !is_file($path) || ($signature->signed_pdf_sha256 && !hash_equals($signature->signed_pdf_sha256, hash_file('sha256', $path)))) throw new \RuntimeException('The final signed PDF is unavailable or invalid.');

        $filename = ($distribution->document_type === 'letter' ? 'official-meeting-invitation-' : 'approved-minutes-').$document->$key.'.pdf';
        $locale = $distribution->recipientUser?->preferred_locale ?? 'en';
        Mail::to($distribution->recipient_email)->send(new OfficialDocumentMail($document, $distribution->document_type, $path, $filename, $locale));
        $distribution->update(['status' => 'sent', 'processed_at' => now(), 'error_details' => null]);
        if ($distribution->document_type === 'letter') $document->update(['status' => 'dispatched']);
    }

    public function failed(\Throwable $exception): void
    {
        EmailDistribution::query()->whereKey($this->distributionId)->update(['status' => 'failed', 'error_details' => str($exception->getMessage())->limit(1000), 'last_attempted_at' => now()]);
    }
}
