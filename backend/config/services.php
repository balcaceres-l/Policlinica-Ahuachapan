<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
     * API de la OMS para la CIE (HU-44). Las credenciales se obtienen en
     * https://icd.who.int/icdapi ("View API access key"). La CIE-10 2019 es su
     * versión final; se sincroniza con `php artisan cie10:sincronizar-oms`.
     */
    'oms_icd' => [
        'client_id' => env('ICD_CLIENT_ID'),
        'client_secret' => env('ICD_CLIENT_SECRET'),
        'token_url' => env('ICD_TOKEN_URL', 'https://icdaccessmanagement.who.int/connect/token'),
        'api_url' => env('ICD_API_URL', 'https://id.who.int'),
        'release_cie10' => env('ICD10_RELEASE', '2019'),
    ],

];
