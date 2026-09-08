import type { NuevoUsuario, Usuario } from '@/types/user.types';
import { delay, normalizar } from '@/lib/utils';
import { mockUsuarios, siguienteIdUsuario } from '@/services/mockData';

export const getUsuarios = async (): Promise<Usuario[]> => {
  // TODO: reemplazar con llamada real -> api.get<ApiResponse<Usuario[]>>('/usuarios')
  await delay(350);
  return [...mockUsuarios];
};

export const getMedicos = async (): Promise<Usuario[]> => {
  // TODO: api.get<ApiResponse<Usuario[]>>('/usuarios?rol=MEDICO')
  await delay(250);
  return mockUsuarios.filter((u) => u.rol === 'MEDICO');
};

export const getUsuarioById = async (id: number): Promise<Usuario | null> => {
  // TODO: api.get<ApiResponse<Usuario>>(`/usuarios/${id}`)
  await delay(150);
  return mockUsuarios.find((u) => u.id === id) ?? null;
};

/** HU-03 — registro de una cuenta de usuario nueva. */
export const crearUsuario = async (payload: NuevoUsuario): Promise<Usuario> => {
  // TODO: api.post<ApiResponse<Usuario>>('/usuarios', payload)
  await delay(500);

  const duplicado = mockUsuarios.some(
    (u) => normalizar(u.usuario) === normalizar(payload.usuario),
  );
  if (duplicado) {
    throw new Error(`Ya existe una cuenta registrada con el correo "${payload.usuario}".`);
  }

  // La contraseña no viaja de vuelta: el backend la guarda hasheada y nunca la expone.
  const nuevo: Usuario = {
    id: siguienteIdUsuario(),
    nombreCompleto: payload.nombreCompleto.trim(),
    usuario: payload.usuario.trim().toLowerCase(),
    cargo: payload.cargo.trim(),
    rol: payload.rol,
    estado: 'ACTIVO',
    telefono: payload.telefono?.trim() || undefined,
    fechaRegistro: new Date().toISOString().slice(0, 10),
  };

  mockUsuarios.push(nuevo);
  return nuevo;
};
