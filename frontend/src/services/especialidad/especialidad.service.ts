import type {
  Especialidad,
  EspecialidadConMedicos,
  NuevaEspecialidad,
} from '@/types/especialidad.types';
import type { Usuario } from '@/types/user.types';
import { delay, normalizar } from '@/lib/utils';
import {
  mockEspecialidades,
  mockMedicoEspecialidades,
  mockUsuarios,
  siguienteIdEspecialidad,
} from '@/services/mockData';

/** Agrega el conteo de médicos vinculados a cada especialidad. */
const conConteo = (): Especialidad[] =>
  mockEspecialidades.map((esp) => ({
    ...esp,
    cantidadMedicos: mockMedicoEspecialidades.filter(
      (rel) => rel.especialidadId === esp.id,
    ).length,
  }));

export const getEspecialidades = async (): Promise<Especialidad[]> => {
  // TODO: api.get<ApiResponse<Especialidad[]>>('/especialidades')
  await delay(300);
  return conConteo();
};

export const getEspecialidadesActivas = async (): Promise<Especialidad[]> => {
  // TODO: api.get<ApiResponse<Especialidad[]>>('/especialidades?estado=ACTIVA')
  await delay(250);
  return conConteo().filter((e) => e.estado === 'ACTIVA');
};

/** HU-07 — registro de una nueva especialidad. */
export const crearEspecialidad = async (
  payload: NuevaEspecialidad,
): Promise<Especialidad> => {
  // TODO: api.post<ApiResponse<Especialidad>>('/especialidades', payload)
  await delay(500);

  const duplicada = mockEspecialidades.some(
    (e) => normalizar(e.nombre) === normalizar(payload.nombre),
  );
  if (duplicada) {
    throw new Error(`Ya existe una especialidad llamada "${payload.nombre}".`);
  }

  const nueva: Especialidad = {
    id: siguienteIdEspecialidad(),
    nombre: payload.nombre.trim(),
    descripcion: payload.descripcion?.trim() ?? '',
    estado: 'ACTIVA',
    fechaRegistro: new Date().toISOString().slice(0, 10),
    cantidadMedicos: 0,
  };

  mockEspecialidades.push(nueva);
  return nueva;
};

/** HU-08 — especialidades asignadas a un médico. */
export const getEspecialidadesDeMedico = async (
  medicoId: number,
): Promise<Especialidad[]> => {
  // TODO: api.get<ApiResponse<Especialidad[]>>(`/medicos/${medicoId}/especialidades`)
  await delay(200);
  const ids = mockMedicoEspecialidades
    .filter((rel) => rel.medicoId === medicoId)
    .map((rel) => rel.especialidadId);

  return conConteo().filter((esp) => ids.includes(esp.id));
};

export const asignarEspecialidad = async (
  medicoId: number,
  especialidadId: number,
): Promise<void> => {
  // TODO: api.post(`/medicos/${medicoId}/especialidades`, { especialidadId })
  await delay(350);
  const yaExiste = mockMedicoEspecialidades.some(
    (rel) => rel.medicoId === medicoId && rel.especialidadId === especialidadId,
  );
  if (yaExiste) {
    throw new Error('El médico ya tiene asignada esa especialidad.');
  }
  mockMedicoEspecialidades.push({ medicoId, especialidadId });
};

export const quitarEspecialidad = async (
  medicoId: number,
  especialidadId: number,
): Promise<void> => {
  // TODO: api.delete(`/medicos/${medicoId}/especialidades/${especialidadId}`)
  await delay(350);
  const indice = mockMedicoEspecialidades.findIndex(
    (rel) => rel.medicoId === medicoId && rel.especialidadId === especialidadId,
  );
  if (indice >= 0) {
    mockMedicoEspecialidades.splice(indice, 1);
  }
};

/** HU-09 — catálogo de especialidades activas con sus médicos. */
export const getCatalogoEspecialidades = async (): Promise<EspecialidadConMedicos[]> => {
  // TODO: api.get<ApiResponse<EspecialidadConMedicos[]>>('/catalogo/especialidades')
  await delay(400);

  return conConteo()
    .filter((esp) => esp.estado === 'ACTIVA')
    .map((esp) => {
      const medicos: Usuario[] = mockMedicoEspecialidades
        .filter((rel) => rel.especialidadId === esp.id)
        .map((rel) => mockUsuarios.find((u) => u.id === rel.medicoId))
        .filter((u): u is Usuario => Boolean(u) && u!.rol === 'MEDICO');

      return { ...esp, medicos };
    });
};
