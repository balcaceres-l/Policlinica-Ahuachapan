<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Los signos vitales pasan a colgar de la cita en vez de la consulta.
 *
 * Recepción los toma durante el triaje, cuando el paciente llega y la consulta
 * todavía no existe; el médico puede tomarlos o corregirlos después. Atarlos a
 * la consulta hacía imposible el primer caso.
 *
 * Se recrea la tabla porque está vacía: nada la consumía todavía.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('signos_vitales');

        Schema::create('signos_vitales', function (Blueprint $table) {
            $table->uuid('id_signos')->primary();
            // Una toma por cita: se sobrescribe al corregir, no se duplica.
            $table->uuid('id_cita')->unique();

            $table->smallInteger('presion_sistolica')->nullable();
            $table->smallInteger('presion_diastolica')->nullable();
            $table->smallInteger('frecuencia_cardiaca')->nullable();
            $table->smallInteger('frecuencia_respiratoria')->nullable();
            $table->decimal('temperatura_c', 4, 1)->nullable();
            $table->decimal('peso_kg', 5, 2)->nullable();
            $table->decimal('talla_cm', 5, 2)->nullable();
            $table->decimal('imc', 4, 1)->nullable();
            $table->smallInteger('saturacion_oxigeno')->nullable();
            $table->text('observaciones')->nullable();

            $table->uuid('id_registrado_por');
            $table->dateTime('fecha_registro')->useCurrent();

            $table->foreign('id_cita')
                ->references('id_cita')->on('cita')
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
