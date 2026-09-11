<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('citas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->date('fecha')->index();
            $table->time('hora_inicio');
            $table->time('hora_fin');
            $table->enum('tipo_cita', ['regular', 'emergencia', 'sobrecupo'])->default('regular');
            $table->enum('estado', ['agendada', 'en_espera', 'en_atencion', 'atendida', 'no_asistio','cancelada'])->default('agendada')->index();
            $table->text('motivo_cancelacion')->nullable();
            $table->dateTime('hora_llegada')->nullable();
            $table->integer('orden_atencion')->nullable();
            $table->dateTime('fecha_creacion')->nullable()->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->dateTime('fecha_actualizacion')->nullable()->default(DB::raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

            $table->foreingId('id_paciente');
            $table->foreingId('id_medico');
            $table->foreingId('id_especialidad');
            $table->foreingId('id_creado_por');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('citas');
    }
};
