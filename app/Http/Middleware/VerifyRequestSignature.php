<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class VerifyRequestSignature
{
    private const TIMESTAMP_TOLERANCE_MS = 300000;
    private const NONCE_TTL_SECONDS = 300;

    public function handle(Request $request, Closure $next): Response
    {
        $timestamp = (string) ($request->header('X-Timestamp') ?? $request->header('X-TimeTime') ?? '');
        $nonce = (string) $request->header('X-Nonce', '');
        $signature = (string) $request->header('X-Signature', '');

        if ($timestamp === '' || $nonce === '' || $signature === '') {
            if ($request->header('X-Inertia')) {
                return redirect()->back()->withErrors([
                    'signature' => 'Missing request security headers.'
                ]);
            }
            return response()->json([
                'message' => 'Missing request security headers.',
            ], 401);
        }

        if (!ctype_digit($timestamp)) {
            if ($request->header('X-Inertia')) {
                return redirect()->back()->withErrors([
                    'signature' => 'Invalid timestamp header.'
                ]);
            }
            return response()->json([
                'message' => 'Invalid timestamp header.',
            ], 401);
        }

        $nowMs = (int) floor(microtime(true) * 1000);
        $timestampMs = (int) $timestamp;

        if (abs($nowMs - $timestampMs) > self::TIMESTAMP_TOLERANCE_MS) {
            if ($request->header('X-Inertia')) {
                return redirect()->back()->withErrors([
                    'signature' => 'Expired request timestamp.'
                ]);
            }
            return response()->json([
                'message' => 'Expired request timestamp.',
            ], 401);
        }

        $nonceKey = $this->nonceCacheKey($request, $nonce);
        if (!Cache::add($nonceKey, 1, self::NONCE_TTL_SECONDS)) {
            if ($request->header('X-Inertia')) {
                return redirect()->back()->withErrors([
                    'signature' => 'Replay request detected.'
                ]);
            }
            return response()->json([
                'message' => 'Replay request detected.',
            ], 401);
        }

        $method = strtoupper($request->getMethod());
        $uri = $request->getRequestUri();
        $csrf = (string) ($request->session()->token() ?? '');

        $rawSignature = implode('|', [$method, $uri, $timestamp, $nonce, $csrf]);
        $expectedSignature = hash('sha256', $rawSignature);

        // Backward compatibility for requests signed with the previous format.
        $legacyBody = $this->normalizedBody($request);
        $legacyRawSignature = implode('|', [$method, $uri, $timestamp, $nonce, $legacyBody, $csrf]);
        $legacyExpectedSignature = hash('sha256', $legacyRawSignature);

        if (!hash_equals($expectedSignature, $signature) && !hash_equals($legacyExpectedSignature, $signature)) {
            if ($request->header('X-Inertia')) {
                return redirect()->back()->withErrors([
                    'signature' => 'Invalid request signature.'
                ]);
            }
            return response()->json([
                'message' => 'Invalid request signature.',
            ], 401);
        }

        return $next($request);
    }

    private function normalizedBody(Request $request): string
    {
        if (in_array($request->getMethod(), ['GET', 'HEAD'], true)) {
            return '';
        }

        if ($request->isJson()) {
            $content = $request->getContent();
            if ($content === '') {
                return '';
            }

            $decoded = json_decode($content, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return $content;
            }

            return $this->stableJsonEncode($decoded);
        }

        if ($request->request->count() === 0) {
            return '';
        }

        return $this->stableJsonEncode($request->request->all());
    }

    private function stableJsonEncode(mixed $value): string
    {
        if (is_array($value)) {
            if ($this->isList($value)) {
                $items = array_map(fn ($item) => $this->stableJsonEncode($item), $value);

                return '[' . implode(',', $items) . ']';
            }

            ksort($value);
            $pairs = [];
            foreach ($value as $key => $item) {
                $pairs[] = json_encode((string) $key, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                    . ':'
                    . $this->stableJsonEncode($item);
            }

            return '{' . implode(',', $pairs) . '}';
        }

        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: 'null';
    }

    private function isList(array $value): bool
    {
        if (function_exists('array_is_list')) {
            return array_is_list($value);
        }

        $index = 0;
        foreach ($value as $key => $_) {
            if ($key !== $index) {
                return false;
            }
            $index++;
        }

        return true;
    }

    private function nonceCacheKey(Request $request, string $nonce): string
    {
        $userId = (string) ($request->user()?->getAuthIdentifier() ?? 'guest');
        $sessionId = (string) ($request->session()->getId() ?? 'no-session');

        return 'req-signature:nonce:' . $userId . ':' . $sessionId . ':' . $nonce;
    }
}
