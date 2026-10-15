<?php

namespace App\Console\Commands;

use App\Models\catalogo_cie10;
use App\Services\ClienteIcdOms;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * HU-44 — arma el catálogo CIE-10 con la lista oficial de códigos de la OMS
 * (versión final 2019) y le pone a cada código su descripción en español,
 * tomada de un archivo oficial en español y cruzada por código. Los códigos
 * que no estén en la lista de la OMS no entran.
 */
class SincronizarCie10Oms extends Command
{
    protected $signature = 'cie10:sincronizar-oms
        {--release= : Versión de la CIE-10 en la API de la OMS (por defecto ICD10_RELEASE, 2019)}
        {--descripciones= : CSV codigo,descripcion en español (por defecto database/data/cie10_descripciones_es.csv)}
        {--paralelas=8 : Peticiones simultáneas a la API}
        {--minimo=8000 : Aborta sin tocar la base si la OMS devuelve menos códigos que esto}';

    protected $description = 'Sincroniza el catálogo CIE-10 con la API de la OMS y las descripciones oficiales en español';

    public function handle(): int
    {
        $release = $this->option('release') ?: config('services.oms_icd.release_cie10');
        $rutaDescripciones = $this->option('descripciones') ?: database_path('data/cie10_descripciones_es.csv');

        try {
            $cliente = ClienteIcdOms::desdeConfiguracion();
            $espanol = $this->leerDescripciones($rutaDescripciones);
            $this->info('Descripciones en español: '.count($espanol)." códigos ({$rutaDescripciones}).");

            $this->info("Leyendo la CIE-10 {$release} de la API de la OMS...");
            $codigos = $this->recorrer($cliente, $release);
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $minimo = (int) $this->option('minimo');
        if (count($codigos) < $minimo) {
            $this->error('La OMS devolvió '.count($codigos)." códigos, menos de {$minimo}: no se modificó la base.");

            return self::FAILURE;
        }

        $sinEspanol = [];
        $filas = [];
        foreach ($codigos as $codigo => $tituloOms) {
            $clave = self::clave($codigo);
            if (! isset($espanol[$clave])) {
                $sinEspanol[] = $codigo;
            }
            $filas[] = [
                'codigo' => $codigo,
                // Sin traducción oficial se usa el título de la OMS, que es el oficial.
                'descripcion' => mb_substr($espanol[$clave] ?? $tituloOms, 0, 500),
                'titulo_oms' => mb_substr($tituloOms, 0, 500),
                'version_oms' => (string) $release,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::transaction(function () use ($filas, $codigos) {
            foreach (array_chunk($filas, 500) as $lote) {
                catalogo_cie10::upsert($lote, ['codigo'], ['descripcion', 'titulo_oms', 'version_oms', 'updated_at']);
            }
            // El catálogo queda exactamente igual a la lista de la OMS. Los
            // diagnósticos ya registrados guardan su código y no se afectan.
            catalogo_cie10::query()->whereNotIn('codigo', array_keys($codigos))->delete();
        });

        $clavesOms = array_flip(array_map(self::clave(...), array_keys($codigos)));
        $soloEnEspanol = count(array_diff_key($espanol, $clavesOms));

        $this->info(count($filas).' códigos de la OMS cargados.');
        $this->line('  Con descripción en español: '.(count($filas) - count($sinEspanol)).'.');
        $this->line('  Sin descripción en español (quedan con el título de la OMS): '.count($sinEspanol)
            .($sinEspanol ? ' — '.implode(', ', array_slice($sinEspanol, 0, 15)).(count($sinEspanol) > 15 ? '…' : '') : ''));
        $this->line("  Códigos del archivo en español que la OMS no tiene (descartados): {$soloEnEspanol}.");

        return self::SUCCESS;
    }

    /**
     * Recorre el árbol de la CIE-10 (capítulos → bloques → categorías) y
     * devuelve solo los códigos que se pueden registrar: las categorías sin
     * subdivisiones.
     *
     * @return array<string, string> código => título de la OMS
     */
    private function recorrer(ClienteIcdOms $cliente, string $release): array
    {
        $raiz = $cliente->entidad($cliente->urlRelease($release));
        $pendientes = $raiz['child'] ?? [];
        if ($pendientes === []) {
            throw new RuntimeException("La versión {$release} de la CIE-10 no trae capítulos en la API de la OMS.");
        }

        $codigos = [];
        $visitadas = 0;
        $paralelas = max(1, (int) $this->option('paralelas'));

        while ($pendientes !== []) {
            $lote = array_splice($pendientes, 0, $paralelas);
            foreach ($cliente->obtenerVarias($lote) as $entidad) {
                $visitadas++;
                $hijos = $entidad['child'] ?? [];
                array_push($pendientes, ...$hijos);

                // `modifiedcategory` son los códigos que heredan subdivisiones
                // compartidas del bloque (E11.9 de E10-E14, V01.0 de V01-V99...).
                $esCodigo = in_array($entidad['classKind'] ?? null, ['category', 'modifiedcategory'], true);
                if ($esCodigo && $hijos === [] && ! empty($entidad['code'])) {
                    $codigos[$entidad['code']] = self::texto($entidad['title'] ?? '');
                }
            }

            if ($visitadas % 500 < $paralelas) {
                $this->output->write("\r  entidades leídas: {$visitadas} | códigos: ".count($codigos).'   ');
            }
        }
        $this->newLine();

        ksort($codigos);

        return $codigos;
    }

    /** @return array<string, string> clave normalizada => descripción */
    private function leerDescripciones(string $ruta): array
    {
        if (! is_readable($ruta)) {
            throw new RuntimeException("No se encuentra el archivo de descripciones en español: {$ruta}");
        }

        $manejador = fopen($ruta, 'r');
        $encabezado = fgetcsv($manejador, null, ',', '"', '');
        $espanol = [];
        while (($fila = fgetcsv($manejador, null, ',', '"', '')) !== false) {
            [$codigo, $descripcion] = [$fila[0] ?? '', trim($fila[1] ?? '')];
            if (trim($codigo) !== '' && $descripcion !== '') {
                $espanol[self::clave($codigo)] = $descripcion;
            }
        }
        fclose($manejador);

        if ($encabezado === false || $espanol === []) {
            throw new RuntimeException("El archivo de descripciones en español está vacío: {$ruta}");
        }

        return $espanol;
    }

    /** "J02.9", "J029" y "J00X" se comparan como "J029" y "J00". */
    private static function clave(string $codigo): string
    {
        $limpio = strtoupper(str_replace(['.', ' '], '', preg_replace('/^\xEF\xBB\xBF/', '', trim($codigo))));

        return preg_match('/^[A-Z]\d{2}X$/', $limpio) ? substr($limpio, 0, 3) : $limpio;
    }

    private static function texto(mixed $titulo): string
    {
        return trim(is_array($titulo) ? (string) ($titulo['@value'] ?? '') : (string) $titulo);
    }
}
