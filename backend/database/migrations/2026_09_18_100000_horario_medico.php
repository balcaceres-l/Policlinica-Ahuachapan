<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('horario_medico', function (Blueprint $table) {
            $table->uuid('id_horario')->primary();
            $table->uuid('id_medico');

            // LUNES | MARTES | MIERCOLES | JUEVES | VIERNES | SABADO | DOMINGO
            $table->string('dia_semana', 10);
            $table->time('hora_inicio');
            $table->time('hora_fin');

            $table->dateTime('fecha_creacion')->useCurrent();

            $table->foreign('id_medico')
                ->references('id')->on('users')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->index(['id_medico', 'dia_semana'], 'idx_horario_medico_dia');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('horario_medico');
    }
};
