<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\DepartmentHeadRecordController;
use PHPUnit\Framework\TestCase;

class ControllerCapabilitiesTest extends TestCase
{
    public function test_department_head_controller_has_framework_authorization_support(): void
    {
        $controller = new DepartmentHeadRecordController();

        $this->assertTrue(method_exists($controller, 'authorize'));
        $this->assertTrue(method_exists($controller, 'authorizeResource'));
    }
}
