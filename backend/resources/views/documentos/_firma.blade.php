{{-- Lugar, fecha y firma del médico. Espera $medico, $especialidad (nombre o null) y $fecha. --}}
<p class="lugar-fecha">
    {{ $clinica['ciudad'] }}, {{ \App\Services\DocumentoPdf::fechaLarga($fecha) }}.
</p>
<div class="firma sin-salto">
    <div class="linea">{{ $medico->nombre_completo }}</div>
    @if ($especialidad)
        <div class="muted">{{ $especialidad }}</div>
    @endif
    {{-- Sin número registrado la línea se omite: el documento no inventa uno. --}}
    @if ($medico->jvpm)
        <div class="muted">JVPM: {{ $medico->jvpm }}</div>
    @endif
</div>
