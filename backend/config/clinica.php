<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Retraso del paciente
    |--------------------------------------------------------------------------
    |
    | Minutos que pueden pasar desde la hora agendada antes de que la cita se
    | marque como retrasada y recepción pueda reprogramarla (RF-44).
    |
    */

    'retraso_paciente_min' => (int) env('CITA_RETRASO_PACIENTE_MIN', 10),

    /*
    |--------------------------------------------------------------------------
    | Duración del bloque
    |--------------------------------------------------------------------------
    |
    | Tamaño de los bloques que se ofrecen como disponibles. El horario real de
    | cada médico se configura aparte y manda sobre esto.
    |
    */

    'duracion_bloque_min' => (int) env('CITA_DURACION_BLOQUE_MIN', 30),

    /*
    |--------------------------------------------------------------------------
    | Identidad en los documentos médicos
    |--------------------------------------------------------------------------
    |
    | Encabezado de la receta, la constancia y la referencia (RNF-03).
    | Dirección, teléfono y correo están pendientes de confirmar con el
    | cliente; se cambian en el .env sin tocar código.
    |
    */

    'documentos' => [
        'nombre' => env('CLINICA_NOMBRE', 'Policlínica Ahuachapaneca'),
        'subtitulo' => env('CLINICA_SUBTITULO', 'Atención Médica Integral y Diagnóstico Clínico'),
        'direccion' => env('CLINICA_DIRECCION', 'Calle Teodoro Moreno #3-4, Ahuachapán, El Salvador'),
        'telefono' => env('CLINICA_TELEFONO', 'PBX: (503) 2413-0000'),
        'correo' => env('CLINICA_CORREO', 'consultas@policlinicaahuachapan.com'),
        'ciudad' => env('CLINICA_CIUDAD', 'Ahuachapán'),
        'logo' => resource_path('documentos/logo.png'),
    ],

];
