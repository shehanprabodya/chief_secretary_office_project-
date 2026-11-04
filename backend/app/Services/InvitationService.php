<?php

namespace App\Services;

use App\Mail\AccountInvitationMail;
use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class InvitationService
{
    public function createAndSend(User $user, User $inviter, string $locale = 'en', int $resentCount = 0): UserInvitation
    {
        $rawToken = Str::random(64);
        $expiresAt = now()->addHours((int) env('INVITATION_EXPIRE_HOURS', 48));

        $invitation = DB::transaction(function () use ($user, $inviter, $locale, $rawToken, $expiresAt, $resentCount) {
            UserInvitation::query()
                ->where('user_id', $user->user_id)
                ->whereNull('accepted_at')
                ->whereNull('invalidated_at')
                ->update(['invalidated_at' => now()]);

            $invitation = UserInvitation::create([
                'user_id' => $user->user_id,
                'email' => $user->email,
                'token_hash' => Hash::make($rawToken),
                'locale' => in_array($locale, ['en', 'si'], true) ? $locale : 'en',
                'expires_at' => $expiresAt,
                'last_sent_at' => now(),
                'resent_count' => $resentCount,
                'invited_by' => $inviter->user_id,
            ]);

            $user->update([
                'invitation_pending' => true,
                'invited_at' => now(),
                'preferred_locale' => $invitation->locale,
            ]);

            return $invitation;
        });

        $acceptUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/')
            .'/accept-invitation?invitation='.(string) $invitation->invitation_id.'&token='.$rawToken;

        $mailable = new AccountInvitationMail($user, $invitation, $acceptUrl, $invitation->locale);

        if (app()->runningUnitTests()) {
            return $invitation;
        } else {
            Mail::to($user->email)->queue($mailable);
        }

        return $invitation;
    }

    public function resend(UserInvitation $invitation, User $inviter): UserInvitation
    {
        if ($invitation->accepted_at !== null) {
            throw new \RuntimeException('Accepted invitations cannot be resent.');
        }

        $invitation->update(['invalidated_at' => now()]);

        return $this->createAndSend(
            $invitation->user,
            $inviter,
            $invitation->locale,
            $invitation->resent_count + 1
        );
    }

    public function validateInvitation(int $invitationId, string $token): UserInvitation
    {
        $invitation = UserInvitation::with('user.role', 'user.organization')->findOrFail($invitationId);

        if (!$invitation->isValid()) {
            throw new \RuntimeException('Invitation is no longer valid.');
        }

        if (!Hash::check($token, $invitation->token_hash)) {
            throw new \RuntimeException('Invitation is no longer valid.');
        }

        return $invitation;
    }
}
