<?php

namespace Tests\Unit;

use App\Models\paciente;
use App\Models\responsable;
use Tests\TestCase;

class PacienteModeloTest extends TestCase
{
    public function test_datos_sensibles_se_almacenan_cifrados_y_se_descifran_al_leer(): void
    {
        $p = new paciente([
            'nombre_completo' => 'Roberto Alexander Ramos',
            'dui' => '01234567-8',
            'telefono' => '7123-4567',
        ]);

        $rawAttributes = $p->getAttributes();

        // En memoria/BD cruda no está en texto plano
        $this->assertNotEquals('Roberto Alexander Ramos', $rawAttributes['nombre_completo']);
        $this->assertNotEquals('01234567-8', $rawAttributes['dui']);
        $this->assertNotEquals('7123-4567', $rawAttributes['telefono']);

        // Al acceder a la propiedad, Laravel lo descifra automáticamente
        $this->assertSame('Roberto Alexander Ramos', $p->nombre_completo);
        $this->assertSame('01234567-8', $p->dui);
        $this->assertSame('7123-4567', $p->telefono);
    }

    public function test_responsable_cifra_sus_datos(): void
    {
        $r = new responsable([
            'nombre_completo' => 'María Elena Ramos',
            'dui' => '87654321-0',
            'telefono' => '7999-8888',
        ]);

        $rawAttributes = $r->getAttributes();

        $this->assertNotEquals('María Elena Ramos', $rawAttributes['nombre_completo']);
        $this->assertSame('María Elena Ramos', $r->nombre_completo);
        $this->assertSame('87654321-0', $r->dui);
    }
}
