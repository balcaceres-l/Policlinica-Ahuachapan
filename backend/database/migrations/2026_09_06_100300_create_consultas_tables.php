<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consultas', function (Blueprint $table) {
            $table->id();
            // Toda consulta nace de una cita, incluidas emergencias y sobrecupos.
            $table->foreignId('cita_id')->unique()->constrained('citas')->restrictOnDelete();
            $table->foreignId('medico_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('especialidad_atencion_id')->nullable()
                ->constrained('especialidades')->nullOnDelete();

            $table->dateTime('fecha_hora_inicio');
            // Null mientras la consulta sigue abierta. Exceder el bloque solo
            // dispara una alerta; el cierre siempre es manual.
            $table->dateTime('fecha_hora_fin')->nullable();

            $table->text('motivo_consulta')->nullable();
            $table->text('notas_adicionales')->nullable();
            $table->timestamps();
        });

        Schema::create('signos_vitales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consulta_id')->unique()->constrained('consultas')->restrictOnDelete();

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

            // Recepción captura y el médico confirma; se guarda quién registró
            // porque ambos roles pueden escribir aquí.
            $table->foreignId('registrado_por_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('examenes_fisicos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consulta_id')->constrained('consultas')->restrictOnDelete();
            // Opcional: permite capturar el examen como texto corrido y dejar
            // abierta la posibilidad de estructurarlo por región más adelante.
            $table->string('region_anatomica', 100)->nullable();
            $table->text('hallazgos');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('examenes_fisicos');
        Schema::dropIfExists('signos_vitales');
        Schema::dropIfExists('consultas');
    }
};
