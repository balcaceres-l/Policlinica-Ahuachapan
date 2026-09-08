<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recetas_medicas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consulta_id')->constrained('consultas')->restrictOnDelete();
            $table->dateTime('fecha_emision')->useCurrent();
            $table->text('observaciones_generales')->nullable();
            $table->timestamps();
        });

        Schema::create('detalles_receta', function (Blueprint $table) {
            $table->id();
            // Única cascada del esquema clínico: la línea no significa nada
            // fuera de su receta.
            $table->foreignId('receta_id')->constrained('recetas_medicas')->cascadeOnDelete();

            // Medicamento de catálogo o escrito a mano.
            $table->foreignId('medicamento_id')->nullable()
                ->constrained('catalogo_medicamentos')->restrictOnDelete();
            $table->string('medicamento_texto_libre', 200)->nullable();

            $table->string('dosis', 100);
            $table->string('via_administracion', 50)->nullable();
            $table->string('frecuencia', 100);
            $table->string('duracion', 100)->nullable();
            $table->text('indicaciones')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalles_receta');
        Schema::dropIfExists('recetas_medicas');
    }
};
