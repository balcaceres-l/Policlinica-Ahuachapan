{{-- HU-33 — plantilla común de los documentos médicos (RNF-03: identidad de la policlínica). --}}
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>@yield('titulo') — {{ $clinica['nombre'] }}</title>
    <style>
        @page { margin: 124px 48px 70px 48px; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #0f172a; line-height: 1.45; }
        header { position: fixed; top: -104px; left: 0; right: 0; height: 84px; border-bottom: 3px solid #166534; }
        header table { width: 100%; border-collapse: collapse; }
        header td { vertical-align: middle; padding-bottom: 8px; }
        header .logo { width: 66px; }
        header .logo img { width: 54px; height: auto; }
        header .nombre { font-size: 17px; font-weight: bold; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; }
        header .subtitulo { font-size: 10px; color: #475569; }
        header .contacto { font-size: 9px; color: #64748b; margin-top: 2px; }
        footer { position: fixed; bottom: -52px; left: 0; right: 0; height: 36px; border-top: 1px solid #cbd5e1; font-size: 8.5px; color: #64748b; text-align: center; padding-top: 6px; }
        h1 { font-size: 15px; text-align: center; color: #166534; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 14px 0; }
        h2 { font-size: 12px; color: #166534; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin: 16px 0 6px 0; }
        h3 { font-size: 11px; margin: 10px 0 4px 0; color: #0f172a; }
        .caja { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 4px; padding: 8px 10px; }
        .datos { width: 100%; border-collapse: collapse; }
        .datos td { padding: 2px 6px 2px 0; vertical-align: top; }
        .etiqueta { color: #64748b; font-size: 9.5px; text-transform: uppercase; }
        .valor { font-weight: bold; }
        .tabla { width: 100%; border-collapse: collapse; margin-top: 4px; }
        .tabla th { background: #166534; color: #ffffff; font-size: 9.5px; text-align: left; padding: 4px 6px; }
        .tabla td { border-bottom: 1px solid #e2e8f0; padding: 4px 6px; vertical-align: top; }
        .muted { color: #64748b; }
        .texto { white-space: pre-line; }
        .firma { margin-top: 50px; width: 260px; margin-left: auto; margin-right: auto; text-align: center; }
        .firma .linea { border-top: 1px solid #0f172a; padding-top: 4px; font-weight: bold; }
        .lugar-fecha { margin-top: 18px; }
        .salto { page-break-before: always; }
        .sin-salto { page-break-inside: avoid; }
    </style>
</head>
<body>
<header>
    <table>
        <tr>
            <td class="logo">
                @if ($clinica['logo'])
                    <img src="{{ $clinica['logo'] }}" alt="Logo">
                @endif
            </td>
            <td>
                <div class="nombre">{{ $clinica['nombre'] }}</div>
                <div class="subtitulo">{{ $clinica['subtitulo'] }}</div>
                <div class="contacto">{{ $clinica['direccion'] }} · {{ $clinica['telefono'] }} · {{ $clinica['correo'] }}</div>
            </td>
        </tr>
    </table>
</header>

<footer>
    {{ $clinica['nombre'] }} · {{ $clinica['direccion'] }} · {{ $clinica['telefono'] }}<br>
    Documento generado el {{ now()->format('d/m/Y H:i') }}
</footer>

<main>
    <h1>@yield('titulo')</h1>
    @yield('contenido')
</main>
</body>
</html>
