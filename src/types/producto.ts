export type AlicuotaIVA = 'EXENTO' | 'CERO' | 'DIEZ_Y_MEDIO' | 'VEINTIUNO' | 'VEINTISIETE';

export interface ProductoResponse {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoriaId: number | null;
  nombreCategoria: string | null;
  precioCosto: number;
  precioVenta1: number;
  precioVenta2: number;
  precioVenta3: number;
  alicuotaIVA: AlicuotaIVA;
  stockActual: number;
  stockMinimo: number;
  stockBajo: boolean;
  activo: boolean;
}

export interface ProductoRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoriaId?: number;
  precioCosto?: number;
  precioVenta1: number;
  precioVenta2?: number;
  precioVenta3?: number;
  alicuotaIVA: AlicuotaIVA;
  stockInicial: number;
  stockMinimo: number;
}

export interface AjusteStockRequest {
  cantidad: number;
  motivo: string;
}

export interface CategoriaResponse {
  id: number;
  nombre: string;
  padreId: number | null;
}