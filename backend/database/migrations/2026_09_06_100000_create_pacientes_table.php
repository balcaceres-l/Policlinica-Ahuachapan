<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pacientes', function (Blueprint $table) {
            $table->id();
            $table->string('numero_expediente', 20)->unique();
            $table->string('nombre_completo', 150)->index();
            $table->date('fecha_nacimiento');
            $table->string('dui', 15)->nullable()->unique();
            $table->string('telefono', 25)->nullable();
            $table->string('direccion', 250)->nullable();

            // Obligatorios para menores; la exigencia se valida en el Request
            // porque depende de la edad calculada.
            $table->boolean('es_menor_edad')->default(false);
            $table->string('nombre_responsable', 150)->nullable();
            $table->string('dui_responsable', 15)->nullable();
            $table->string('parentesco_responsable', 50)->nullable();
            $table->string('telefono_responsable', 25)->nullable();

            $table->text('historial_familiar')->nullable();
            $table->text('historial_personal')->nullable();

            $table->foreignId('registrado_por_id')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pacientes');
    }
};
