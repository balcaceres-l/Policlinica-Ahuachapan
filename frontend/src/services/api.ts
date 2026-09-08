import axios, { AxiosError } from 'axios';

export const TOKEN_KEY = 'pcah_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15000,
});

export const guardarToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const leerToken = () => localStorage.getItem(TOKEN_KEY);
export const borrarToken = () => localStorage.removeItem(TOKEN_KEY);

api.interceptors.request.use((config) => {
  const token = leerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Un 401 significa que el token murió (expiró o fue revocado): se limpia la
 * sesión y se vuelve al login. Se excluye la petición de login, donde el 401
 * significa "credenciales incorrectas" y lo maneja la propia vista.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const esLogin = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !esLogin) {
      borrarToken();
      if (window.location.pathname !== '/login') {
        window.location.replace('/login?expirada=1');
      }
    }

    return Promise.reject(error);
  },
);

export default api;
