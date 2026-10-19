{{-- HU-30 — receta médica imprimible. Espera $receta (con detalles), $paciente, $medico, $especialidad, $fecha. --}}
@extends('documentos.plantilla')

@section('titulo', 'Receta médica')

@section('contenido')
    @include('documentos._paciente')

    <h2>Medicamentos prescritos</h2>
    <table class="tabla">
        <thead>
            <tr>
                <th style="width: 4%;">#</th>
                <th style="width: 30%;">Medicamento</th>
                <th style="width: 30%;">Posología</th>
                <th>Indicaciones</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($receta->detalles as $i => $detalle)
                <tr class="sin-salto">
                    <td>{{ $i + 1 }}</td>
                    <td>
                        <strong>{{ $detalle->nombre_medicamento }}</strong>
                        @if ($detalle->via_administracion)
                            <div class="muted">Vía: {{ $detalle->via_administracion }}</div>
                        @endif
                    </td>
                    <td>
                        <div><strong>Dosis:</strong> {{ $detalle->dosis }}</div>
                        <div><strong>Frecuencia:</strong> {{ $detalle->frecuencia }}</div>
                        @if ($detalle->duracion)
                            <div><strong>Duración:</strong> {{ $detalle->duracion }}</div>
                        @endif
                    </td>
                    <td class="texto">{{ $detalle->indicaciones ?: '—' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    @if ($receta->observaciones_generales)
        <h2>Observaciones generales</h2>
        <div class="texto">{{ $receta->observaciones_generales }}</div>
    @endif

    @include('documentos._firma')
@endsection
