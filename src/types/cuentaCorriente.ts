export type TipoTitularCC = 'CLIENTE' | 'EMPLEADO';
export type EstadoCuentaCorriente = 'ACTIVA' | 'AL_DIA' | 'BLOQUEADA' | 'BAJA';
export type TipoMovimientoCC =
  | 'CARGO_VENTA'
  | 'PAGO_EFECTIVO'
  | 'PAGO_TRANSFERENCIA'
  | 'DESCUENTO_SUELDO'
  | 'AJUSTE_ADMIN';

export interface CCResponse {
  id: number;
  personaId: number;
  nombrePersona: string;
  tipoTitular: TipoTitularCC;
  saldoActual: number;
  limiteCredito: number | null;
  estado: EstadoCuentaCorriente;
}

export interface MovimientoResponse {
  id: number;
  tipo: TipoMovimientoCC;
  monto: number;
  saldoPost: number;
  descripcion: string;
  fecha: string;
}

export interface PagoRequest {
  monto: number;
  tipo: TipoMovimientoCC;
  descripcion?: string;
}

export interface AjusteRequest {
  monto: number;
  descripcion: string;
}