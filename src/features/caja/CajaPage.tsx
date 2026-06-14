import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button,
  Grid, TextField, Chip, Divider, Alert, CircularProgress
} from '@mui/material';
import { useCaja } from './useCaja';

import type { ArqueoRequest } from '../../types/caja';
import { buscarPersonas } from '../../api/personasApi';
import type { PersonaResponse } from '../../types/personas';


const estadoColor: Record<string, 'success' | 'warning' | 'default'> = {
  ABIERTO: 'success',
  EN_ARQUEO: 'warning',
  PENDIENTE_APROBACION: 'warning',
  CERRADO: 'default',
};

const estadoLabel: Record<string, string> = {
  ABIERTO: 'Abierto',
  EN_ARQUEO: 'En arqueo',
  PENDIENTE_APROBACION: 'Pendiente aprobación',
  CERRADO: 'Cerrado',
};

type Paso = 'dni' | 'fondo' | 'abierta';

export default function CajaPage() {
  const { turno, loading, error: errorCaja, abrir, arquear, confirmar } = useCaja();

  const [paso, setPaso] = useState<Paso>('dni');
  const [dni, setDni] = useState('');
  const [empleado, setEmpleado] = useState<PersonaResponse | null>(null);
  const [buscandoEmpleado, setBuscandoEmpleado] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  // Eliminá estos estados — ya no se necesitan
const [fondoInicial, setFondoInicial] = useState('');
const [abriendo, setAbriendo] = useState(false);

// Y eliminá la función handleAbrirCaja completa

  const [tab, setTab] = useState<'resumen' | 'arqueo'>('resumen');
  const [arqueoData, setArqueoData] = useState<ArqueoRequest>({
    efectivo: 0, tarjetaDebito: 0, tarjetaCredito: 0,
    transferencia: 0, cuentaCorriente: 0, qr: 0,
  });
  const [observaciones, setObservaciones] = useState('');

  const error = errorLocal ?? errorCaja;

  const totalVendido = turno
    ? (turno.totalEfectivo ?? 0) + (turno.totalTarjetaDebito ?? 0) +
      (turno.totalTarjetaCredito ?? 0) + (turno.totalTransferencia ?? 0) +
      (turno.totalCC ?? 0)
    : 0;

  const buscarEmpleado = async () => {
    if (!dni.trim()) return;
    setBuscandoEmpleado(true);
    setErrorLocal(null);
    try {
      const res = await buscarPersonas(dni);
      const persona = res.data.data.content.find(p => p.esEmpleado && p.dni === dni);
      if (!persona) {
        setErrorLocal('No se encontró un empleado con ese DNI');
      } else {
        setEmpleado(persona);
        setPaso('fondo');
      }
    } catch {
      setErrorLocal('Error al buscar empleado');
    } finally {
      setBuscandoEmpleado(false);
    }
  };

  const handleAbrirCaja = async () => {
    setAbriendo(true);
    setErrorLocal(null);
    try {
      await abrir(Number(fondoInicial));
      setPaso('abierta');
    } catch {
      setErrorLocal('Error al abrir caja');
    } finally {
      setAbriendo(false);
    }
  };

  // Paso 1 — DNI
  if (paso === 'dni') {
    return (
      <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>Identificación</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Ingresá tu DNI para continuar.
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorLocal(null)}>
                {error}
              </Alert>
            )}
            <TextField
              label="DNI"
              type="number"
              fullWidth
              size="small"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarEmpleado()}
              autoFocus
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth variant="contained" disableElevation
              disabled={buscandoEmpleado || !dni.trim()}
              onClick={buscarEmpleado}
              sx={{ py: 1.3 }}
            >
              {buscandoEmpleado
                ? <CircularProgress size={20} color="inherit" />
                : 'Continuar — Enter ↵'
              }
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Paso 2 — Fondo inicial
  if (paso === 'fondo') {
    return (
      <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            {/* Card empleado */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, mb: 3,
              p: 1.5, bgcolor: 'background.default', borderRadius: 2,
            }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: '50%',
                bgcolor: 'action.hover', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {empleado?.nombre?.[0] ?? '?'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{empleado?.nombre}</Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>DNI {empleado?.dni}</Typography>
              </Box>
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>Abrir caja</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Ingresá el fondo inicial para comenzar el turno.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorLocal(null)}>
                {error}
              </Alert>
            )}

            <TextField
              label="Fondo inicial"
              type="number"
              fullWidth
              size="small"
              value={fondoInicial}
              onChange={(e) => setFondoInicial(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fondoInicial && handleAbrirCaja()}
              autoFocus
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth variant="contained" disableElevation
              disabled={abriendo || loading || !fondoInicial}
              onClick={handleAbrirCaja}
              sx={{ py: 1.3 }}
            >
              {abriendo
                ? <CircularProgress size={20} color="inherit" />
                : 'Abrir turno — Enter ↵'
              }
            </Button>
            <Button
              fullWidth
              onClick={() => { setPaso('dni'); setDni(''); setEmpleado(null); setErrorLocal(null); }}
              sx={{ mt: 1, color: 'text.secondary' }}
            >
              ← Volver
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Paso 3 — Turno abierto
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            Caja — Turno #{turno?.id}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Abierto desde {turno ? new Date(turno.apertura).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''} · {empleado?.nombre}
          </Typography>
        </Box>
        <Chip
          label={estadoLabel[turno?.estado ?? ''] ?? turno?.estado}
          color={estadoColor[turno?.estado ?? ''] ?? 'default'}
          size="small"
        />
      </Box>

      {errorCaja && <Alert severity="error" sx={{ mb: 2 }}>{errorCaja}</Alert>}

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {(['resumen', 'arqueo'] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'contained' : 'outlined'}
            disableElevation
            onClick={() => setTab(t)}
            sx={{
              borderColor: 'divider',
              color: tab === t ? 'primary.contrastText' : 'text.primary',
              textTransform: 'capitalize',
            }}
          >
            {t === 'resumen' ? 'Resumen' : 'Arqueo'}
          </Button>
        ))}
      </Box>

      {tab === 'resumen' && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>Fondo inicial</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 500 }}>
                    ${turno?.fondoInicial?.toLocaleString('es-AR')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.disabled', mt: 0.5 }}>Cargado al abrir turno</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>Total vendido</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 500 }}>
                    ${totalVendido.toLocaleString('es-AR')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.disabled', mt: 0.5 }}>en este turno</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>Detalle por medio de pago</Typography>
              {[
                { label: 'Efectivo', value: turno?.totalEfectivo },
                { label: 'Tarjeta débito', value: turno?.totalTarjetaDebito },
                { label: 'Tarjeta crédito', value: turno?.totalTarjetaCredito },
                { label: 'Transferencia', value: turno?.totalTransferencia },
                { label: 'Cuenta corriente', value: turno?.totalCC },
              ].map((row) => (
                <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1.2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{row.label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>${(row.value ?? 0).toLocaleString('es-AR')}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>Total</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>${totalVendido.toLocaleString('es-AR')}</Typography>
              </Box>
            </CardContent>
          </Card>

          {turno?.estado === 'ABIERTO' && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained" disableElevation
                disabled={loading}
                onClick={() => setTab('arqueo')}
                sx={{ py: 1.2, px: 3 }}
              >
                Iniciar arqueo
              </Button>
            </Box>
          )}
        </Box>
      )}

      {tab === 'arqueo' && (
        <Box>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 2 }}>
            <CardContent>
              <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>Conteo por medio de pago</Typography>
              <Grid container spacing={2}>
                {[
                  { key: 'efectivo', label: 'Efectivo' },
                  { key: 'tarjetaDebito', label: 'Tarjeta débito' },
                  { key: 'tarjetaCredito', label: 'Tarjeta crédito' },
                  { key: 'transferencia', label: 'Transferencia' },
                  { key: 'cuentaCorriente', label: 'Cuenta corriente' },
                  { key: 'qr', label: 'QR' },
                ].map((field) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={field.key}>
                    <TextField
                      label={field.label}
                      type="number"
                      fullWidth
                      size="small"
                      value={arqueoData[field.key as keyof ArqueoRequest]}
                      onChange={(e) => setArqueoData((prev: ArqueoRequest) => ({ ...prev, [field.key]: Number(e.target.value) }))}
                    />
                  </Grid>
                ))}
              </Grid>
              <TextField
                label="Observaciones (opcional)"
                fullWidth multiline rows={2} size="small"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              variant="outlined" disableElevation
              onClick={() => setTab('resumen')}
              sx={{ borderColor: 'divider', color: 'text.primary', py: 1.2, px: 3 }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained" disableElevation
              disabled={loading}
              onClick={() => arquear(arqueoData).then(() => confirmar(observaciones))}
              sx={{ py: 1.2, px: 3 }}
            >
              Confirmar arqueo
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}