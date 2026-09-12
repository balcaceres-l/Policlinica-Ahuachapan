<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('historial_clinico', function (Blueprint $table) {
            $table->uuid('id_historial')->primary();

            $table->uuid('id_paciente')->unique();

            $table->text('historial_familiar')->nullable();
            $table->text('historial_personal')->nullable();

            $table->foreign('id_paciente')
                ->references('id_paciente')
                ->on('paciente')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historial_clinico');
    }
};