import axios from 'axios';
import type { ComprobanteResponse } from '../types/facturacion';

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

export const emitirComprobante = (ventaId: number) =>
  api.post<{ data: ComprobanteResponse }>(`/api/comprobantes/emitir/${ventaId}`);

export const getComprobantePorVenta = (ventaId: number) =>
  api.get<{ data: ComprobanteResponse }>(`/api/comprobantes/venta/${ventaId}`);

export const listarRechazados = () =>
  api.get<{ data: ComprobanteResponse[] }>('/api/comprobantes/rechazados');

export const reintentarComprobante = (id: number) =>
  api.post<{ data: ComprobanteResponse }>(`/api/comprobantes/${id}/reintentar`);

/**
 * Descarga el PDF del comprobante y devuelve un Blob.
 * Usar con descargarYAbrirPdf() para abrirlo en una pestaña nueva,
 * o construir un link de descarga manualmente.
 */
export const descargarPdf = (id: number) =>
  api.get(`/api/comprobantes/${id}/pdf`, { responseType: 'blob' });

/**
 * Descarga el PDF del comprobante y lo abre en una pestaña nueva del navegador.
 */
export const descargarYAbrirPdf = async (id: number) => {
  const res = await descargarPdf(id);
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  window.open(url, '_blank');
  // liberar el objeto URL después de un momento
  setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
};