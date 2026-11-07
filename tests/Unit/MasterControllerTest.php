<?php

namespace Tests\Unit;

use App\Http\Controllers\Admin\Business\MasterController;
use App\Services\Business\BusinessService;
use PHPUnit\Framework\TestCase;

class MasterControllerTest extends TestCase
{
    public function test_gudang_tipe_field_uses_select_options(): void
    {
        $controller = new MasterController($this->createMock(BusinessService::class));
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('fields');

        $fields = $method->invoke($controller, 'gudang');
        $tipeField = collect($fields)->firstWhere('name', 'tipe_gudang');

        $this->assertNotNull($tipeField);
        $this->assertSame('select', $tipeField['type']);
        $this->assertSame(['BIBIT', 'BOTOL'], $tipeField['options']);
    }

    public function test_supplier_field_includes_gudang_selection(): void
    {
        $controller = new MasterController($this->createMock(BusinessService::class));
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('fields');

        $fields = $method->invoke($controller, 'supplier');
        $tipeField = collect($fields)->firstWhere('name', 'tipe_gudang');
        $gudangField = collect($fields)->firstWhere('name', 'id_gudang');

        $this->assertNotNull($tipeField);
        $this->assertSame('select', $tipeField['type']);
        $this->assertSame(['BIBIT', 'BOTOL'], $tipeField['options']);

        $this->assertNotNull($gudangField);
        $this->assertSame('select', $gudangField['type']);
        $this->assertSame('gudang', $gudangField['optionsRef']);
    }

    public function test_supplier_refs_include_active_gudang_options(): void
    {
        $controller = new MasterController($this->createMock(BusinessService::class));
        $reflection = new \ReflectionClass($controller);
        $method = $reflection->getMethod('refs');

        $refs = $method->invoke($controller, 'supplier');

        $this->assertArrayHasKey('gudang', $refs);
        $this->assertNotEmpty($refs['gudang']);
    }
}
