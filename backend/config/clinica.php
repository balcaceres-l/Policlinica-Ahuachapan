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

];
