import { createContext } from 'react';
import type { EstadoAuth } from '@/types/auth.types';

/**
 * Se separa del provider para no mezclar componentes y no-componentes
 * en el mismo archivo (regla react-refresh del ESLint del proyecto).
 */
export const AuthContext = createContext<EstadoAuth | null>(null);
