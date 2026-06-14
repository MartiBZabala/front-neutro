import type { MedioPago } from "./medioPago";

export type EstadoVenta = 'EN_CURSO' | 'PENDIENTE_PAGO' | 'PAGADA' | 'CC_CARGADA' | 'ANULADA' | 'CANCELADA';

export interface ItemResponse {
  id: number;
  productoId: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PagoResponse {
  medio: MedioPago;
  monto: number;
  cuotas: number;
}

export interface VentaResponse {
  id: number;
  turnoId: number;
  personaId: number | null;
  nombrePersona: string;
  fechaHora: string;
  subtotal: number;
  descuentoMonto: number;
  totalIva: number;
  total: number;
  estado: EstadoVenta;
  items: ItemResponse[];
  pagos: PagoResponse[];
}

export interface AgregarItemRequest {
  productoId: number;
  cantidad: number;
  descuentoPct?: number;
}

export interface PagoRequest {
  medio: MedioPago;
  monto: number;
  cuotas?: number;
  referencia?: string;
}

export interface CobrarVentaRequest {
  pagos: PagoRequest[];
  emitirComprobante: boolean;
}