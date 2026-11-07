<?php

return [
    'sql_injection' => [
        'patterns' => [
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
        ],
        'whitelisted_field_patterns' => [
            '/(^|\.)content$/i',
            '/(^|\.)description$/i',
            '/(^|\.)note(s)?$/i',
            '/(^|\.)bio$/i',
            '/(^|\.)html$/i',
            '/(^|\.)body$/i',
        ],
    ],
    'xss' => [
        'patterns' => [
            '/<\s*script\b/i',
            '/<\s*\/\s*script\s*>/i',
            '/\bon\w+\s*=\s*["\']/i',
            '/\bjavascript\s*:/i',
            '/\bdata\s*:\s*text\/html\b/i',
            '/<\s*iframe\b/i',
            '/<\s*svg\b[^>]*\bon\w+\s*=/i',
        ],
        'whitelisted_field_patterns' => [
            '/(^|\.)content$/i',
            '/(^|\.)description$/i',
            '/(^|\.)note(s)?$/i',
            '/(^|\.)bio$/i',
            '/(^|\.)html$/i',
            '/(^|\.)body$/i',
        ],
    ],
];
