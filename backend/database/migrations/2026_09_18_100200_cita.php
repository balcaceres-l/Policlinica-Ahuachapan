<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cita', function (Blueprint $table) {
            $table->uuid('id_cita')->primary();
            $table->uuid('id_paciente');
            $table->uuid('id_medico');
            // Se resuelve al atender: el médico elige con cuál de sus
            // especialidades registra la consulta.
            $table->uuid('id_especialidad')->nullable();

            $table->date('fecha');
            $table->time('hora_inicio');
            $table->time('hora_fin');

            // REGULAR | EMERGENCIA | SOBRECUPO
            $table->string('tipo_cita', 15)->default('REGULAR')->index();
            // AGENDADA | EN_ESPERA | EN_ATENCION | ATENDIDA | CANCELADA | NO_ASISTIO
            $table->string('estado', 15)->default('AGENDADA')->index();
            $table->text('motivo_cancelacion')->nullable();

            // El orden de atención lo marca la llegada, no la hora agendada.
            $table->dateTime('hora_llegada')->nullable();
            $table->integer('orden_atencion')->nullable();

            $table->uuid('id_creado_por');
            $table->dateTime('fecha_creacion')->useCurrent();
            $table->dateTime('fecha_actualizacion')->useCurrent()->useCurrentOnUpdate();

            $table->foreign('id_paciente')
                ->references('id_paciente')->on('paciente')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('id_medico')
                ->references('id')->on('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('id_especialidad')
                ->references('id')->on('especialidades')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('id_creado_por')
                ->references('id')->on('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // Toda búsqueda de disponibilidad y de solapamiento filtra por
            // médico y fecha; es el índice que sostiene el bloqueo de filas.
            $table->index(['id_medico', 'fecha'], 'idx_cita_medico_fecha');
            $table->index(['fecha', 'estado'], 'idx_cita_fecha_estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cita');
    }
};
