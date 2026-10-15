<?php

namespace App\Console\Commands;

use App\Models\catalogo_cie10;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportarCie10 extends Command
{
    protected $signature = 'cie10:importar
        {archivo : Ruta del archivo CSV con el catálogo}
        {--delimitador=, : Separador de columnas}
        {--col-codigo=0 : Posición (desde 0) de la columna del código}
        {--col-descripcion=1 : Posición (desde 0) de la columna de la descripción}
        {--sin-encabezado : El archivo no trae fila de títulos}
        {--reemplazar : Vacía el catálogo antes de cargar}';

    protected $description = 'Carga el catálogo CIE-10 (HU-44) desde un archivo CSV oficial';

    public function handle(): int
    {
        $ruta = $this->argument('archivo');
        if (! is_readable($ruta)) {
            $this->error("No se puede leer el archivo: {$ruta}");

            return self::FAILURE;
        }

        $colCodigo = (int) $this->option('col-codigo');
        $colDescripcion = (int) $this->option('col-descripcion');
        $delimitador = (string) $this->option('delimitador');

        $filas = [];
        $omitidas = 0;
        $manejador = fopen($ruta, 'r');
        $primera = true;

        while (($columnas = fgetcsv($manejador, null, $delimitador, '"', '')) !== false) {
            if ($primera) {
                $primera = false;
                // Excel antepone una marca BOM que se pegaría al primer código.
                $columnas[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $columnas[0]);
                if (! $this->option('sin-encabezado')) {
                    continue;
                }
            }

            $codigo = mb_strtoupper(trim($this->aUtf8($columnas[$colCodigo] ?? '')));
            $descripcion = trim($this->aUtf8($columnas[$colDescripcion] ?? ''));

            if ($codigo === '' || $descripcion === '' || mb_strlen($codigo) > 10) {
                $omitidas++;

                continue;
            }

            // La llave evita duplicados dentro del mismo archivo.
            $filas[$codigo] = [
                'codigo' => $codigo,
                'descripcion' => mb_substr($descripcion, 0, 500),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        fclose($manejador);

        if ($filas === []) {
            $this->error('El archivo no contiene filas válidas. Revisa el delimitador y las columnas.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($filas) {
            if ($this->option('reemplazar')) {
                catalogo_cie10::query()->delete();
            }

            foreach (array_chunk(array_values($filas), 500) as $lote) {
                catalogo_cie10::upsert($lote, ['codigo'], ['descripcion', 'updated_at']);
            }
        });

        $this->info(count($filas).' códigos cargados. Filas omitidas: '.$omitidas.'.');

        return self::SUCCESS;
    }

    /** Los catálogos exportados desde Excel suelen venir en Latin-1. */
    private function aUtf8(string $texto): string
    {
        return mb_check_encoding($texto, 'UTF-8') ? $texto : mb_convert_encoding($texto, 'UTF-8', 'ISO-8859-1');
    }
}
