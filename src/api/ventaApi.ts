import axios from 'axios';
import type { VentaResponse, AgregarItemRequest, CobrarVentaRequest } from '../types/venta';
import type { ProductoResponse } from '../types/producto';
import type { PagedResponse } from './productoApi';

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

export const crearVenta = (personaId?: number) =>
  api.post<{ data: VentaResponse }>('/api/ventas', { personaId });

export const agregarItem = (ventaId: number, req: AgregarItemRequest) =>
  api.post<{ data: VentaResponse }>(`/api/ventas/${ventaId}/items`, req);

export const cobrarVenta = (ventaId: number, req: CobrarVentaRequest) =>
  api.post<{ data: VentaResponse }>(`/api/ventas/${ventaId}/cobrar`, req);

export const anularVenta = (ventaId: number, motivo: string) =>
  api.delete<{ data: VentaResponse }>(`/api/ventas/${ventaId}`, { params: { motivo } });

export const listarVentas = (desde?: string, hasta?: string, page = 0, size = 50) =>
  api.get<{ data: { content: VentaResponse[]; totalElements: number } }>('/api/ventas', {
    params: {
      ...(desde ? { desde } : {}),
      ...(hasta ? { hasta } : {}),
      page,
      size,
    },
  });

export const buscarProductos = (q: string) =>
  api.get<{ data: PagedResponse<ProductoResponse> }>('/api/productos', {
    params: { busqueda: q, page: 0, size: 10 },
  });