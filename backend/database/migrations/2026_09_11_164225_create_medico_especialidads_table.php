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
        Schema::create('medico_especialidads', function (Blueprint $table) {
            $table->foreignId('id_usuario'); 
            $table->uuid('id_especialidad');
            
            $table->timestamps();
            $table->primary(['id_usuario', 'id_especialidad']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medico_especialidads');
    }
};
