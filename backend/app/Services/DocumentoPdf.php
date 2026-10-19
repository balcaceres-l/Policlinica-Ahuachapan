<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

/**
 * HU-33 — módulo único de PDF para los documentos médicos (receta, constancia
 * y referencia). Todos usan la misma plantilla con la identidad de la
 * policlínica (RNF-03). Sin `descargar` el PDF se abre en el navegador para
 * verlo o imprimirlo; con `descargar` se baja como archivo.
 */
class DocumentoPdf
{
    /** @param  array<string, mixed>  $datos */
    public function responder(string $vista, array $datos, string $archivo, bool $descargar): Response
    {
        $pdf = Pdf::loadView("documentos.{$vista}", $datos + ['clinica' => $this->clinica()])
            ->setPaper('letter')
            // Solo las letras usadas: sin esto cada PDF incrusta la fuente entera (~900 KB).
            ->setOption('isFontSubsettingEnabled', true);

        return $descargar ? $pdf->download($archivo) : $pdf->stream($archivo);
    }

    /** Edad cumplida a la fecha de hoy. */
    public static function edad(Carbon|string|null $fechaNacimiento): ?int
    {
        return $fechaNacimiento ? Carbon::parse($fechaNacimiento)->age : null;
    }

    /** "18 de octubre de 2026" */
    public static function fechaLarga(Carbon|string|null $fecha): string
    {
        return Carbon::parse($fecha ?? now())->locale('es')->translatedFormat('j \d\e F \d\e Y');
    }

    /** @return array<string, string|null> */
    protected function clinica(): array
    {
        $config = config('clinica.documentos');
        $logo = $config['logo'] ?? null;

        return [
            ...$config,
            // dompdf no lee rutas del disco por seguridad: el logo va incrustado.
            'logo' => $logo && is_file($logo)
                ? 'data:image/png;base64,'.base64_encode((string) file_get_contents($logo))
                : null,
        ];
    }
}
