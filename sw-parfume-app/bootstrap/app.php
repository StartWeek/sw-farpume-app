<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            'login',
            'admin/logout',
        ]);

        $middleware->alias([
            'request.signature' => \App\Http\Middleware\VerifyRequestSignature::class,
            'sql.injection.guard' => \App\Http\Middleware\PreventSqlInjection::class,
            'xss.guard' => \App\Http\Middleware\PreventXss::class,
            'menu.access' => \App\Http\Middleware\EnsureUserHasMenuAccess::class,
            'store.open' => \App\Http\Middleware\EnsureStoreIsOpen::class,
        ]);

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
