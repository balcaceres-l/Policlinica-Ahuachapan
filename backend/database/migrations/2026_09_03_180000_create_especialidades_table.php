<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('especialidades', function (Blueprint $table) {
            $table->id();
            $table->string('nombre')->unique();
            $table->text('descripcion')->nullable();
            $table->string('estado', 10)->default('ACTIVA')->index();
            $table->timestamps();
        });

        Schema::create('especialidad_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('especialidad_id')->constrained('especialidades')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['especialidad_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('especialidad_user');
        Schema::dropIfExists('especialidades');
    }
};
