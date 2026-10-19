{{--
    HU-32 — referencia médica.
    INTERNA: lleva el expediente clínico completo para el médico receptor ($historial, $laboratorio).
    EXTERNA: solo lo que el médico escribió; no se expone el expediente.
    Espera $referencia, $paciente, $medico, $especialidad, $fecha.
--}}
@extends('documentos.plantilla')

@section('titulo', $referencia->esInterna() ? 'Referencia médica interna' : 'Referencia médica externa')

@section('contenido')
    @include('documentos._paciente')

    <h2>Datos de la referencia</h2>
    <table class="datos">
        <tr>
            <td style="width: 50%;">
                <div class="etiqueta">Se refiere a</div>
                <div class="valor">
                    @if ($referencia->esInterna())
                        {{ $referencia->medicoDestino?->nombre_completo ?? 'Médico de la policlínica' }}
                    @else
                        {{ $referencia->destino }}
                    @endif
                </div>
            </td>
            <td>
                <div class="etiqueta">Especialidad</div>
                <div class="valor">{{ $referencia->especialidad_destino ?: '—' }}</div>
            </td>
        </tr>
    </table>

    <h3>Motivo de la referencia</h3>
    <div class="texto">{{ $referencia->motivo }}</div>

    @if ($referencia->resumen_clinico)
        <h3>{{ $referencia->esInterna() ? 'Nota para el médico receptor' : 'Resumen clínico' }}</h3>
        <div class="texto">{{ $referencia->resumen_clinico }}</div>
    @endif

    @include('documentos._firma')

    @if ($referencia->esInterna())
        <div class="salto"></div>
        <h1>Expediente clínico completo</h1>

        <h2>Datos del paciente</h2>
        <table class="datos">
            <tr>
                <td><span class="etiqueta">Fecha de nacimiento</span><br><span class="valor">{{ \Illuminate\Support\Carbon::parse($paciente->fecha_nacimiento)->format('d/m/Y') }}</span></td>
                <td><span class="etiqueta">Documento</span><br><span class="valor">{{ $paciente->dui ?: '—' }}</span></td>
                <td><span class="etiqueta">Teléfono</span><br><span class="valor">{{ $paciente->telefono ?: '—' }}</span></td>
            </tr>
            <tr>
                <td colspan="3"><span class="etiqueta">Dirección</span><br><span class="valor">{{ $paciente->direccion ?: '—' }}</span></td>
            </tr>
            @if ($paciente->es_menor_edad && $paciente->responsable)
                <tr>
                    <td colspan="3">
                        <span class="etiqueta">Responsable</span><br>
                        <span class="valor">{{ $paciente->responsable->nombre_completo }} ({{ $paciente->responsable->parentesco }}) · {{ $paciente->responsable->telefono }}</span>
                    </td>
                </tr>
            @endif
        </table>

        <h2>Consultas ({{ count($historial) }})</h2>
        @forelse ($historial as $consulta)
            <div class="caja sin-salto" style="margin-bottom: 8px;">
                <strong>{{ \Illuminate\Support\Carbon::parse($consulta['fecha_hora_inicio'])->format('d/m/Y H:i') }}</strong>
                · {{ $consulta['medicoNombre'] }}
                @if ($consulta['especialidadNombre']) · {{ $consulta['especialidadNombre'] }} @endif

                @if ($consulta['motivo_consulta'])
                    <div><strong>Motivo:</strong> {{ $consulta['motivo_consulta'] }}</div>
                @endif

                @if ($consulta['signos_vitales'])
                    @php($sv = $consulta['signos_vitales'])
                    <div class="muted">
                        Signos vitales:
                        PA {{ $sv['presion_sistolica'] ?? '—' }}/{{ $sv['presion_diastolica'] ?? '—' }} mmHg ·
                        FC {{ $sv['frecuencia_cardiaca'] ?? '—' }} lpm ·
                        FR {{ $sv['frecuencia_respiratoria'] ?? '—' }} rpm ·
                        T {{ $sv['temperatura_c'] ?? '—' }} °C ·
                        SpO2 {{ $sv['saturacion_oxigeno'] ?? '—' }}% ·
                        Peso {{ $sv['peso_kg'] ?? '—' }} kg
                    </div>
                @endif

                @php($examenes = collect($consulta['examenes_fisicos'])->filter(fn ($e) => filled($e['hallazgos'])))
                @if ($examenes->isNotEmpty())
                    <div><strong>Examen físico:</strong></div>
                    <ul style="margin: 2px 0 2px 16px; padding: 0;">
                        @foreach ($examenes as $examen)
                            <li class="texto">@if ($examen['region_anatomica']){{ $examen['region_anatomica'] }}: @endif{{ $examen['hallazgos'] }}</li>
                        @endforeach
                    </ul>
                @endif

                @if (count($consulta['diagnosticos']) > 0)
                    <div><strong>Diagnósticos:</strong></div>
                    <ul style="margin: 2px 0 2px 16px; padding: 0;">
                        @foreach ($consulta['diagnosticos'] as $dx)
                            <li>{{ $dx['descripcion'] }}@if ($dx['codigo_cie11']) (CIE-11 {{ $dx['codigo_cie11'] }})@endif</li>
                        @endforeach
                    </ul>
                @endif

                @if ($consulta['plan_manejo'])
                    <div class="texto"><strong>Plan de manejo:</strong> {{ $consulta['plan_manejo']['descripcion'] }}</div>
                    @if ($consulta['plan_manejo']['indicaciones'] && $consulta['plan_manejo']['indicaciones'] !== $consulta['plan_manejo']['descripcion'])
                        <div class="texto"><strong>Indicaciones:</strong> {{ $consulta['plan_manejo']['indicaciones'] }}</div>
                    @endif
                @endif

                @if ($consulta['receta'] && count($consulta['receta']['detalles']) > 0)
                    <div><strong>Receta:</strong></div>
                    <ul style="margin: 2px 0 2px 16px; padding: 0;">
                        @foreach ($consulta['receta']['detalles'] as $med)
                            <li>{{ $med['nombre_medicamento'] }} — {{ $med['dosis'] }}, {{ $med['frecuencia'] }}@if ($med['duracion']), {{ $med['duracion'] }}@endif</li>
                        @endforeach
                    </ul>
                @endif
            </div>
        @empty
            <p class="muted">Sin consultas registradas.</p>
        @endforelse

        <h2>Resultados de laboratorio ({{ $laboratorio->count() }})</h2>
        @if ($laboratorio->isEmpty())
            <p class="muted">Sin resultados registrados.</p>
        @else
            <table class="tabla">
                <thead>
                    <tr><th style="width: 15%;">Fecha</th><th style="width: 30%;">Examen</th><th>Resultado</th></tr>
                </thead>
                <tbody>
                    @foreach ($laboratorio as $resultado)
                        <tr class="sin-salto">
                            <td>{{ $resultado->fecha_examen?->format('d/m/Y') }}</td>
                            <td>{{ $resultado->nombre_examen }}</td>
                            <td class="texto">{{ $resultado->resultado_texto ?: ($resultado->archivo_nombre ? 'Adjunto en el sistema: '.$resultado->archivo_nombre : '—') }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endif
@endsection
