<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalogo_cie10', function (Blueprint $table) {
            $table->string('codigo_cie10', 10)->primary();
            $table->string('descripcion', 255)->index();
            $table->string('categoria', 100)->nullable()->index();
            $table->timestamps();
        });

        Schema::create('catalogo_medicamentos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_generico', 150)->index();
            $table->string('nombre_comercial', 150)->nullable();
            $table->string('forma_farmaceutica', 80)->nullable();
            $table->string('concentracion', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalogo_medicamentos');
        Schema::dropIfExists('catalogo_cie10');
    }
};
