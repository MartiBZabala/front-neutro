import axios from 'axios';
import type { ArqueoRequest, TurnoCajaResponse } from '../types/caja';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('auth-storage');
  if (auth) {
    const parsed = JSON.parse(auth);
    const token = parsed?.state?.user?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const abrirCaja = (fondoInicial: number) =>
  api.post<{ data: TurnoCajaResponse }>('/api/caja/abrir', null, { params: { fondoInicial } });

/**
 * Devuelve el turno ABIERTO del usuario actual, o null si no tiene ninguno.
 */
export const miTurnoActual = () =>
  api.get<{ data: TurnoCajaResponse | null }>('/api/caja/mi-turno');

export const iniciarArqueo = (id: number, req: ArqueoRequest) =>
  api.post<{ data: TurnoCajaResponse }>(`/api/caja/${id}/arqueo`, req);

export const confirmarArqueo = (id: number, observaciones?: string) =>
  api.post<{ data: TurnoCajaResponse }>(`/api/caja/${id}/confirmar`, null, { params: { observaciones } });

export const aprobarArqueo = (id: number, diferencia = 0) =>
  api.post<{ data: TurnoCajaResponse }>(`/api/caja/${id}/aprobar`, null, { params: { diferencia } });

export const listarPendientes = () =>
  api.get<{ data: TurnoCajaResponse[] }>('/api/caja/pendientes');