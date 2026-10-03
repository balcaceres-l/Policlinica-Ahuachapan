<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consulta', function (Blueprint $table) {
            $table->unsignedInteger('segundos_transcurridos')->default(0)->after('fecha_hora_fin');
            $table->boolean('en_pausa')->default(false)->after('segundos_transcurridos');
        });
    }

    public function down(): void
    {
        Schema::table('consulta', function (Blueprint $table) {
            $table->dropColumn(['segundos_transcurridos', 'en_pausa']);
        });
    }
};
