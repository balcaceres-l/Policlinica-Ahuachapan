<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalle_receta', function (Blueprint $table) {
            $table->uuid('id_detalle')->primary();
            $table->uuid('id_receta');
            $table->string('nombre_medicamento', 200);
            $table->string('dosis', 100);
            $table->string('via_administracion', 50)->nullable();
            $table->string('frecuencia', 100);
            $table->string('duracion', 100)->nullable();
            $table->text('indicaciones')->nullable();
            $table->timestamps();

            $table->foreign('id_receta')
                ->references('id_receta')->on('receta_medica')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->index('id_receta');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_receta');
    }
};
