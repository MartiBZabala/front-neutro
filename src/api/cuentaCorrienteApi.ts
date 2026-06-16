import axios from 'axios';
import type { CCResponse, MovimientoResponse, PagoRequest, AjusteRequest } from '../types/cuentaCorriente';

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

export const getCCPorPersona = (personaId: number) =>
  api.get<{ data: CCResponse }>(`/api/cuentas-corrientes/${personaId}`);

export const registrarPago = (personaId: number, req: PagoRequest) =>
  api.post<{ data: CCResponse }>(`/api/cuentas-corrientes/${personaId}/pago`, req);

export const fijarLimite = (personaId: number, limite: number) =>
  api.patch<{ data: CCResponse }>(`/api/cuentas-corrientes/${personaId}/limite`, null, { params: { limite } });

export const liquidarEmpleado = (personaId: number, monto: number) =>
  api.post<{ data: CCResponse }>(`/api/cuentas-corrientes/${personaId}/liquidar`, null, { params: { monto } });

export const ajustarCC = (personaId: number, req: AjusteRequest) =>
  api.post<{ data: CCResponse }>(`/api/cuentas-corrientes/${personaId}/ajuste`, req);

export const getMovimientos = (personaId: number, desde?: string, hasta?: string, page = 0) =>
  api.get<{ data: { content: MovimientoResponse[]; totalElements: number } }>(
    `/api/cuentas-corrientes/${personaId}/movimientos`,
    { params: { desde, hasta, page, size: 30 } }
  );