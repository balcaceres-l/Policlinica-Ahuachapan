<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_manejo', function (Blueprint $table) {
            $table->uuid('id_plan')->primary();
            $table->uuid('id_consulta');
            $table->text('descripcion')->nullable();
            $table->text('indicaciones')->nullable();
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
        Schema::dropIfExists('plan_manejo');
    }
};
