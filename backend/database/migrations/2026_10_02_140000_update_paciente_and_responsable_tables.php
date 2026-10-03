<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('responsable', function (Blueprint $table) {
            $table->dropUnique(['dui']);
            $table->text('nombre_completo')->change();
            $table->text('dui')->nullable()->change();
            $table->text('telefono')->nullable()->change();
        });

        Schema::table('paciente', function (Blueprint $table) {
            $table->dropIndex('idx_paciente_nombre');
            $table->dropUnique(['dui']);
            $table->string('estado', 20)->default('ACTIVO')->after('es_menor_edad');
            $table->text('nombre_completo')->change();
            $table->text('dui')->nullable()->change();
            $table->text('telefono')->nullable()->change();
            $table->text('direccion')->nullable()->change();

            $table->index('estado', 'idx_paciente_estado');
        });
    }

    public function down(): void
    {
        Schema::table('paciente', function (Blueprint $table) {
            $table->dropIndex('idx_paciente_estado');
            $table->dropColumn('estado');
            $table->string('nombre_completo', 150)->change();
            $table->string('dui', 15)->nullable()->unique()->change();
            $table->string('telefono', 15)->nullable()->change();
            $table->string('direccion', 250)->nullable()->change();
            $table->index('nombre_completo', 'idx_paciente_nombre');
        });

        Schema::table('responsable', function (Blueprint $table) {
            $table->string('nombre_completo', 150)->change();
            $table->string('dui', 15)->nullable()->unique()->change();
            $table->string('telefono', 15)->nullable()->change();
        });
    }
};
