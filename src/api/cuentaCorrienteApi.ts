import axios from 'axios';
import type { CCResponse, MovimientoResponse, PagoRequest, AjusteRequest } from '../types/cuentaCorriente';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080' });

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