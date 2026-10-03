<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consulta', function (Blueprint $table) {
            $table->double('precio')->nullable()->after('notas_adicionales');
            $table->double('total')->nullable()->after('precio');
        });
    }

    public function down(): void
    {
        Schema::table('consulta', function (Blueprint $table) {
            $table->dropColumn(['precio', 'total']);
        });
    }
};
