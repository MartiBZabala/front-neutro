import { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Chip, Button, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableHead, TableRow, TableCell, TableBody,
  Grid,
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { listarPendientes, aprobarArqueo, type TurnoCajaResponse } from '../../api/cajaApi';
import { descargarCierreCajaPdf } from '../../api/reporteApi';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

const fmt = (v?: number | null) =>
  v != null ? `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '$0,00';

const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function AdminCajaPage() {
  const [pendientes, setPendientes] = useState<TurnoCajaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog aprobación
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<TurnoCajaResponse | null>(null);
  const [diferencia, setDiferencia] = useState('0');
  const [aprobando, setAprobando] = useState(false);

  // PDF
  const [descargando, setDescargando] = useState<number | null>(null);

  const cargar = () => {
    setLoading(true);
    listarPendientes()
      .then(r => setPendientes(r.data.data))
      .catch(() => setError('Error al cargar turnos pendientes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, []);

  const handleAprobar = async () => {
    if (!turnoSeleccionado) return;
    setAprobando(true);
    try {
      await aprobarArqueo(turnoSeleccionado.id, Number(diferencia));
      setPendientes(prev => prev.filter(t => t.id !== turnoSeleccionado.id));
      setTurnoSeleccionado(null);
    } catch {
      setError('Error al aprobar el cierre');
    } finally {
      setAprobando(false);
    }
  };

  const handleDescargarPdf = async (id: number) => {
    setDescargando(id);
    try { await descargarCierreCajaPdf(id); }
    catch { setError('Error al descargar PDF'); }
    finally { setDescargando(null); }
  };

  const totalPendiente = pendientes.reduce((s, t) => {
    const cobrado = (t.totalEfectivo ?? 0) + (t.totalTarjetaDebito ?? 0) +
      (t.totalTarjetaCredito ?? 0) + (t.totalTransferencia ?? 0) +
      (t.totalCC ?? 0);
    return s + cobrado;
  }, 0);

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#2C2C2A', letterSpacing: '-0.3px' }}>
            Administración de Caja
          </Typography>
          <Typography variant="body2" sx={{ color: '#888780', mt: 0.25 }}>
            Revisá y aprobá los cierres de caja pendientes
          </Typography>
        </Box>
        <Button size="small" onClick={cargar} disabled={loading}
          sx={{ color: ACCENT, fontWeight: 500, '&:hover': { bgcolor: ACCENT_BG } }}>
          Actualizar
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Pendientes de aprobación', value: pendientes.length, icon: <AccessTimeOutlinedIcon />, color: pendientes.length > 0 ? '#92400E' : '#2E7D32', bg: pendientes.length > 0 ? '#FFF8E1' : '#E8F5E9' },
          { label: 'Total recaudado pendiente', value: fmt(totalPendiente), icon: <PointOfSaleOutlinedIcon />, color: ACCENT, bg: ACCENT_BG },
          { label: 'Cajeros distintos', value: new Set(pendientes.map(t => t.usuarioId)).size, icon: <WarningAmberOutlinedIcon />, color: '#5F5E5A', bg: '#F4F3F1' },
        ].map(k => (
          <Grid key={k.label} size={{ xs: 12, md: 4 }}>
            <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3 }}>
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ bgcolor: k.bg, borderRadius: 1.5, p: 0.75, display: 'flex', color: k.color }}>
                  {k.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.78rem', color: '#888780' }}>{k.label}</Typography>
                  <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: k.color, lineHeight: 1.2 }}>
                    {k.value}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Lista de turnos pendientes */}
      <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: '1px solid #F0EEE8', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ bgcolor: '#FFF8E1', borderRadius: 1.5, p: 0.75, display: 'flex' }}>
            <AccessTimeOutlinedIcon sx={{ fontSize: 18, color: '#92400E' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#2C2C2A' }}>
            Cierres pendientes de aprobación
          </Typography>
          {pendientes.length > 0 && (
            <Chip label={pendientes.length} size="small"
              sx={{ ml: 1, bgcolor: '#FFF8E1', color: '#92400E', fontWeight: 700, fontSize: '0.72rem', height: 20, borderRadius: 1, border: 'none' }} />
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} sx={{ color: ACCENT }} />
          </Box>
        ) : pendientes.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CheckCircleOutlinedIcon sx={{ fontSize: 48, color: '#B4B2A9', mb: 1 }} />
            <Typography sx={{ color: '#B4B2A9', fontSize: '0.95rem', fontWeight: 500 }}>
              No hay cierres pendientes
            </Typography>
            <Typography sx={{ color: '#D3D1C7', fontSize: '0.82rem', mt: 0.5 }}>
              Todos los turnos están al día
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F4F3F1' }}>
                {['Cajero', 'Apertura', 'Cierre', 'Efectivo', 'Débito', 'Crédito', 'Transferencia', 'CC', 'Total', 'Acciones'].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 700, color: '#888780', fontSize: '0.78rem', py: 1.5, whiteSpace: 'nowrap' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {pendientes.map((t, i) => {
                const cobrado = (t.totalEfectivo ?? 0) + (t.totalTarjetaDebito ?? 0) +
                  (t.totalTarjetaCredito ?? 0) + (t.totalTransferencia ?? 0) + (t.totalCC ?? 0);
                return (
                  <TableRow key={t.id}
                    sx={{ bgcolor: i % 2 === 1 ? '#FAFAF9' : '#fff', '& td': { borderBottom: '1px solid #F0EEE8' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: ACCENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: ACCENT }}>
                            {t.nombreUsuario?.[0]?.toUpperCase()}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#2C2C2A' }}>{t.nombreUsuario}</Typography>
                          <Typography sx={{ fontSize: '0.72rem', color: '#B4B2A9' }}>Turno #{t.id}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.8rem', color: '#5F5E5A', whiteSpace: 'nowrap' }}>{fmtDT(t.apertura)}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.8rem', color: '#5F5E5A', whiteSpace: 'nowrap' }}>{fmtDT(t.cierre)}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.85rem', color: '#2C2C2A' }}>{fmt(t.totalEfectivo)}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.85rem', color: '#2C2C2A' }}>{fmt(t.totalTarjetaDebito)}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.85rem', color: '#2C2C2A' }}>{fmt(t.totalTarjetaCredito)}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.85rem', color: '#2C2C2A' }}>{fmt(t.totalTransferencia)}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.85rem', color: '#2C2C2A' }}>{fmt(t.totalCC)}</Typography></TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: ACCENT }}>{fmt(cobrado)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                        <Button size="small" variant="contained" disableElevation
                          onClick={() => { setTurnoSeleccionado(t); setDiferencia('0'); }}
                          sx={{ bgcolor: '#2E7D32', borderRadius: 1.5, fontWeight: 600, fontSize: '0.78rem', minWidth: 0, px: 1.5, '&:hover': { bgcolor: '#1B5E20' } }}>
                          Aprobar
                        </Button>
                        <Button size="small" variant="outlined"
                          onClick={() => handleDescargarPdf(t.id)}
                          disabled={descargando === t.id}
                          sx={{ borderColor: '#E3E1DB', borderRadius: 1.5, color: '#5F5E5A', minWidth: 0, px: 1, '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG } }}>
                          {descargando === t.id
                            ? <CircularProgress size={14} color="inherit" />
                            : <DownloadOutlinedIcon sx={{ fontSize: 16 }} />}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialog aprobación */}
      <Dialog open={!!turnoSeleccionado} onClose={() => setTurnoSeleccionado(null)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
          Aprobar cierre de caja
        </DialogTitle>
        <DialogContent>
          {turnoSeleccionado && (
            <>
              <Box sx={{ mb: 2, p: 1.5, bgcolor: ACCENT_BG, borderRadius: 2 }}>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: ACCENT }}>
                  {turnoSeleccionado.nombreUsuario} — Turno #{turnoSeleccionado.id}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#888780', mt: 0.25 }}>
                  {fmtDT(turnoSeleccionado.apertura)} → {fmtDT(turnoSeleccionado.cierre)}
                </Typography>
              </Box>

              {/* Resumen */}
              <Box sx={{ bgcolor: '#F4F3F1', borderRadius: 2, p: 1.5, mb: 2 }}>
                {[
                  ['Efectivo', turnoSeleccionado.totalEfectivo],
                  ['Tarjeta débito', turnoSeleccionado.totalTarjetaDebito],
                  ['Tarjeta crédito', turnoSeleccionado.totalTarjetaCredito],
                  ['Transferencia', turnoSeleccionado.totalTransferencia],
                  ['Cuenta corriente', turnoSeleccionado.totalCC],
                ].map(([label, val]) => (
                  <Box key={String(label)} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography sx={{ fontSize: '0.82rem', color: '#888780' }}>{label}</Typography>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#2C2C2A' }}>{fmt(Number(val))}</Typography>
                  </Box>
                ))}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.75, mt: 0.5, borderTop: '1px solid #E3E1DB' }}>
                  <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#2C2C2A' }}>Total</Typography>
                  <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: ACCENT }}>
                    {fmt((turnoSeleccionado.totalEfectivo ?? 0) + (turnoSeleccionado.totalTarjetaDebito ?? 0) +
                      (turnoSeleccionado.totalTarjetaCredito ?? 0) + (turnoSeleccionado.totalTransferencia ?? 0) +
                      (turnoSeleccionado.totalCC ?? 0))}
                  </Typography>
                </Box>
              </Box>

              <TextField size="small" label="Diferencia de caja" type="number" fullWidth
                value={diferencia} onChange={e => setDiferencia(e.target.value)}
                helperText="Positivo = sobrante · Negativo = faltante · 0 = exacto"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setTurnoSeleccionado(null)} sx={{ color: '#888780', borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button variant="contained" disableElevation onClick={handleAprobar} disabled={aprobando}
            sx={{ bgcolor: '#2E7D32', borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#1B5E20' } }}>
            {aprobando ? <CircularProgress size={18} color="inherit" /> : 'Confirmar aprobación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
