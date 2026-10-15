<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * La lista de códigos viene de la API de la OMS: se guarda su título oficial
     * (en inglés) y la versión de la que salió, junto a la descripción en
     * español que usa el buscador.
     */
    public function up(): void
    {
        Schema::table('catalogo_cie10', function (Blueprint $table) {
            $table->string('titulo_oms', 500)->nullable()->after('descripcion');
            $table->string('version_oms', 10)->nullable()->after('titulo_oms');
        });
    }

    public function down(): void
    {
        Schema::table('catalogo_cie10', function (Blueprint $table) {
            $table->dropColumn(['titulo_oms', 'version_oms']);
        });
    }
};
