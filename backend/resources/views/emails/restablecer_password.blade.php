<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecer contraseña - Policlínica Ahuachapaneca</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f6f8;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1f2a37;
        }
        .container {
            max-width: 580px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #e5e7eb;
        }
        .header {
            background-color: #1b3a5c;
            padding: 30px 24px;
            text-align: center;
            color: #ffffff;
        }
        .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.02em;
        }
        .header p {
            margin: 6px 0 0;
            font-size: 13px;
            color: #b0c8dd;
        }
        .content {
            padding: 32px 28px;
            line-height: 1.6;
        }
        .content h2 {
            margin-top: 0;
            font-size: 17px;
            color: #111827;
        }
        .content p {
            font-size: 14px;
            color: #4b5563;
            margin: 14px 0;
        }
        .btn-wrapper {
            text-align: center;
            margin: 28px 0;
        }
        .btn {
            display: inline-block;
            background-color: #1b3a5c;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(27, 58, 92, 0.25);
        }
        .btn:hover {
            background-color: #16304c;
        }
        .callout {
            background-color: #f8fafc;
            border-left: 4px solid #1b3a5c;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 12px;
            color: #64748b;
            margin: 20px 0;
        }
        .link-text {
            word-break: break-all;
            font-size: 12px;
            color: #2563eb;
        }
        .footer {
            background-color: #f9fafb;
            padding: 20px 28px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid #f3f4f6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Policlínica Ahuachapaneca</h1>
            <p>Sistema Integral de Gestión Clínica</p>
        </div>

        <div class="content">
            <h2>Hola, {{ $nombre }}</h2>
            <p>Hemos recibido una solicitud para restablecer la contraseña de acceso a tu cuenta en el sistema de la policlínica.</p>
            <p>Para definir una nueva contraseña, haz clic en el siguiente botón:</p>

            <div class="btn-wrapper">
                <a href="{{ $urlRestablecimiento }}" class="btn" target="_blank">
                    Restablecer mi contraseña
                </a>
            </div>

            <div class="callout">
                <strong>Importante:</strong> Este enlace de seguridad expirará en <strong>60 minutos</strong>. Si tú no solicitaste este cambio, puedes ignorar este correo de forma segura; tu contraseña actual no sufrirá ninguna modificación.
            </div>

            <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
                Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:
            </p>
            <p class="link-text">{{ $urlRestablecimiento }}</p>
        </div>

        <div class="footer">
            <p>© {{ date('Y') }} Policlínica Ahuachapaneca. Ahuachapán, El Salvador.</p>
            <p>Este es un correo automático generado por el sistema, por favor no respondas a este mensaje.</p>
        </div>
    </div>
</body>
</html>
