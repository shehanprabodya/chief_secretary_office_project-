<?php

namespace App\Services;

use App\Mail\AccountCredentialsMail;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class TemporaryCredentialService
{
    /** Eight characters with lower/upper/digit/symbol, using random_int backed by CSPRNG. */
    public function generate(): string
    {
        $sets = ['abcdefghjkmnpqrstuvwxyz', 'ABCDEFGHJKMNPQRSTUVWXYZ', '23456789', '!@#$%&*?'];
        $characters = '';
        foreach ($sets as $set) $characters .= $set[random_int(0, strlen($set) - 1)];
        $all = implode('', $sets);
        while (strlen($characters) < 8) $characters .= $all[random_int(0, strlen($all) - 1)];
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
}
