<?php

namespace App\Mail;

use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountInvitationMail extends Mailable implements ShouldQueue
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly UserInvitation $invitation,
        public readonly string $acceptUrl,
        public readonly string $locale
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->locale === 'si'
                ? 'SPMMS ගිණුම් ආරාධනය'
                : 'SPMMS Account Invitation'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account-invitation',
            with: [
                'user' => $this->user,
                'invitation' => $this->invitation,
                'acceptUrl' => $this->acceptUrl,
                'locale' => $this->locale,
            ]
        );
    }
}
