<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Letter;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class MeetingLetterMail extends Mailable
{
    use Queueable, SerializesModels;

    public Letter $letter;
    public ?string $pdfPath = null;
    public string $pdfFilename = '';

    /**
     * Create a new message instance.
     */
    public function __construct(Letter $letter, ?string $pdfPath = null, ?string $pdfFilename = null)
    {
        $this->letter = $letter;
        $this->pdfPath = $pdfPath;
        $this->pdfFilename = $pdfFilename ?? ('letter-' . $letter->letter_id . '-' . now()->format('Ymd') . '.pdf');
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Meeting Letter Mail',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.meeting_letter',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        if ($this->pdfPath && is_file($this->pdfPath)) {
            return [Attachment::fromPath($this->pdfPath)->as($this->pdfFilename)->withMime('application/pdf')];
        }

        return [];
    }

    /**
     * Fallback to build for older Laravel mail chain compatibility
     */
    public function build()
    {
        $mail = $this->subject($this->letter->title ?? 'Meeting Letter')
            ->view('emails.meeting_letter', ['letter' => $this->letter]);

        if ($this->pdfPath && is_file($this->pdfPath)) {
            $mail->attach($this->pdfPath, [
                'as' => $this->pdfFilename,
                'mime' => 'application/pdf',
            ]);
        }

        return $mail;
    }
}
