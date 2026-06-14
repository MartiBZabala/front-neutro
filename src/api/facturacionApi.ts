import axios from 'axios';
import type { ComprobanteResponse } from '../types/facturacion';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080' });

export const emitirComprobante = (ventaId: number) =>
  api.post<{ data: ComprobanteResponse }>(`/api/comprobantes/emitir/${ventaId}`);

export const getComprobantePorVenta = (ventaId: number) =>
  api.get<{ data: ComprobanteResponse }>(`/api/comprobantes/venta/${ventaId}`);

export const listarRechazados = () =>
  api.get<{ data: ComprobanteResponse[] }>('/api/comprobantes/rechazados');

export const reintentarComprobante = (id: number) =>
  api.post<{ data: ComprobanteResponse }>(`/api/comprobantes/${id}/reintentar`);