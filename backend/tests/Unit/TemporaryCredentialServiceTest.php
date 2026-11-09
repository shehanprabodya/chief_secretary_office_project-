<?php

namespace Tests\Unit;

use App\Services\TemporaryCredentialService;
use Tests\TestCase;

class TemporaryCredentialServiceTest extends TestCase
{
    public function test_generated_temporary_password_is_exactly_eight_characters_and_meets_required_character_sets(): void
    {
        $password = app(TemporaryCredentialService::class)->generate();

        $this->assertSame(8, strlen($password));
        $this->assertMatchesRegularExpression('/[a-z]/', $password);
        $this->assertMatchesRegularExpression('/[A-Z]/', $password);
        $this->assertMatchesRegularExpression('/[0-9]/', $password);
        $this->assertMatchesRegularExpression('/[^A-Za-z0-9]/', $password);
    }
}
