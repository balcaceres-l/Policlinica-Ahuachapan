<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Bloqueo parcial: una ausencia puede cubrir solo unas horas del día (el médico
 * llega tarde, sale antes). Sin hora_inicio/hora_fin el bloqueo sigue siendo de
 * día completo, así que las filas existentes no cambian de significado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bloqueo_agenda', function (Blueprint $table) {
            $table->time('hora_inicio')->nullable()->after('fecha');
            $table->time('hora_fin')->nullable()->after('hora_inicio');

            // La FK de id_medico se apoyaba en el índice único; este lo releva
            // antes de soltarlo, si no MariaDB rechaza el drop.
            $table->index(['id_medico', 'fecha'], 'idx_bloqueo_medico_fecha');
        });

        Schema::table('bloqueo_agenda', function (Blueprint $table) {
            // Varios bloqueos parciales el mismo día son válidos; los traslapes
            // se validan en BloqueoAgendaController.
            $table->dropUnique('uq_bloqueo_medico_fecha');
        });
    }

    public function down(): void
    {
        // El esquema anterior no admite más de un bloqueo por médico y día ni
        // bloqueos parciales: se descartan para poder restaurar la restricción.
        DB::table('bloqueo_agenda')->whereNotNull('hora_inicio')->delete();

        Schema::table('bloqueo_agenda', function (Blueprint $table) {
            $table->unique(['id_medico', 'fecha'], 'uq_bloqueo_medico_fecha');
        });

        Schema::table('bloqueo_agenda', function (Blueprint $table) {
            $table->dropIndex('idx_bloqueo_medico_fecha');
            $table->dropColumn(['hora_inicio', 'hora_fin']);
        });
    }
};
