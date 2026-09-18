<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('signos_vitales', function (Blueprint $table) {
            $table->uuid('id_signos')->primary();
            // Una toma por consulta: se sobrescribe al corregir, no se duplica.
            $table->uuid('id_consulta')->unique();

            $table->smallInteger('presion_sistolica')->nullable();
            $table->smallInteger('presion_diastolica')->nullable();
            $table->smallInteger('frecuencia_cardiaca')->nullable();
            $table->smallInteger('frecuencia_respiratoria')->nullable();
            $table->decimal('temperatura_c', 4, 1)->nullable();
            $table->decimal('peso_kg', 5, 2)->nullable();
            $table->decimal('talla_cm', 5, 2)->nullable();
            // Derivado de peso y talla; se guarda para no recalcularlo al leer.
            $table->decimal('imc', 4, 1)->nullable();
            $table->smallInteger('saturacion_oxigeno')->nullable();
            $table->text('observaciones')->nullable();

            $table->uuid('id_registrado_por');
            $table->dateTime('fecha_registro')->useCurrent();

            $table->foreign('id_consulta')
                ->references('id_consulta')->on('consulta')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->foreign('id_registrado_por')
                ->references('id')->on('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('signos_vitales');
    }
};
