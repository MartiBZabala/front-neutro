import { useState } from 'react';
import axios from 'axios';
import { crearVenta, agregarItem, cobrarVenta } from '../../api/ventaApi';
import type { VentaResponse, CobrarVentaRequest } from '../../types/venta';
import type { MedioPago } from '../../types/medioPago';

export const useVenta = () => {
  const [venta, setVenta] = useState<VentaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iniciar = async (personaId?: number): Promise<VentaResponse | null> => {
  setLoading(true);
  setError(null);
  try {
    const res = await crearVenta(personaId);
    setVenta(res.data.data);
    return res.data.data;
  } catch {
    setError('Error al crear la venta');
    return null;
  } finally {
    setLoading(false);
  }
};

  const agregar = async (productoId: number, cantidad: number) => {
    if (!venta) await iniciar();
    setLoading(true);
    setError(null);
    try {
      const id = venta?.id ?? (await crearVenta()).data.data.id;
      const res = await agregarItem(id, { productoId, cantidad });
      setVenta(res.data.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Error al agregar producto');
      } else {
        setError('Error al agregar producto');
      }
    } finally {
      setLoading(false);
    }
  };

  const cobrar = async (medio: MedioPago, emitirComprobante = false) => {
    if (!venta) return;
    setLoading(true);
    setError(null);
    try {
      const req: CobrarVentaRequest = {
        pagos: [{ medio, monto: venta.total }],
        emitirComprobante,
      };
      const res = await cobrarVenta(venta.id, req);
      setVenta(res.data.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Error al cobrar');
      } else {
        setError('Error al cobrar');
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setVenta(null);

  return { venta, loading, error, iniciar, agregar, cobrar, reset };
};