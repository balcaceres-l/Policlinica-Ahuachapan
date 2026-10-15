<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catálogo CIE-10 (HU-44). Se carga con `php artisan cie10:importar`
     * desde un archivo oficial; no trae datos de fábrica.
     */
    public function up(): void
    {
        Schema::create('catalogo_cie10', function (Blueprint $table) {
            $table->string('codigo', 10)->primary();
            $table->string('descripcion', 500);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('catalogo_cie10');
    }
};
