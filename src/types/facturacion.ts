export type TipoComprobante = 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C';
export type ModoAutorizacion = 'CAE' | 'CAEA';
export type EstadoComprobante = 'BORRADOR' | 'ENVIANDO' | 'AUTORIZADO' | 'RECHAZADO';

export interface ComprobanteResponse {
  id: number;
  ventaId: number;
  tipo: TipoComprobante;
  puntoVenta: number;
  numero: number;
  modoAutorizacion: ModoAutorizacion | null;
  cae: string | null;
  caea: string | null;
  autorizacionVencimiento: string | null;
  importeTotal: number;
  estado: EstadoComprobante;
  errorArca: string | null;
  fechaEmision: string;
}