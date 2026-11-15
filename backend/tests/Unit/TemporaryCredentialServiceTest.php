<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\TemporaryCredentialService;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class TemporaryCredentialServiceTest extends TestCase
{
    public function test_generated_temporary_password_is_policy_compliant_and_meets_required_character_sets(): void
    {
        $password = app(TemporaryCredentialService::class)->generate();

        $this->assertGreaterThanOrEqual(12, strlen($password));
        $this->assertMatchesRegularExpression('/[a-z]/', $password);
        $this->assertMatchesRegularExpression('/[A-Z]/', $password);
        $this->assertMatchesRegularExpression('/[0-9]/', $password);
        $this->assertMatchesRegularExpression('/[^A-Za-z0-9]/', $password);
    }

    public function test_deliver_returns_logged_for_log_mailer(): void
    {
        Config::set('mail.default', 'log');

        $service = new class extends TemporaryCredentialService {
            public bool $sendCalled = false;

            public function send(User $user, string $temporaryPassword, string $locale): void
            {
                $this->sendCalled = true;
            }
        };
        $user = $this->makeRecipientUser();

        $status = $service->deliver($user, 'TempPass!234', 'en');

        $this->assertSame(TemporaryCredentialService::EMAIL_STATUS_LOGGED, $status);
        $this->assertTrue($service->sendCalled);
    }

    public function test_deliver_returns_not_configured_when_mailer_is_missing(): void
    {
        Config::set('mail.default', 'missing_mailer');

        $service = new class extends TemporaryCredentialService {
            public bool $sendCalled = false;

            public function send(User $user, string $temporaryPassword, string $locale): void
            {
                $this->sendCalled = true;
            }
        };
        $user = $this->makeRecipientUser();

        $status = $service->deliver($user, 'TempPass!234', 'en');

        $this->assertSame(TemporaryCredentialService::EMAIL_STATUS_NOT_CONFIGURED, $status);
        $this->assertFalse($service->sendCalled);
    }

    private function makeRecipientUser(): User
    {
        return new User([
            'full_name' => 'Test Officer',
            'full_name_si' => null,
            'username' => 'test.officer',
            'email' => 'officer@example.com',
            'preferred_locale' => 'en',
        ]);
    }
}
