<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('responsable', function (Blueprint $table) {
            $table->uuid('id_responsable')->primary();

            $table->string('nombre_completo', 150);
            $table->string('dui', 15)->nullable()->unique();
            $table->string('telefono', 15)->nullable();
            $table->string('parentesco', 50)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('responsable');
    }
};