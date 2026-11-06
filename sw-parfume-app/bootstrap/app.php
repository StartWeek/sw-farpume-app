<?php

use App\Http\Middleware\EnsureStoreIsOpen;
use App\Http\Middleware\EnsureUserHasMenuAccess;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\PreventSqlInjection;
use App\Http\Middleware\PreventXss;
use App\Http\Middleware\VerifyRequestSignature;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            'login',
            'admin/logout',
        ]);

        $middleware->alias([
            'request.signature' => VerifyRequestSignature::class,
            'sql.injection.guard' => PreventSqlInjection::class,
            'xss.guard' => PreventXss::class,
            'menu.access' => EnsureUserHasMenuAccess::class,
            'store.open' => EnsureStoreIsOpen::class,
        ]);

        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (ThrottleRequestsException $e, $request) {
            if ($request->is('login')) {
                return back()->withErrors([
                    'login' => 'Terlalu banyak percobaan. Harap tunggu 1 menit.',
                ]);
            }
        });
    })->create();
