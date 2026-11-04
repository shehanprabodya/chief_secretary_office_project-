<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordChangedMail extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly string $locale
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->locale === 'si'
                ? 'ඔබගේ මුරපදය වෙනස් කර ඇත'
                : 'Your Password Was Changed'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password-changed',
            with: [
                'user' => $this->user,
                'locale' => $this->locale,
            ]
        );
    }
}
