<?php

namespace App\Services;

use App\Mail\AccountCredentialsMail;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class TemporaryCredentialService
{
    public const EMAIL_STATUS_SENT = 'sent';
    public const EMAIL_STATUS_LOGGED = 'logged';
    public const EMAIL_STATUS_FAILED = 'failed';
    public const EMAIL_STATUS_NOT_CONFIGURED = 'not_configured';

    /** Policy-compliant password (min 12 chars) using random_int backed by CSPRNG. */
    public function generate(): string
    {
        $sets = ['abcdefghjkmnpqrstuvwxyz', 'ABCDEFGHJKMNPQRSTUVWXYZ', '23456789', '!@#$%&*?'];
        $characters = '';
        foreach ($sets as $set) $characters .= $set[random_int(0, strlen($set) - 1)];
        $all = implode('', $sets);
        while (strlen($characters) < 12) $characters .= $all[random_int(0, strlen($all) - 1)];
        for ($i = strlen($characters) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$characters[$i], $characters[$j]] = [$characters[$j], $characters[$i]];
        }
        return $characters;
    }

    public function rotate(User $user, string $locale = 'en'): string
    {
        $password = $this->generate();
        $user->update(['password_hash' => Hash::make($password), 'must_change_password' => true, 'password_changed_at' => null, 'invitation_pending' => false, 'invited_at' => null, 'preferred_locale' => $locale]);
        $user->tokens()->delete();
        return $password;
    }

    public function send(User $user, string $temporaryPassword, string $locale): void
    {
        Mail::to($user->email)->send(new AccountCredentialsMail($user, $temporaryPassword, $locale));
    }

    /**
     * Attempt to send credentials and report delivery semantics for the active mail transport.
     */
    public function deliver(User $user, string $temporaryPassword, string $locale): string
    {
        $statusOnSuccess = $this->resolveStatusOnSuccessfulDispatch();

        if ($statusOnSuccess === self::EMAIL_STATUS_NOT_CONFIGURED) {
            return self::EMAIL_STATUS_NOT_CONFIGURED;
        }

        $this->send($user, $temporaryPassword, $locale);

        return $statusOnSuccess;
    }

    private function resolveStatusOnSuccessfulDispatch(): string
    {
        $defaultMailer = (string) config('mail.default', '');
        if ($defaultMailer === '') {
            return self::EMAIL_STATUS_NOT_CONFIGURED;
        }

        $mailerConfig = config("mail.mailers.{$defaultMailer}");
        if (!is_array($mailerConfig)) {
            return self::EMAIL_STATUS_NOT_CONFIGURED;
        }

        return $this->resolveStatusFromMailerConfig($mailerConfig);
    }

    private function resolveStatusFromMailerConfig(array $mailerConfig): string
    {
        $transport = (string) ($mailerConfig['transport'] ?? '');

        if ($transport === '') {
            return self::EMAIL_STATUS_NOT_CONFIGURED;
        }

        if ($this->isNonDeliveryTransport($transport)) {
            return self::EMAIL_STATUS_LOGGED;
        }

        if (in_array($transport, ['failover', 'roundrobin'], true)) {
            $nestedMailers = $mailerConfig['mailers'] ?? [];
            if (!is_array($nestedMailers) || $nestedMailers === []) {
                return self::EMAIL_STATUS_NOT_CONFIGURED;
            }

            $hasLoggedOnly = false;

            foreach ($nestedMailers as $mailerName) {
                $nestedConfig = config('mail.mailers.' . $mailerName);
                if (!is_array($nestedConfig)) {
                    continue;
                }

                $nestedStatus = $this->resolveStatusFromMailerConfig($nestedConfig);
                if ($nestedStatus === self::EMAIL_STATUS_SENT) {
                    return self::EMAIL_STATUS_SENT;
                }

                if ($nestedStatus === self::EMAIL_STATUS_LOGGED) {
                    $hasLoggedOnly = true;
                }
            }

            return $hasLoggedOnly ? self::EMAIL_STATUS_LOGGED : self::EMAIL_STATUS_NOT_CONFIGURED;
        }

        return self::EMAIL_STATUS_SENT;
    }

    private function isNonDeliveryTransport(string $transport): bool
    {
        $nonDelivery = config('mail.non_delivery_mailers', ['log', 'array']);

        return in_array($transport, is_array($nonDelivery) ? $nonDelivery : ['log', 'array'], true);
    }
}
