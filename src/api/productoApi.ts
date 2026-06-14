import axios from 'axios';
import type { ProductoResponse, ProductoRequest, AjusteStockRequest, CategoriaResponse } from '../types/producto';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080' });

export const listarProductos = (busqueda?: string, categoriaId?: number, page = 0, size = 20) =>
  api.get<{ data: { content: ProductoResponse[]; totalElements: number } }>('/api/productos', {
    params: { busqueda, categoriaId, page, size },
  });

export const crearProducto = (req: ProductoRequest) =>
  api.post<{ data: ProductoResponse }>('/api/productos', req);

export const editarProducto = (id: number, req: ProductoRequest) =>
  api.put<{ data: ProductoResponse }>(`/api/productos/${id}`, req);

export const desactivarProducto = (id: number) =>
  api.delete(`/api/productos/${id}`);

export const ajustarStock = (id: number, req: AjusteStockRequest) =>
  api.patch<{ data: ProductoResponse }>(`/api/productos/${id}/stock`, req);

export const listarCategorias = () =>
  api.get<{ data: CategoriaResponse[] }>('/api/productos/categorias');