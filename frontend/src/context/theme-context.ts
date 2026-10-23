import { createContext } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

// Separado del provider por la regla react-refresh: un .tsx no debe exportar
// componentes y no-componentes a la vez.
export const ThemeContext = createContext<ThemeContextType | null>(null);
