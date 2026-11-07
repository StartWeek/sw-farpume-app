<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    public static function log($action, $details = null)
    {
        $user = Auth::user();
        Log::channel('audit')->info('[AUDIT]', [
            'user_id' => $user ? $user->id : null,
            'action' => $action,
            'details' => $details,
            'ip' => request()->ip(),
            'url' => request()->fullUrl(),
            'agent' => request()->userAgent(),
        ]);
    }
}
