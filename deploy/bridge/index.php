<?php

/**
 * Policlínica Ahuachapaneca — Entry point / Wrapper Bridge para cPanel
 *
 * Ubicación en cPanel: /home/sistema09/public_html/api-policlinica/index.php
 *
 * Este wrapper permite que el núcleo de Laravel, sus dependencias (vendor),
 * variables de entorno (.env) y almacenamiento residan de forma 100% segura FUERA de
 * public_html, en el directorio privado: /home/sistema09/policlinica-backend/
 *
 * ALTERNATIVA SYMLINK:
 * Si tu servidor y cPanel permiten symlinks, en lugar de este archivo puedes
 * enlazar directamente la carpeta pública:
 *   ln -s /home/sistema09/policlinica-backend/public /home/sistema09/public_html/api-policlinica
 */

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Localizar directorio raíz del backend
$backendCandidates = [
    __DIR__ . '/../../policlinica-backend',
    dirname(__DIR__, 2) . '/policlinica-backend',
    '/home/sistema09/policlinica-backend',
];

$backendPath = null;
foreach ($backendCandidates as $candidate) {
    if (is_dir($candidate) && file_exists($candidate . '/bootstrap/app.php')) {
        $backendPath = realpath($candidate);
        break;
    }
}

if (! $backendPath) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Error de infraestructura: no se pudo localizar el directorio del backend (policlinica-backend).',
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit(1);
}

// 1. Verificar si la aplicación está en modo mantenimiento
if (file_exists($maintenance = $backendPath . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

// 2. Registrar el autoloader de Composer
require $backendPath . '/vendor/autoload.php';

// 3. Inicializar la aplicación Laravel
/** @var Application $app */
$app = require_once $backendPath . '/bootstrap/app.php';

// 4. Vincular el directorio público web a este directorio
$app->usePublicPath(__DIR__);

// Asegurar que el header Authorization llegue a Laravel en entornos cPanel (CGI / suEXEC / FastCGI / PHP-FPM)
if (empty($_SERVER['HTTP_AUTHORIZATION'])) {
    if (!empty($_SERVER['HTTP_X_AUTHORIZATION'])) {
        $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['HTTP_X_AUTHORIZATION'];
    } elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (!empty($_SERVER['REDIRECT_REDIRECT_HTTP_AUTHORIZATION'])) {
        $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (!empty($headers['Authorization'])) {
            $_SERVER['HTTP_AUTHORIZATION'] = $headers['Authorization'];
        } elseif (!empty($headers['authorization'])) {
            $_SERVER['HTTP_AUTHORIZATION'] = $headers['authorization'];
        } elseif (!empty($headers['X-Authorization'])) {
            $_SERVER['HTTP_AUTHORIZATION'] = $headers['X-Authorization'];
        }
    }
}

// 5. Manejar la petición HTTP entrante
$app->handleRequest(Request::capture());
