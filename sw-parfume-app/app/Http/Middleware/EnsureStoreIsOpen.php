<?php

namespace App\Http\Middleware;

use App\Services\Business\BusinessService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

class EnsureStoreIsOpen
{
    public function __construct(private readonly BusinessService $business) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->routeIs('business.utility.*', 'logout')) {
            return $next($request);
        }

        $operationalDate = $this->business->operationalDate()->startOfDay();

        if ($operationalDate->lt(Carbon::today())) {
            return redirect()
                ->route('business.utility.index')
                ->with('error', "Toko tanggal {$operationalDate->format('d/m/Y')} belum ditutup. Tutup toko terlebih dahulu untuk melanjutkan.");
        }

        return $next($request);
    }
}
