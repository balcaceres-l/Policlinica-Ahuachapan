<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Resultados de laboratorio del paciente (HU-41). Cada resultado lleva
     * texto, un adjunto (imagen o PDF) o ambos. El archivo vive en el disco
     * privado y solo se sirve a usuarios autenticados.
     */
    public function up(): void
    {
        Schema::create('resultado_laboratorio', function (Blueprint $table) {
            $table->uuid('id_resultado')->primary();
            $table->uuid('id_paciente');
            $table->uuid('id_consulta')->nullable();
            $table->uuid('id_registrado_por');
            $table->string('nombre_examen', 150);
            $table->date('fecha_examen');
            $table->text('resultado_texto')->nullable();
            $table->string('archivo_ruta')->nullable();
            $table->string('archivo_nombre')->nullable();
            $table->string('archivo_mime', 100)->nullable();
            $table->unsignedInteger('archivo_tamano')->nullable();
            $table->timestamps();

            $table->foreign('id_paciente')
                ->references('id_paciente')->on('paciente')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('id_consulta')
                ->references('id_consulta')->on('consulta')
                ->nullOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('id_registrado_por')
                ->references('id')->on('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->index(['id_paciente', 'fecha_examen']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resultado_laboratorio');
    }
};
