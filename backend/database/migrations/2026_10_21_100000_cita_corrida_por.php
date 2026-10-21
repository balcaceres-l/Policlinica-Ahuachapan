<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cuando una cita se corre (por una emergencia, un bloqueo parcial o el atraso del médico) queda
     * anotado por qué y a qué hora estaba antes, para que recepción lo vea en la agenda. Se borra
     * si la cita se reprograma a mano.
     */
    public function up(): void
    {
        Schema::table('cita', function (Blueprint $table) {
            $table->time('hora_inicio_original')->nullable()->after('hora_fin');
            $table->string('corrida_por', 20)->nullable()->after('hora_inicio_original');
        });
    }

    public function down(): void
    {
        Schema::table('cita', function (Blueprint $table) {
            $table->dropColumn(['hora_inicio_original', 'corrida_por']);
        });
    }
};
