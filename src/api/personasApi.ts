import axios from 'axios';
import type { ClienteRequest, EmpleadoRequest, PersonaResponse } from '../types/personas';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080' });

// Interceptor JWT
api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('auth-storage');
  if (auth) {
    const parsed = JSON.parse(auth);
    const token = parsed?.state?.user?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const buscarPersonas = (q?: string, page = 0, size = 20) =>
  api.get<{ data: { content: PersonaResponse[]; totalElements: number } }>('/api/personas', {
    params: {
      ...(q ? { q } : {}),
      page,
      size,
    },
  });

export const getPersonaById = (id: number) =>
  api.get<{ data: PersonaResponse }>(`/api/personas/${id}`);

export const crearCliente = (req: ClienteRequest) =>
  api.post<{ data: PersonaResponse }>('/api/personas/clientes', req);

export const editarCliente = (id: number, req: ClienteRequest) =>
  api.put<{ data: PersonaResponse }>(`/api/personas/clientes/${id}`, req);

export const crearEmpleado = (req: EmpleadoRequest) =>
  api.post<{ data: PersonaResponse }>('/api/personas/empleados', req);

export const darBajaEmpleado = (id: number) =>
  api.patch<{ data: PersonaResponse }>(`/api/personas/empleados/${id}/baja`);