{{-- HU-31 — constancia médica. Espera $constancia, $paciente, $medico, $especialidad, $fecha, $fechaAtencion. --}}
@extends('documentos.plantilla')

@section('titulo', 'Constancia médica')

@section('contenido')
    @php($edad = \App\Services\DocumentoPdf::edad($paciente->fecha_nacimiento))

    <p style="margin-top: 18px; font-size: 12px; text-align: justify;">
        El suscrito médico de {{ $clinica['nombre'] }} hace constar que
        <strong>{{ $paciente->nombre_completo }}</strong>@if ($edad !== null), de {{ $edad }} años de edad,@endif
        con número de expediente <strong>{{ $paciente->numero_expediente }}</strong>, fue atendido(a) en
        consulta médica el día {{ \App\Services\DocumentoPdf::fechaLarga($fechaAtencion) }}.
    </p>

    <h2>Motivo de la constancia</h2>
    <div class="texto" style="font-size: 12px;">{{ $constancia->motivo }}</div>

    <p style="margin-top: 18px; font-size: 12px;">
        Y para los usos que el interesado estime convenientes, se extiende la presente constancia.
    </p>

    @include('documentos._firma')
@endsection
