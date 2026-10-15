<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Número de junta de vigilancia del profesional: JVPM (profesión médica) y
     * JVPE (enfermería). Lo imprime la receta junto a la firma del médico.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('jvpm', 20)->nullable()->unique()->after('telefono');
            $table->string('jvpe', 20)->nullable()->unique()->after('jvpm');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['jvpm']);
            $table->dropUnique(['jvpe']);
            $table->dropColumn(['jvpm', 'jvpe']);
        });
    }
};
