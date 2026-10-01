<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('especialidades', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nombre')->unique();
            $table->text('descripcion')->nullable();
            $table->string('estado', 10)->default('ACTIVA')->index();
            $table->timestamps();
        });

        Schema::create('especialidad_user', function (Blueprint $table) {
            $table->id();
            $table->uuid('especialidad_id');
            $table->uuid('user_id');
            $table->timestamps();
            $table->unique(['especialidad_id', 'user_id']);
            $table->foreign('especialidad_id')->references('id')->on('especialidades')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('especialidad_user');
        Schema::dropIfExists('especialidades');
    }
};
