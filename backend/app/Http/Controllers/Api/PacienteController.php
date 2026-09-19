<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Controller;
use App\Models\paciente;
use App\Models\responsable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PacienteController extends Controller
{
    use RespondsWithJson;

    public function index(Request $request): JsonResponse
    {
        $busqueda = $request->validate(['buscar' => ['nullable', 'string', 'max:100']])['buscar'] ?? null;
        $pacientes = paciente::query()->leftJoin('responsable', 'responsable.id_responsable', '=', 'paciente.id_responsable')
            ->select('paciente.*', 'responsable.nombre_completo as responsable_nombre', 'responsable.dui as responsable_documento',
                'responsable.telefono as responsable_telefono', 'responsable.parentesco as responsable_parentesco')
            ->when($busqueda, fn ($q) => $q->where(fn ($q) => $q->where('paciente.nombre_completo', 'like', "%{$busqueda}%")
                ->orWhere('paciente.numero_expediente', 'like', "%{$busqueda}%")
                ->orWhere('paciente.dui', 'like', "%{$busqueda}%")))
            ->orderBy('paciente.nombre_completo')->get();
        return $this->success($pacientes->map(fn ($p) => $this->present($p))->all());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $p = DB::transaction(function () use ($data, $request) {
            $r = $this->saveResponsable($data);
            $secuencia = (int) DB::table('paciente')->lockForUpdate()->count() + 1;
            do { $expediente = 'EXP-' . str_pad((string) $secuencia++, 6, '0', STR_PAD_LEFT); }
            while (paciente::where('numero_expediente', $expediente)->exists());
            return paciente::create([
                'numero_expediente' => $expediente,
                'nombre_completo' => $data['nombre_completo'], 'fecha_nacimiento' => $data['fecha_nacimiento'],
                'dui' => $data['dui'] ?? null, 'telefono' => $data['telefono'] ?? null,
                'es_menor_edad' => $data['es_menor_edad'], 'id_responsable' => $r?->id_responsable,
                'id_registrado_por' => $request->user()->id,
            ]);
        });
        return $this->success($this->present($p->refresh()), 'Paciente registrado correctamente.', 201);
    }

    public function show(paciente $paciente): JsonResponse
    {
        return $this->success($this->present($paciente));
    }

    public function update(Request $request, paciente $paciente): JsonResponse
    {
        $data = $this->validatePayload($request, $paciente);
        DB::transaction(function () use ($data, $paciente) {
            $r = $this->saveResponsable($data, $paciente->id_responsable);
            $paciente->update([
                'nombre_completo' => $data['nombre_completo'], 'fecha_nacimiento' => $data['fecha_nacimiento'],
                'dui' => $data['dui'] ?? null, 'telefono' => $data['telefono'] ?? null,
                'es_menor_edad' => $data['es_menor_edad'], 'id_responsable' => $r?->id_responsable,
            ]);
        });
        return $this->success($this->present($paciente->refresh()), 'Paciente actualizado correctamente.');
    }

    public function destroy(paciente $paciente): JsonResponse
    {
        if (DB::table('cita')->where('id_paciente', $paciente->id_paciente)->exists()) {
            return $this->failure('No se puede eliminar un paciente con citas registradas.', 409);
        }
        $paciente->delete();
        return $this->success(null, 'Paciente eliminado correctamente.');
    }

    private function validatePayload(Request $request, ?paciente $paciente = null): array
    {
        return $request->validate([
            'nombre_completo' => ['required', 'string', 'max:150'],
            'fecha_nacimiento' => ['required', 'date', 'before_or_equal:today'],
            'tipo_documento' => ['nullable', Rule::in(['DUI', 'PASAPORTE'])],
            'dui' => ['nullable', 'string', 'max:15', Rule::unique('paciente', 'dui')->ignore($paciente?->id_paciente, 'id_paciente')],
            'telefono' => ['nullable', 'string', 'max:15'],
            'es_menor_edad' => ['required', 'boolean'],
            'responsable_nombre' => ['required_if:es_menor_edad,true', 'nullable', 'string', 'max:150'],
            'responsable_documento' => ['nullable', 'string', 'max:15'],
            'responsable_telefono' => ['nullable', 'string', 'max:15'],
            'responsable_parentesco' => ['nullable', 'string', 'max:50'],
        ]);
    }

    private function saveResponsable(array $data, ?string $id = null): ?responsable
    {
        if (! $data['es_menor_edad']) return null;
        return responsable::updateOrCreate(['id_responsable' => $id ?? (string) \Illuminate\Support\Str::uuid()], [
            'nombre_completo' => $data['responsable_nombre'],
            'dui' => $data['responsable_documento'] ?? null,
            'telefono' => $data['responsable_telefono'] ?? null,
            'parentesco' => $data['responsable_parentesco'] ?? null,
        ]);
    }

    private function present(paciente $p): array
    {
        $r = $p->id_responsable ? responsable::find($p->id_responsable) : null;
        return [
            'id' => $p->id_paciente, 'numero_expediente' => $p->numero_expediente,
            'nombre_completo' => $p->nombre_completo, 'fecha_nacimiento' => $p->fecha_nacimiento?->toDateString(),
            'tipo_documento' => 'DUI', 'dui' => $p->dui ?? '', 'telefono' => $p->telefono ?? '',
            'es_menor_edad' => $p->es_menor_edad, 'responsable_nombre' => $r?->nombre_completo,
            'responsable_documento' => $r?->dui, 'responsable_tipo_documento' => 'DUI',
            'responsable_telefono' => $r?->telefono, 'responsable_parentesco' => $r?->parentesco,
            'fecha_registro' => $p->fecha_registro?->toDateString(),
        ];
    }
}
