<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Consulta inmediata: el médico registra al paciente nuevo solo con los datos
     * obligatorios y la recepcionista termina de llenar el registro. Mientras
     * tanto el paciente queda marcado con datos pendientes.
     */
    public function up(): void
    {
        Schema::table('paciente', function (Blueprint $table) {
            $table->boolean('datos_pendientes')->default(false)->after('estado');
        });
    }

    public function down(): void
    {
        Schema::table('paciente', function (Blueprint $table) {
            $table->dropColumn('datos_pendientes');
        });
    }
};
