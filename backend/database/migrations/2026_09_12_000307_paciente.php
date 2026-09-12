<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paciente', function (Blueprint $table) {
            $table->uuid('id_paciente')->primary();

            $table->string('numero_expediente', 20)->unique();
            $table->string('nombre_completo', 150);
            $table->date('fecha_nacimiento');
            $table->string('dui', 15)->nullable()->unique();
            $table->string('telefono', 15)->nullable();
            $table->string('direccion', 250)->nullable();

            $table->boolean('es_menor_edad')->default(false);

            $table->uuid('id_responsable')->nullable();

            $table->uuid('id_registrado_por')
                ->constrained('users')
                ->restrictOnDelete()
                ->cascadeOnUpdate();

            $table->dateTime('fecha_registro')
                ->useCurrent();

            $table->index('nombre_completo', 'idx_paciente_nombre');
            $table->index('id_responsable', 'idx_paciente_responsable');

            $table->foreign('id_responsable')
                ->references('id_responsable')
                ->on('responsable')
                ->nullOnDelete()
                ->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paciente');
    }
};