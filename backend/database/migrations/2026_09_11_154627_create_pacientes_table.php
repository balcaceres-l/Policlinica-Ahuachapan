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
        Schema::create('pacientes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre_completo', 150)->index();
            $table->date('fecha_nacimiento');
            $table->string('dui',10)->unique()->nullable();
            $table->string('telefono', 15)->nullable();
            $table->string('direccion', 250)->nullable();
            $table->boolean('es_menor_edad')->default(false);

            $table->foreignId('id_registrado_por');
            $table->foreignId('id_responsable');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pacientes');
    }
};
