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
        Schema::create('especialidads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre', 100)->unique();
            $table->text('descripcion')->nullable();
            $table->enum('estado', ['activa', 'inactiva'])->default('activa');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('especialidads');
    }
};
