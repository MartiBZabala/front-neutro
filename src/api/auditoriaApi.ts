import axios from 'axios';
import type { PagedResponse } from './productoApi';

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

// ── Tipos ─────────────────────────────────────────────────────────────────

export interface AuditoriaResponse {
  id: number;
  accion: string;
  tabla: string | null;
  registroId: number | null;
  datosAnteriores: string | null;
  datosNuevos: string | null;
  error: string | null;
  usuarioId: number | null;
  usuarioNombre: string | null;   // nuevo — viene del DTO del back
  ip: string | null;
  fecha: string;
}

export interface AuditoriaFiltros {
  tabla?: string;
  accion?: string;
  usuarioId?: number;
  desde?: string;   // ISO date-time: "2025-01-01T00:00:00"
  hasta?: string;
  page?: number;
  size?: number;
}

// ── Endpoints ─────────────────────────────────────────────────────────────

/** Listado paginado con filtros — toda la lógica de filtrado corre en el backend */
export const listarAuditoria = (filtros: AuditoriaFiltros = {}) => {
  const { page = 0, size = 50, ...resto } = filtros;
  // Limpiar claves undefined/vacías para no mandar params sucios
  const params = Object.fromEntries(
    Object.entries({ ...resto, page, size }).filter(
      ([, v]) => v !== undefined && v !== '' && v !== null,
    ),
  );
  return api.get<{ data: PagedResponse<AuditoriaResponse> }>('/api/auditoria', { params });
};

/** Conteos reales por acción desde toda la BD (para las métricas del header) */
export const obtenerMetricas = () =>
  api.get<{ data: Record<string, number> }>('/api/auditoria/metricas');

/** Descarga CSV con los filtros aplicados actualmente */
export const descargarCsvAuditoria = async (filtros: Omit<AuditoriaFiltros, 'page' | 'size'> = {}) => {
  const params = Object.fromEntries(
    Object.entries(filtros).filter(([, v]) => v !== undefined && v !== '' && v !== null),
  );
  const res = await api.get('/api/auditoria/export.csv', {
    params,
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const fecha = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
  link.href = URL.createObjectURL(blob);
  link.download = `auditoria_${fecha}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};