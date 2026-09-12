import api from '@/services/api';
import type { ApiResponse } from '@/types/api.types';
import type {
  Especialidad,
  EspecialidadConMedicos,
  EstadoEspecialidad,
  NuevaEspecialidad,
} from '@/types/especialidad.types';

/**
 * El endpoint acepta `?estado=`, pero el listado del administrador muestra
 * activas e inactivas, así que solo se filtra donde hace falta.
 */
export const getEspecialidades = async (): Promise<Especialidad[]> => {
  const { data } = await api.get<ApiResponse<Especialidad[]>>('/especialidades');
  return data.data;
};

export const getEspecialidadesActivas = async (): Promise<Especialidad[]> => {
  const { data } = await api.get<ApiResponse<Especialidad[]>>('/especialidades', {
    params: { estado: 'ACTIVA' },
  });
  return data.data;
};

/** HU-07 — registro de una especialidad. El duplicado lo rechaza el backend. */
export const crearEspecialidad = async (payload: NuevaEspecialidad): Promise<Especialidad> => {
  const { data } = await api.post<ApiResponse<Especialidad>>('/especialidades', payload);
  return data.data;
};

/** HU-07 — edición de nombre y descripción. */
export const actualizarEspecialidad = async (
  id: string,
  payload: NuevaEspecialidad,
): Promise<Especialidad> => {
  const { data } = await api.put<ApiResponse<Especialidad>>(`/especialidades/${id}`, payload);
  return data.data;
};

/**
 * HU-07 — activa o desactiva una especialidad.
 *
 * No hay endpoint dedicado como el de usuarios: se reutiliza el update, que
 * valida `nombre` como obligatorio, así que hay que reenviar los datos
 * actuales junto con el nuevo estado.
 */
export const cambiarEstadoEspecialidad = async (
  especialidad: Especialidad,
  estado: EstadoEspecialidad,
): Promise<Especialidad> => {
  const { data } = await api.put<ApiResponse<Especialidad>>(
    `/especialidades/${especialidad.id}`,
    { nombre: especialidad.nombre, descripcion: especialidad.descripcion, estado },
  );
  return data.data;
};

/** HU-08 — especialidades asignadas a un médico. */
export const getEspecialidadesDeMedico = async (medicoId: string): Promise<Especialidad[]> => {
  const { data } = await api.get<ApiResponse<Especialidad[]>>(
    `/medicos/${medicoId}/especialidades`,
  );
  return data.data;
};

export const asignarEspecialidad = async (
  medicoId: string,
  especialidadId: string,
): Promise<void> => {
  await api.post(`/medicos/${medicoId}/especialidades`, { especialidadId });
};

export const quitarEspecialidad = async (
  medicoId: string,
  especialidadId: string,
): Promise<void> => {
  await api.delete(`/medicos/${medicoId}/especialidades/${especialidadId}`);
};

/** HU-09 — catálogo para recepción: solo especialidades activas con médicos activos. */
export const getCatalogoEspecialidades = async (): Promise<EspecialidadConMedicos[]> => {
  const { data } = await api.get<ApiResponse<EspecialidadConMedicos[]>>(
    '/catalogo/especialidades',
  );
  return data.data;
};
