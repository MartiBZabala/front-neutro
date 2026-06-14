export type MedioPago =
  | 'EFECTIVO'
  | 'TARJETA_DEBITO'
  | 'TARJETA_CREDITO'
  | 'TRANSFERENCIA'
  | 'CUENTA_CORRIENTE';

export const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA_DEBITO', label: 'Débito' },
  { value: 'TARJETA_CREDITO', label: 'Crédito' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'CUENTA_CORRIENTE', label: 'Cta. Corriente' },
];