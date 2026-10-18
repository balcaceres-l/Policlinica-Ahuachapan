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
     * API de la OMS para la CIE-11 (HU-44). El navegador nunca habla con la OMS: la
     * herramienta de búsqueda pasa por el proxy `/api/oms-icd/...`, que agrega el
     * token de la OMS. Credenciales en https://icd.who.int/icdapi ("View API access key").
     *
     * Desarrollo: ICD_API_URL=https://icd11restapi-developer-test.azurewebsites.net y
     * ICD_API_SECURED=false (servidor de pruebas sin autenticación).
     * Producción: ICD_API_URL=https://id.who.int y ICD_API_SECURED=true.
     */
    'oms_icd' => [
        'client_id' => env('ICD_CLIENT_ID'),
        'client_secret' => env('ICD_CLIENT_SECRET'),
        'token_url' => env('ICD_TOKEN_URL', 'https://icdaccessmanagement.who.int/connect/token'),
        'api_url' => env('ICD_API_URL', 'https://id.who.int'),
        'api_secured' => (bool) env('ICD_API_SECURED', true),
        // Pase que firma el backend para que el navegador use el proxy.
        'minutos_pase_proxy' => (int) env('ICD_PROXY_MINUTOS', 15),
        // Peticiones por minuto y por médico al proxy. Una búsqueda por cada pausa
        // al escribir: un humano no se acerca a esta cifra; un script, sí.
        'limite_por_minuto' => (int) env('ICD_PROXY_LIMITE', 240),
    ],

];
