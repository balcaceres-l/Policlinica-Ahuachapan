{{-- Identificación del paciente, común a todos los documentos. Espera $paciente. --}}
@php($edad = \App\Services\DocumentoPdf::edad($paciente->fecha_nacimiento))
<div class="caja sin-salto">
    <table class="datos">
        <tr>
            <td style="width: 55%;">
                <div class="etiqueta">Paciente</div>
                <div class="valor">{{ $paciente->nombre_completo }}</div>
            </td>
            <td style="width: 25%;">
                <div class="etiqueta">Expediente</div>
                <div class="valor">{{ $paciente->numero_expediente }}</div>
            </td>
            <td style="width: 20%;">
                <div class="etiqueta">Edad</div>
                <div class="valor">{{ $edad !== null ? $edad.' años' : '—' }}</div>
            </td>
        </tr>
    </table>
</div>
