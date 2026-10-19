<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * HU-31 — constancia médica: certifica la atención o la condición de salud
     * del paciente. Se emite desde una consulta, por el médico que la atendió.
     */
    public function up(): void
    {
        Schema::create('constancia_medica', function (Blueprint $table) {
            $table->uuid('id_constancia')->primary();
            $table->uuid('id_consulta');
            $table->uuid('id_paciente');
            $table->uuid('id_medico');
            $table->text('motivo');
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

            $table->index('id_consulta');
            $table->index('id_paciente');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('constancia_medica');
    }
};
