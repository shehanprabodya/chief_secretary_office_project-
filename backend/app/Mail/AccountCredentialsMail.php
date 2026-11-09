<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class AccountCredentialsMail extends Mailable
{
    public function __construct(public readonly User $user, public readonly string $temporaryPassword, public readonly string $locale = 'en') {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->locale === 'si' ? 'SPMMS ගිණුම් පිවිසුම් තොරතුරු' : 'SPMMS Account Login Credentials');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.account-credentials', with: ['user' => $this->user, 'temporaryPassword' => $this->temporaryPassword, 'isSinhala' => $this->locale === 'si', 'loginUrl' => rtrim(config('app.frontend_url', config('app.url')), '/')]);
    }
}
