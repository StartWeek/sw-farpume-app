<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PreventXss
{
    /**
     * High-confidence patterns to reduce false positives.
     */
    private array $defaultPatterns = [
        '/<\s*script\b/i',
        '/<\s*\/\s*script\s*>/i',
        '/\bon\w+\s*=\s*["\']/i',
        '/\bjavascript\s*:/i',
        '/\bdata\s*:\s*text\/html\b/i',
        '/<\s*iframe\b/i',
        '/<\s*svg\b[^>]*\bon\w+\s*=/i',
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

            if ($this->containsXssPattern($value)) {
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

    private function containsXssPattern(string $value): bool
    {
        $decoded = html_entity_decode(urldecode($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');

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
        $configured = config('security_guards.xss.patterns');

        return is_array($configured) && $configured !== []
            ? $configured
            : $this->defaultPatterns;
    }

    private function whitelistedFieldPatterns(): array
    {
        $configured = config('security_guards.xss.whitelisted_field_patterns');

        return is_array($configured) && $configured !== []
            ? $configured
            : $this->defaultWhitelistedFieldPatterns;
    }
}