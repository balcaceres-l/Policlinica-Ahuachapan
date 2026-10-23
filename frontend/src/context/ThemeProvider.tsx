import { useEffect, useState, type ReactNode } from 'react';
import { ThemeContext, type Theme } from '@/context/theme-context';

const STORAGE_KEY = 'policlinica-theme';

function obtenerTemaInicial(): Theme {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado === 'light' || guardado === 'dark') {
      return guardado;
    }
  } catch {
    // Manejo seguro por si localStorage no está disponible
  }

  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(obtenerTemaInicial);

  const setTheme = (nuevoTema: Theme) => {
    setThemeState(nuevoTema);
    try {
      localStorage.setItem(STORAGE_KEY, nuevoTema);
    } catch {
      // Ignorar errores en navegadores con almacenamiento restringido
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Sincroniza la clase `.dark` en el elemento raíz <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Escucha cambios en el SO si no hay preferencia manual guardada
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      let tienePreferenciaGuardada = false;
      try {
        tienePreferenciaGuardada = Boolean(localStorage.getItem(STORAGE_KEY));
      } catch {
        tienePreferenciaGuardada = false;
      }

      if (!tienePreferenciaGuardada) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
