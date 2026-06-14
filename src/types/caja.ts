export type EstadoCaja = 'ABIERTO' | 'EN_ARQUEO' | 'PENDIENTE_APROBACION' | 'CERRADO';

export interface TurnoCajaResponse {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  apertura: string;
  cierre: string | null;
  fondoInicial: number;
  totalEfectivo: number;
  totalTarjetaDebito: number;
  totalTarjetaCredito: number;
  totalTransferencia: number;
  totalCC: number;
  diferencia: number;
  estado: EstadoCaja;
}

export interface ArqueoRequest {
  efectivo: number;
  tarjetaDebito: number;
  tarjetaCredito: number;
  transferencia: number;
  cuentaCorriente: number;
  qr: number;
}