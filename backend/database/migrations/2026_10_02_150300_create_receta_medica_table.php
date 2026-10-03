<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receta_medica', function (Blueprint $table) {
            $table->uuid('id_receta')->primary();
            $table->uuid('id_consulta');
            $table->dateTime('fecha_emision')->useCurrent();
            $table->text('observaciones_generales')->nullable();
            $table->timestamps();

            $table->foreign('id_consulta')
                ->references('id_consulta')->on('consulta')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->index('id_consulta');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receta_medica');
    }
};
