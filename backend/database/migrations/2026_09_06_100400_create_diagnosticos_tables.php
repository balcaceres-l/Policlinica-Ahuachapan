<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnosticos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consulta_id')->constrained('consultas')->restrictOnDelete();

            // Código de catálogo o texto libre. Ambos nullable; que venga al
            // menos uno se valida en el Request.
            $table->string('codigo_cie10', 10)->nullable();
            $table->text('descripcion_texto_libre')->nullable();

            // PRESUNTIVO | DEFINITIVO
            $table->string('tipo', 12)->default('PRESUNTIVO');
            $table->timestamps();

            $table->foreign('codigo_cie10')
                ->references('codigo_cie10')->on('catalogo_cie10')
                ->restrictOnDelete();
        });

        Schema::create('planes_manejo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consulta_id')->constrained('consultas')->restrictOnDelete();
            $table->text('descripcion');
            $table->text('indicaciones')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planes_manejo');
        Schema::dropIfExists('diagnosticos');
    }
};
