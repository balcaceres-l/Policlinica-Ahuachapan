<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bloqueo_agenda', function (Blueprint $table) {
            $table->uuid('id_bloqueo')->primary();
            $table->uuid('id_medico');
            $table->date('fecha');
            $table->string('motivo', 255)->nullable();
            $table->uuid('id_creado_por');

            $table->dateTime('fecha_creacion')->useCurrent();

            $table->foreign('id_medico')
                ->references('id')->on('users')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('id_creado_por')
                ->references('id')->on('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            // Un día bloqueado no admite un segundo registro contradictorio.
            $table->unique(['id_medico', 'fecha'], 'uq_bloqueo_medico_fecha');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bloqueo_agenda');
    }
};
