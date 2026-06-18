import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080' });

api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('auth-storage');
  if (auth) {
    const parsed = JSON.parse(auth);
    const token = parsed?.state?.user?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AuditoriaResponse {
  id: number;
  accion: string;
  tabla: string;
  registroId: number | null;
  datosAnteriores: string | null;
  datosNuevos: string | null;
  error: string | null;
  usuarioId: number | null;
  ip: string | null;
  fecha: string;
}

export const listarAuditoria = (page = 0, size = 50) =>
  api.get<{ data: { content: AuditoriaResponse[]; totalElements: number } }>('/api/auditoria', {
    params: { page, size },
  });