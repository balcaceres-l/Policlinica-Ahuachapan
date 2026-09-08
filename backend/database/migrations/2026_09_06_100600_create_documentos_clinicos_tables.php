<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resultados_laboratorio', function (Blueprint $table) {
            $table->id();
            $table->foreignId('paciente_id')->constrained('pacientes')->restrictOnDelete();
            // Laboratorio no requiere cita previa, así que el resultado puede
            // colgar del paciente sin consulta asociada.
            $table->foreignId('consulta_id')->nullable()
                ->constrained('consultas')->nullOnDelete();

            $table->string('tipo_examen', 100);
            $table->date('fecha_examen');
            $table->text('resultado_texto')->nullable();
            // Los tipos de archivo permitidos se restringen en la validación.
            $table->string('ruta_archivo', 500)->nullable();

            $table->foreignId('registrado_por_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['paciente_id', 'fecha_examen']);
        });

        Schema::create('documentos_medicos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consulta_id')->constrained('consultas')->restrictOnDelete();

            // CONSTANCIA | REFERENCIA_INTERNA | REFERENCIA_EXTERNA | INCAPACIDAD
            $table->string('tipo_documento', 25)->index();
            // Se persiste el texto redactado por el médico, no una referencia
            // al expediente: la referencia externa nunca lo expone completo.
            $table->text('contenido');

            $table->foreignId('medico_emisor_id')->constrained('users')->restrictOnDelete();
            // Solo en referencias internas.
            $table->foreignId('medico_destino_id')->nullable()
                ->constrained('users')->restrictOnDelete();
            // Solo en referencias externas.
            $table->string('institucion_destino', 200)->nullable();

            $table->dateTime('fecha_emision')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos_medicos');
        Schema::dropIfExists('resultados_laboratorio');
    }
};
