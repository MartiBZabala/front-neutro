export type CondicionIVA = 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL' | 'NO_RESPONSABLE' | 'PROVEEDOR_EXTERIOR';

export interface PersonaResponse {
  id: number;
  nombre: string;
  razonSocial: string | null;
  cuit: string | null;
  dni: string | null;
  condicionIVA: CondicionIVA;
  domicilio: string | null;
  email: string | null;
  telefono: string | null;
  esCliente: boolean;
  esEmpleado: boolean;
  tieneCuentaCorriente: boolean;
  activo: boolean;
}

export interface PersonaRequest {
  nombre: string;
  razonSocial?: string;
  cuit?: string;
  dni?: string;
  condicionIVA: CondicionIVA;
  domicilio?: string;
  email?: string;
  telefono?: string;
}

export interface ClienteRequest {
  persona: PersonaRequest;
  listaPrecios?: number;
  descuentoHabitual?: number;
  crearCuentaCorriente: boolean;
  limiteCredito?: number;
}

export interface EmpleadoRequest {
  persona: PersonaRequest;
  legajo?: string;
  cargo?: string;
  fechaIngreso: string;
  crearCuentaCorriente: boolean;
  limiteCredito?: number;
}