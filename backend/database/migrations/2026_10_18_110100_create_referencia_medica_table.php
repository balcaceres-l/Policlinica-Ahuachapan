<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * HU-32 — referencia médica. INTERNA: hacia otro médico de la policlínica,
     * el documento lleva el expediente completo. EXTERNA: hacia un especialista
     * de fuera, el documento lleva solo lo que el médico escribe.
     */
    public function up(): void
    {
        Schema::create('referencia_medica', function (Blueprint $table) {
            $table->uuid('id_referencia')->primary();
            $table->uuid('id_consulta');
            $table->uuid('id_paciente');
            $table->uuid('id_medico');
            $table->string('tipo', 10);
            $table->uuid('id_medico_destino')->nullable();
            $table->string('destino', 200)->nullable();
            $table->string('especialidad_destino', 150)->nullable();
            $table->text('motivo');
            $table->text('resumen_clinico')->nullable();
            $table->dateTime('fecha_emision')->useCurrent();
            $table->timestamps();

            $table->foreign('id_consulta')
                ->references('id_consulta')->on('consulta')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreign('id_paciente')
                ->references('id_paciente')->on('paciente')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreign('id_medico')
                ->references('id')->on('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->foreign('id_medico_destino')
                ->references('id')->on('users')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->index('id_consulta');
            $table->index('id_paciente');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referencia_medica');
    }
};
