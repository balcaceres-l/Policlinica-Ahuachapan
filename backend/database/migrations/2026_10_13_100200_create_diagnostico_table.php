<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Diagnósticos de una consulta (HU-20). `codigo_cie10` es null cuando el
     * médico lo dejó como texto libre. Guarda el código tal cual y no una
     * llave al catálogo: recargar el catálogo no debe alterar el historial.
     */
    public function up(): void
    {
        Schema::create('diagnostico', function (Blueprint $table) {
            $table->uuid('id_diagnostico')->primary();
            $table->uuid('id_consulta');
            $table->string('codigo_cie10', 10)->nullable();
            $table->string('descripcion', 500);
            $table->timestamps();

            $table->foreign('id_consulta')
                ->references('id_consulta')->on('consulta')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->index('id_consulta');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostico');
    }
};
