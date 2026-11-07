<?php

namespace App\Http\Controllers\Admin\Business;

use App\Http\Controllers\Controller;
use App\Services\Business\BusinessService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private readonly BusinessService $business) {}

    public function __invoke(): Response
    {
        return Inertia::render('admin/business/DashboardPage', [
            'metrics' => $this->business->dashboard(),
        ]);
    }
}
