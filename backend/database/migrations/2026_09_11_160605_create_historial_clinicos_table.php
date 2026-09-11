<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('historial_clinicos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->text('historial_familiar')->nullable();
            $table->text('historial_personal')->nullable();

            $table->foreignId('id_paciente');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historial_clinicos');
    }
};
