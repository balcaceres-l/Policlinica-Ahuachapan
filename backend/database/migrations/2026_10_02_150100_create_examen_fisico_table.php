<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('examen_fisico', function (Blueprint $table) {
            $table->uuid('id_examen')->primary();
            $table->uuid('id_consulta');
            $table->string('region_anatomica', 100)->nullable();
            $table->text('hallazgos')->nullable();
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
        Schema::dropIfExists('examen_fisico');
    }
};
