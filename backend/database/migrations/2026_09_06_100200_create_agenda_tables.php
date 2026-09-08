<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('horarios_medicos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medico_id')->constrained('users')->cascadeOnDelete();
            $table->string('dia_semana', 10);
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->timestamps();

            $table->index(['medico_id', 'dia_semana']);
        });

        Schema::create('bloqueos_agenda', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medico_id')->constrained('users')->cascadeOnDelete();
            $table->date('fecha');
            $table->string('motivo', 255)->nullable();
            $table->foreignId('creado_por_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['medico_id', 'fecha']);
        });

        Schema::create('citas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('paciente_id')->constrained('pacientes')->restrictOnDelete();
            $table->foreignId('medico_id')->constrained('users')->restrictOnDelete();
            // Se resuelve al atender: el médico elige con cuál de sus
            // especialidades registra la consulta.
            $table->foreignId('especialidad_id')->nullable()
                ->constrained('especialidades')->nullOnDelete();

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

            $table->foreignId('creado_por_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            // Toda búsqueda de disponibilidad y de solapamiento filtra por
            // médico y fecha.
            $table->index(['medico_id', 'fecha']);
            $table->index(['fecha', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('citas');
        Schema::dropIfExists('bloqueos_agenda');
        Schema::dropIfExists('horarios_medicos');
    }
};
