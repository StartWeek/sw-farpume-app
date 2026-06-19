<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PreventSqlInjection
{
    /**
     * Patterns are intentionally focused on high-confidence SQLi vectors
     * to reduce false positives for normal user input.
     */
    private array $defaultPatterns = [
        '/\bunion\s+all\s+select\b/i',
        '/\bunion\s+select\b/i',
        '/\bselect\b\s+.+\bfrom\b/i',
        '/\binformation_schema\b/i',
        '/\b(or|and)\b\s+\d+\s*=\s*\d+/i',
        '/\b(or|and)\b\s+["\"][^"\"]+["\"]\s*=\s*["\"][^"\"]+["\"]/i',
        '/\bsleep\s*\(\s*\d+\s*\)/i',
        '/\bbenchmark\s*\(/i',
        '/\bwaitfor\s+delay\b/i',
        '/;\s*(drop|truncate|delete|update|insert|alter|create)\b/i',
        '/(--|#|\/\*)\s*$/i',
    ];

    /**
     * Skip scanning rich text-like fields to reduce false positives.
     */
    private array $defaultWhitelistedFieldPatterns = [
        '/(^|\.)content$/i',
        '/(^|\.)description$/i',
        '/(^|\.)note(s)?$/i',
        '/(^|\.)bio$/i',
        '/(^|\.)html$/i',
        '/(^|\.)body$/i',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $inputs = array_merge(
            $this->flatten($request->query->all()),
            $this->flatten($request->request->all())
        );

        foreach ($inputs as $item) {
            $path = $item['path'];
            $value = $item['value'];

            if (!is_string($value) || $value === '') {
                continue;
            }

            if ($this->isWhitelistedField($path)) {
                continue;
            }

            if ($this->containsSqlInjectionPattern($value)) {
                // Jika request Inertia, balas error inertia agar tidak muncul modal error
                if ($request->header('X-Inertia')) {
                    return redirect()->back()->withErrors([
                        $path => 'Mohon periksa kembali data yang Anda masukkan.'
                    ]);
                }
                return response()->json([
                    'message' => 'Mohon periksa kembali data yang Anda masukkan.',
                ], 422);
            }
        }

        return $next($request);
    }

    private function containsSqlInjectionPattern(string $value): bool
    {
        $decoded = urldecode($value);

        foreach ($this->patterns() as $pattern) {
            if (preg_match($pattern, $decoded) === 1) {
                return true;
            }
        }

        return false;
    }

    private function isWhitelistedField(string $path): bool
    {
        foreach ($this->whitelistedFieldPatterns() as $pattern) {
            if (preg_match($pattern, $path) === 1) {
                return true;
            }
        }

        return false;
    }

    private function flatten(array $payload): array
    {
        $result = [];

        $walker = function (array $items, string $prefix = '') use (&$walker, &$result): void {
            foreach ($items as $key => $value) {
                $path = $prefix === '' ? (string) $key : $prefix . '.' . (string) $key;

                if (is_array($value)) {
                    $walker($value, $path);
                    continue;
                }

                $result[] = [
                    'path' => $path,
                    'value' => $value,
                ];
            }
        };

        $walker($payload);

        return $result;
    }

    private function patterns(): array
    {
        $configured = config('security_guards.sql_injection.patterns');

        return is_array($configured) && $configured !== []
            ? $configured
            : $this->defaultPatterns;
    }

    private function whitelistedFieldPatterns(): array
    {
        $configured = config('security_guards.sql_injection.whitelisted_field_patterns');

        return is_array($configured) && $configured !== []
            ? $configured
            : $this->defaultWhitelistedFieldPatterns;
    }
}
