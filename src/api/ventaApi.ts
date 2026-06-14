import axios from 'axios';
import type { VentaResponse, AgregarItemRequest, CobrarVentaRequest } from '../types/venta';
import type { ProductoResponse } from '../types/producto';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080' });

export const crearVenta = (personaId?: number) =>
  api.post<{ data: VentaResponse }>('/api/ventas', { personaId });

export const agregarItem = (ventaId: number, req: AgregarItemRequest) =>
  api.post<{ data: VentaResponse }>(`/api/ventas/${ventaId}/items`, req);

export const cobrarVenta = (ventaId: number, req: CobrarVentaRequest) =>
  api.post<{ data: VentaResponse }>(`/api/ventas/${ventaId}/cobrar`, req);

export const anularVenta = (ventaId: number, motivo: string) =>
  api.delete<{ data: VentaResponse }>(`/api/ventas/${ventaId}`, { params: { motivo } });

export const buscarProductos = (q: string) =>
  api.get<{ data: ProductoResponse[] }>('/api/productos/buscar', { params: { q } });