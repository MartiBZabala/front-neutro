import { useState } from 'react';
import { abrirCaja, iniciarArqueo, confirmarArqueo } from '../../api/cajaApi';
import type { TurnoCajaResponse, ArqueoRequest } from '../../types/caja';

export const useCaja = () => {
  const [turno, setTurno] = useState<TurnoCajaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abrir = async (fondoInicial: number) => {
    setLoading(true);
    try {
      const res = await abrirCaja(fondoInicial);
      setTurno(res.data.data);
    } catch {
      setError('Error al abrir la caja');
    } finally {
      setLoading(false);
    }
  };

  const arquear = async (req: ArqueoRequest) => {
    if (!turno) return;
    setLoading(true);
    try {
      const res = await iniciarArqueo(turno.id, req);
      setTurno(res.data.data);
    } catch {
      setError('Error al iniciar el arqueo');
    } finally {
      setLoading(false);
    }
  };

  const confirmar = async (observaciones?: string) => {
    if (!turno) return;
    setLoading(true);
    try {
      const res = await confirmarArqueo(turno.id, observaciones);
      setTurno(res.data.data);
    } catch {
      setError('Error al confirmar el arqueo');
    } finally {
      setLoading(false);
    }
  };

  return { turno, loading, error, abrir, arquear, confirmar };
};