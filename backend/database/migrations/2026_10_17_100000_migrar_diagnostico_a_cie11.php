<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El diagnóstico pasa a CIE-11 consultada en vivo a la API de la OMS: ya no hay
     * catálogo propio. Se guarda la categoría elegida (código, URIs y release); el
     * nombre en español queda en `descripcion`. Sin código es texto libre.
     */
    public function up(): void
    {
        Schema::dropIfExists('catalogo_cie10');

        Schema::table('diagnostico', function (Blueprint $table) {
            $table->renameColumn('codigo_cie10', 'codigo_cie11');
        });

        Schema::table('diagnostico', function (Blueprint $table) {
            $table->string('codigo_cie11', 20)->nullable()->change();
            $table->string('uri_foundation', 255)->nullable()->after('codigo_cie11');
            $table->string('uri_linearizacion', 255)->nullable()->after('uri_foundation');
            $table->string('release_cie11', 10)->nullable()->after('uri_linearizacion');
        });

        // Los códigos anteriores eran CIE-10: no son válidos en CIE-11. Esos
        // diagnósticos quedan como texto libre y conservan su descripción.
        DB::table('diagnostico')->update(['codigo_cie11' => null]);
    }

    public function down(): void
    {
        Schema::table('diagnostico', function (Blueprint $table) {
            $table->dropColumn(['uri_foundation', 'uri_linearizacion', 'release_cie11']);
        });

        Schema::table('diagnostico', function (Blueprint $table) {
            $table->renameColumn('codigo_cie11', 'codigo_cie10');
        });

        Schema::create('catalogo_cie10', function (Blueprint $table) {
            $table->string('codigo', 10)->primary();
            $table->string('descripcion', 500);
            $table->string('titulo_oms', 500)->nullable();
            $table->string('version_oms', 10)->nullable();
            $table->timestamps();
        });
    }
};
