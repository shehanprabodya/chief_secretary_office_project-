<?php

namespace App\Mail;

use App\Models\Letter;
use App\Models\MeetingMinute;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OfficialDocumentMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Letter|MeetingMinute $document,
        public readonly string $documentType,
        public readonly string $pdfPath,
        public readonly string $filename,
        public readonly string $locale = 'en',
    ) {}

    public function envelope(): Envelope
    {
        $meeting = $this->document->meeting;
        $subject = $this->documentType === 'letter'
            ? 'Official Meeting Invitation – '.($meeting?->title ?? $this->document->title ?? 'Meeting')
            : 'Approved Minutes of Meeting – '.($meeting?->title ?? 'Meeting').' – '.($meeting?->meeting_date?->format('Y-m-d') ?? '');
        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(view: $this->documentType === 'letter' ? 'emails.official-letter' : 'emails.official-minutes', with: ['document' => $this->document, 'meeting' => $this->document->meeting, 'isSinhala' => $this->locale === 'si']);
    }

    public function attachments(): array
    {
        return [Attachment::fromPath($this->pdfPath)->as($this->filename)->withMime('application/pdf')];
    }
}
