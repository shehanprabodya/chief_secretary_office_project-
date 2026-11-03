<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function assertNotStringContainsString(string $needle, string $haystack, string $message = ''): void
    {
        $this->assertFalse(
            str_contains($haystack, $needle),
            $message !== '' ? $message : "Failed asserting that '{$haystack}' does not contain '{$needle}'."
        );
    }
}
