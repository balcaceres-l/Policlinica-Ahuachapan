<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\JsonResponse;

trait RespondsWithJson
{
    protected function success(mixed $data, string $message = 'Operación exitosa.', int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    protected function failure(string $message, int $status, mixed $errors = null): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $status);
    }
}
