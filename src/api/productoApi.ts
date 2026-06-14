import axios from 'axios';
import type {
  ProductoResponse, ProductoRequest,
  AjusteStockRequest, CategoriaResponse,
} from '../types/producto';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
});

// Interceptor para agregar el token JWT en cada request
api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('auth-storage');
  if (auth) {
    const parsed = JSON.parse(auth);
    const token = parsed?.state?.user?.token;
    console.log('Token enviado:', token ? token.slice(0, 20) + '...' : 'NINGUNO');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tipo del PagedResponse del back
export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export const listarProductos = (
  busqueda?: string,
  categoriaId?: number,
  page = 0,
  size = 20,
) =>
  api.get<{ data: PagedResponse<ProductoResponse> }>('/api/productos', {
    params: {
      ...(busqueda ? { busqueda } : {}),
      ...(categoriaId ? { categoriaId } : {}),
      page,
      size,
    },
  });

export const getProductoById = (id: number) =>
  api.get<{ data: ProductoResponse }>(`/api/productos/${id}`);

export const crearProducto = (req: ProductoRequest) =>
  api.post<{ data: ProductoResponse }>('/api/productos', req);

export const editarProducto = (id: number, req: ProductoRequest) =>
  api.put<{ data: ProductoResponse }>(`/api/productos/${id}`, req);

export const desactivarProducto = (id: number) =>
  api.delete<{ data: void }>(`/api/productos/${id}`);

export const ajustarStock = (id: number, req: AjusteStockRequest) =>
  api.patch<{ data: ProductoResponse }>(`/api/productos/${id}/stock`, req);

export const listarStockBajo = () =>
  api.get<{ data: ProductoResponse[] }>('/api/productos/stock-bajo');

export const listarCategorias = () =>
  api.get<{ data: CategoriaResponse[] }>('/api/productos/categorias');