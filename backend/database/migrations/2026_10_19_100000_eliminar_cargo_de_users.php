<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El cargo del usuario no se usaba en ninguna regla: en los médicos repetía
     * (o contradecía) sus especialidades asignadas, y en el resto era un texto
     * descriptivo. Se elimina (decidido con Katherinne el 2026-10-19); bajo el
     * nombre del médico ahora se muestra su N.º JVPM.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('cargo');
        });
    }

    /** Vuelve la columna, vacía: los textos que tenía no se recuperan. */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('cargo')->nullable()->after('usuario');
        });
    }
};
