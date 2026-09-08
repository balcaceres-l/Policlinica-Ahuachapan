import { createContext } from 'react';
import type { EstadoAuth } from '@/types/auth.types';

// Separado del provider por la regla react-refresh: un .tsx no debe exportar
// componentes y no-componentes a la vez.
export const AuthContext = createContext<EstadoAuth | null>(null);
