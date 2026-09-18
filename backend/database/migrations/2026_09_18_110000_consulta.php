<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consulta', function (Blueprint $table) {
            $table->uuid('id_consulta')->primary();
            // Una consulta por cita, incluidas emergencias y sobrecupos, que
            // también se modelan como cita.
            $table->uuid('id_cita')->unique();
            $table->uuid('id_medico');
            // El médico la elige al abrir la consulta; nula si solo tiene una
            // o si aún no se ha resuelto.
            $table->uuid('id_especialidad_atencion')->nullable();

            $table->dateTime('fecha_hora_inicio');
            // Null mientras sigue abierta. Exceder el bloque solo alerta: el
            // cierre siempre es manual.
            $table->dateTime('fecha_hora_fin')->nullable();

            $table->text('motivo_consulta')->nullable();
            $table->text('notas_adicionales')->nullable();

            $table->foreign('id_cita')
                ->references('id_cita')->on('cita')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('id_medico')
                ->references('id')->on('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('id_especialidad_atencion')
                ->references('id')->on('especialidades')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->index(['id_medico', 'fecha_hora_inicio'], 'idx_consulta_medico_inicio');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consulta');
    }
};
