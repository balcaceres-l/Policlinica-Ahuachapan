<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_unique(array_merge(
        array_filter(array_map('trim', explode(',', (string) env('FRONTEND_URL', '')))),
        [
            'https://policlinica.sistema09.latamname.com',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ]
    ))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 3600,
    'supports_credentials' => true,
];
