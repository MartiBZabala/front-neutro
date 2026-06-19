import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Grid, Alert, CircularProgress, Chip,
  Table, TableHead, TableRow, TableCell, TableBody,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import CreditScoreOutlinedIcon from '@mui/icons-material/CreditScoreOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import {
  getCCPorPersona, registrarPago, fijarLimite,
  ajustarCC, liquidarEmpleado, getMovimientos,
  listarCuentasCorrientes,
} from '../../api/cuentaCorrienteApi';
import type {
  CCResponse, MovimientoResponse,
  PagoRequest, AjusteRequest, TipoMovimientoCC, EstadoCuentaCorriente,
} from '../../types/cuentaCorriente';
import type { PersonaResponse } from '../../types/personas';
import { buscarPersonas } from '../../api/personasApi';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2, bgcolor: '#FAFAF9',
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1 },
  },
};

const ESTADO_STYLE: Record<EstadoCuentaCorriente, { label: string; color: string; bg: string }> = {
  AL_DIA:    { label: 'Al día',    color: '#2E7D32', bg: '#E8F5E9' },
  ACTIVA:    { label: 'Activa',    color: ACCENT,    bg: ACCENT_BG },
  BLOQUEADA: { label: 'Bloqueada', color: '#C62828', bg: '#FFEBEE' },
  BAJA:      { label: 'Baja',      color: '#888780', bg: '#F5F5F5' },
};

const TIPO_MOV_LABEL: Record<TipoMovimientoCC, string> = {
  CARGO_VENTA:        'Cargo venta',
  PAGO_EFECTIVO:      'Pago efectivo',
  PAGO_TRANSFERENCIA: 'Pago transferencia',
  DESCUENTO_SUELDO:   'Descuento sueldo',
  AJUSTE_ADMIN:       'Ajuste admin',
  NOTA_CREDITO:       'Nota de crédito',
};

const TIPO_MOV_COLOR: Record<TipoMovimientoCC, { color: string; bg: string }> = {
  CARGO_VENTA:        { color: '#C62828', bg: '#FFEBEE' },
  PAGO_EFECTIVO:      { color: '#2E7D32', bg: '#E8F5E9' },
  PAGO_TRANSFERENCIA: { color: '#2E7D32', bg: '#E8F5E9' },
  DESCUENTO_SUELDO:   { color: '#2E7D32', bg: '#E8F5E9' },
  AJUSTE_ADMIN:       { color: ACCENT,    bg: ACCENT_BG },
  NOTA_CREDITO:       { color: '#2E7D32', bg: '#E8F5E9' },
};

export default function CuentaCorrientePage() {
  // Dashboard
  const [listaCCs, setListaCCs] = useState<CCResponse[]>([]);
  const [loadingDash, setLoadingDash] = useState(true);

  // Búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [personas, setPersonas] = useState<PersonaResponse[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Detalle
  const [cc, setCC] = useState<CCResponse | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialogs
  const [dialogPago, setDialogPago] = useState(false);
  const [dialogAjuste, setDialogAjuste] = useState(false);
  const [dialogLimite, setDialogLimite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formPago, setFormPago] = useState<PagoRequest>({ monto: 0, tipo: 'PAGO_EFECTIVO', descripcion: '' });
  const [formAjuste, setFormAjuste] = useState<AjusteRequest>({ monto: 0, descripcion: '' });
  const [nuevoLimite, setNuevoLimite] = useState(0);

  // Cargar dashboard al montar
  useEffect(() => {
    let activo = true;
    listarCuentasCorrientes()
      .then((r: { data: { data: CCResponse[] } }) => { if (activo) setListaCCs(r.data.data); })
      .catch(() => {})
      .finally(() => { if (activo) setLoadingDash(false); });
    return () => { activo = false; };
  }, []);

  // KPIs calculados del dashboard
  const totalDeuda = listaCCs.reduce((s, c) => s + (c.saldoActual > 0 ? c.saldoActual : 0), 0);
  const bloqueadas = listaCCs.filter(c => c.estado === 'BLOQUEADA').length;
  const conSaldo   = listaCCs.filter(c => c.saldoActual > 0).length;

  const handleBuscar = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    setError(null);
    try {
      const res = await buscarPersonas(busqueda);
      setPersonas(res.data.data.content);
    } catch {
      setError('Error al buscar personas');
    } finally {
      setBuscando(false);
    }
  };

  const seleccionarCC = async (item: CCResponse) => {
    setLoading(true);
    setError(null);
    setPersonas([]);
    setBusqueda(item.nombrePersona);
    try {
      const movRes = await getMovimientos(item.personaId);
      setCC(item);
      setMovimientos(movRes.data.data.content);
    } catch {
      setError('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarPersona = async (persona: PersonaResponse) => {
    setLoading(true);
    setError(null);
    setPersonas([]);
    setBusqueda(persona.nombre);
    try {
      const [ccRes, movRes] = await Promise.all([
        getCCPorPersona(persona.id),
        getMovimientos(persona.id),
      ]);
      setCC(ccRes.data.data);
      setMovimientos(movRes.data.data.content);
    } catch {
      setError('Esta persona no tiene cuenta corriente');
      setCC(null);
    } finally {
      setLoading(false);
    }
  };

  const volverDashboard = () => {
    setCC(null);
    setBusqueda('');
    setPersonas([]);
    setError(null);
  };

  const refrescarCC = async () => {
    if (!cc) return;
    const [ccRes, movRes] = await Promise.all([
      getCCPorPersona(cc.personaId),
      getMovimientos(cc.personaId),
    ]);
    setCC(ccRes.data.data);
    setMovimientos(movRes.data.data.content);
    // Actualizar también la lista del dashboard
    setListaCCs(prev => prev.map(c => c.personaId === cc.personaId ? ccRes.data.data : c));
  };

  const handlePago = async () => {
    if (!cc) return;
    setSaving(true);
    try {
      await registrarPago(cc.personaId, formPago);
      await refrescarCC();
      setDialogPago(false);
    } catch { setError('Error al registrar pago'); }
    finally { setSaving(false); }
  };

  const handleAjuste = async () => {
    if (!cc) return;
    setSaving(true);
    try {
      await ajustarCC(cc.personaId, formAjuste);
      await refrescarCC();
      setDialogAjuste(false);
    } catch { setError('Error al ajustar'); }
    finally { setSaving(false); }
  };

  const handleLimite = async () => {
    if (!cc) return;
    setSaving(true);
    try {
      await fijarLimite(cc.personaId, nuevoLimite);
      await refrescarCC();
      setDialogLimite(false);
    } catch { setError('Error al fijar límite'); }
    finally { setSaving(false); }
  };

  const handleLiquidar = async () => {
    if (!cc || !confirm('¿Confirmar liquidación mensual?')) return;
    try {
      await liquidarEmpleado(cc.personaId, cc.saldoActual);
      await refrescarCC();
    } catch { setError('Error al liquidar'); }
  };

  const pctUsado = cc?.limiteCredito
    ? Math.min((cc.saldoActual / cc.limiteCredito) * 100, 100)
    : 0;

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {cc && (
          <Button size="small" startIcon={<ArrowBackOutlinedIcon />}
            onClick={volverDashboard}
            sx={{ color: '#888780', fontWeight: 500, mr: 0.5, '&:hover': { color: ACCENT } }}>
            Volver
          </Button>
        )}
        <Box>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#2C2C2A', letterSpacing: '-0.3px' }}>
            {cc ? cc.nombrePersona : 'Cuenta Corriente'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#888780', mt: 0.25 }}>
            {cc ? 'Detalle de cuenta corriente' : 'Resumen general y gestión de cuentas'}
          </Typography>
        </Box>
        {cc && (
          <Chip
            label={ESTADO_STYLE[cc.estado].label}
            size="small"
            sx={{ ml: 'auto', bgcolor: ESTADO_STYLE[cc.estado].bg, color: ESTADO_STYLE[cc.estado].color, fontWeight: 700, fontSize: '0.75rem', height: 22, borderRadius: 1.5, border: 'none' }}
          />
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* ── DASHBOARD (sin CC seleccionada) ───────────────────── */}
      {!cc && (
        <>
          {/* KPIs */}
          {loadingDash ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} sx={{ color: ACCENT }} />
            </Box>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'Total cuentas', value: listaCCs.length, icon: <PeopleOutlinedIcon />, color: ACCENT, bg: ACCENT_BG },
                  { label: 'Deuda total', value: `$${totalDeuda.toLocaleString('es-AR')}`, icon: <TrendingUpOutlinedIcon />, color: '#C62828', bg: '#FFEBEE' },
                  { label: 'Con saldo pendiente', value: conSaldo, icon: <AccountBalanceOutlinedIcon />, color: '#92400E', bg: '#FFF8E1' },
                  { label: 'Bloqueadas', value: bloqueadas, icon: <WarningAmberOutlinedIcon />, color: bloqueadas > 0 ? '#C62828' : '#2E7D32', bg: bloqueadas > 0 ? '#FFEBEE' : '#E8F5E9' },
                ].map((kpi) => (
                  <Grid key={kpi.label} size={{ xs: 6, md: 3 }}>
                    <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3 }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <Box sx={{ bgcolor: kpi.bg, borderRadius: 1.5, p: 0.75, display: 'flex', color: kpi.color }}>
                            {kpi.icon}
                          </Box>
                          <Typography sx={{ fontSize: '0.8rem', color: '#888780' }}>{kpi.label}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: kpi.color, lineHeight: 1 }}>
                          {kpi.value}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Búsqueda */}
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                <TextField
                  size="small" placeholder="Buscar por nombre, CUIT o DNI..."
                  value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                  sx={{ flex: 1, ...fieldSx }}
                  slotProps={{ input: { startAdornment: <SearchOutlinedIcon sx={{ fontSize: 18, color: '#B4B2A9', mr: 0.5 }} /> } }}
                />
                <Button variant="contained" disableElevation onClick={handleBuscar} disabled={buscando}
                  sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 2.5, '&:hover': { bgcolor: '#2E4A7A' } }}>
                  {buscando ? <CircularProgress size={18} color="inherit" /> : 'Buscar'}
                </Button>
              </Box>

              {/* Resultados búsqueda */}
              {personas.length > 0 && (
                <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, mb: 2, overflow: 'hidden' }}>
                  {personas.map((p, i) => (
                    <Box key={p.id} onClick={() => seleccionarPersona(p)}
                      sx={{ px: 2, py: 1.5, cursor: 'pointer', borderBottom: i < personas.length - 1 ? '1px solid #F0EEE8' : 'none', display: 'flex', alignItems: 'center', gap: 1.5, '&:hover': { bgcolor: ACCENT_BG } }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: '50%', bgcolor: ACCENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: ACCENT }}>{p.nombre?.[0]?.toUpperCase()}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#2C2C2A' }}>{p.nombre}</Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: '#B4B2A9' }}>
                          {p.cuit ? `CUIT ${p.cuit}` : p.dni ? `DNI ${p.dni}` : ''}
                          {!p.tieneCuentaCorriente && ' · Sin cuenta corriente'}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Card>
              )}

              {/* Lista de todas las CCs */}
              <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ px: 2.5, pt: 2, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #F0EEE8' }}>
                  <Box sx={{ bgcolor: ACCENT_BG, borderRadius: 1.5, p: 0.75, display: 'flex' }}>
                    <AccountBalanceOutlinedIcon sx={{ fontSize: 18, color: ACCENT }} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#2C2C2A' }}>
                    Todas las cuentas
                  </Typography>
                  <Chip label={listaCCs.length} size="small"
                    sx={{ ml: 1, bgcolor: ACCENT_BG, color: ACCENT, fontWeight: 700, fontSize: '0.72rem', height: 20, borderRadius: 1, border: 'none' }} />
                  {/* Filtro rápido bloqueadas */}
                  {bloqueadas > 0 && (
                    <Chip label={`${bloqueadas} bloqueada${bloqueadas > 1 ? 's' : ''}`} size="small"
                      sx={{ ml: 'auto', bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 700, fontSize: '0.72rem', height: 20, borderRadius: 1, border: 'none' }} />
                  )}
                </Box>

                {listaCCs.length === 0 ? (
                  <Box sx={{ p: 6, textAlign: 'center' }}>
                    <AccountBalanceOutlinedIcon sx={{ fontSize: 40, color: '#D3D1C7', mb: 1 }} />
                    <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>No hay cuentas corrientes registradas</Typography>
                  </Box>
                ) : (
                  // Ordenar: bloqueadas primero, luego por saldo desc
                  [...listaCCs]
                    .sort((a, b) => {
                      if (a.estado === 'BLOQUEADA' && b.estado !== 'BLOQUEADA') return -1;
                      if (b.estado === 'BLOQUEADA' && a.estado !== 'BLOQUEADA') return 1;
                      return b.saldoActual - a.saldoActual;
                    })
                    .map((c, i) => {
                      const est = ESTADO_STYLE[c.estado];
                      const pct = c.limiteCredito ? Math.min((c.saldoActual / c.limiteCredito) * 100, 100) : 0;
                      return (
                        <Box key={c.id} onClick={() => seleccionarCC(c)}
                          sx={{ px: 2.5, py: 1.75, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, borderBottom: i < listaCCs.length - 1 ? '1px solid #F0EEE8' : 'none', '&:hover': { bgcolor: '#FAFAF9' } }}>
                          {/* Avatar */}
                          <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: c.estado === 'BLOQUEADA' ? '#FFEBEE' : ACCENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: c.estado === 'BLOQUEADA' ? '#C62828' : ACCENT }}>
                              {c.nombrePersona?.[0]?.toUpperCase()}
                            </Typography>
                          </Box>
                          {/* Nombre y tipo */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#2C2C2A', mb: 0.25 }}>
                              {c.nombrePersona}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontSize: '0.75rem', color: '#B4B2A9' }}>
                                {c.tipoTitular === 'EMPLEADO' ? 'Empleado' : 'Cliente'}
                              </Typography>
                              {c.limiteCredito != null && (
                                <>
                                  <Box sx={{ width: 80, height: 4, bgcolor: '#F0EEE8', borderRadius: 2, overflow: 'hidden' }}>
                                    <Box sx={{ height: '100%', borderRadius: 2, width: `${pct}%`, bgcolor: pct > 80 ? '#C62828' : pct > 50 ? '#F59E0B' : ACCENT }} />
                                  </Box>
                                  <Typography sx={{ fontSize: '0.72rem', color: '#B4B2A9' }}>
                                    {pct.toFixed(0)}%
                                  </Typography>
                                </>
                              )}
                            </Box>
                          </Box>
                          {/* Saldo */}
                          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: c.saldoActual > 0 ? '#C62828' : '#2E7D32' }}>
                              ${c.saldoActual.toLocaleString('es-AR')}
                            </Typography>
                            {c.limiteCredito != null && (
                              <Typography sx={{ fontSize: '0.72rem', color: '#B4B2A9' }}>
                                límite ${c.limiteCredito.toLocaleString('es-AR')}
                              </Typography>
                            )}
                          </Box>
                          {/* Estado */}
                          <Chip label={est.label} size="small"
                            sx={{ bgcolor: est.bg, color: est.color, fontWeight: 700, fontSize: '0.72rem', height: 20, borderRadius: 1, border: 'none', flexShrink: 0 }} />
                        </Box>
                      );
                    })
                )}
              </Card>
            </>
          )}
        </>
      )}

      {/* ── DETALLE DE CUENTA ─────────────────────────────────── */}
      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
          <CircularProgress size={28} sx={{ color: ACCENT }} />
          <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>Cargando...</Typography>
        </Box>
      )}

      {cc && !loading && (
        <>
          {/* Cards saldo */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Box sx={{ bgcolor: cc.saldoActual > 0 ? '#FFEBEE' : '#E8F5E9', borderRadius: 1.5, p: 0.75, display: 'flex' }}>
                      {cc.saldoActual > 0
                        ? <TrendingUpOutlinedIcon sx={{ fontSize: 18, color: '#C62828' }} />
                        : <TrendingDownOutlinedIcon sx={{ fontSize: 18, color: '#2E7D32' }} />}
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#2C2C2A' }}>Saldo actual</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '2.2rem', fontWeight: 700, color: cc.saldoActual > 0 ? '#C62828' : '#2E7D32', lineHeight: 1, mb: 1 }}>
                    ${cc.saldoActual.toLocaleString('es-AR')}
                  </Typography>
                  {cc.limiteCredito != null && (
                    <>
                      <Typography sx={{ fontSize: '0.8rem', color: '#888780', mb: 0.75 }}>
                        Límite: ${cc.limiteCredito.toLocaleString('es-AR')}
                      </Typography>
                      <Box sx={{ height: 6, bgcolor: '#F0EEE8', borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', borderRadius: 3, width: `${pctUsado}%`, bgcolor: pctUsado > 80 ? '#C62828' : pctUsado > 50 ? '#F59E0B' : ACCENT, transition: 'width 0.3s' }} />
                      </Box>
                      <Typography sx={{ fontSize: '0.75rem', color: '#B4B2A9', mt: 0.5 }}>
                        {pctUsado.toFixed(0)}% del límite utilizado
                      </Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography sx={{ fontSize: '0.8rem', color: '#888780', mb: 2 }}>Información de cuenta</Typography>
                  {[
                    { label: 'Tipo titular', val: cc.tipoTitular === 'EMPLEADO' ? 'Empleado' : 'Cliente' },
                    { label: 'Estado', val: ESTADO_STYLE[cc.estado].label },
                    { label: 'Movimientos', val: movimientos.length },
                  ].map(row => (
                    <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid #F4F3F1' }}>
                      <Typography sx={{ fontSize: '0.85rem', color: '#888780' }}>{row.label}</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#2C2C2A' }}>{row.val}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Acciones */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            <Button variant="contained" disableElevation startIcon={<PaymentsOutlinedIcon />}
              onClick={() => { setFormPago({ monto: 0, tipo: 'PAGO_EFECTIVO', descripcion: '' }); setDialogPago(true); }}
              sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#2E4A7A' } }}>
              Registrar pago
            </Button>
            <Button variant="outlined" startIcon={<TuneOutlinedIcon />}
              onClick={() => { setFormAjuste({ monto: 0, descripcion: '' }); setDialogAjuste(true); }}
              sx={{ borderColor: '#E3E1DB', borderRadius: 2, color: '#3C3B38', fontWeight: 500, '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG } }}>
              Ajuste
            </Button>
            <Button variant="outlined" startIcon={<CreditScoreOutlinedIcon />}
              onClick={() => { setNuevoLimite(cc.limiteCredito ?? 0); setDialogLimite(true); }}
              sx={{ borderColor: '#E3E1DB', borderRadius: 2, color: '#3C3B38', fontWeight: 500, '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG } }}>
              Fijar límite
            </Button>
            {cc.tipoTitular === 'EMPLEADO' && (
              <Button variant="outlined" onClick={handleLiquidar}
                sx={{ borderColor: '#FFE082', borderRadius: 2, color: '#92400E', fontWeight: 500, bgcolor: '#FFF8E1', '&:hover': { bgcolor: '#FFE082' } }}>
                Liquidar
              </Button>
            )}
          </Box>

          {/* Movimientos */}
          <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ bgcolor: ACCENT_BG, borderRadius: 1.5, p: 0.75, display: 'flex' }}>
                <AccountBalanceOutlinedIcon sx={{ fontSize: 18, color: ACCENT }} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A' }}>Movimientos</Typography>
              <Chip label={`${movimientos.length} registros`} size="small"
                sx={{ ml: 1, bgcolor: ACCENT_BG, color: ACCENT, fontWeight: 600, fontSize: '0.72rem', height: 20, borderRadius: 1, border: 'none' }} />
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F4F3F1' }}>
                  {['Fecha', 'Tipo', 'Descripción', 'Monto', 'Saldo'].map(col => (
                    <TableCell key={col} sx={{ fontWeight: 700, color: '#888780', fontSize: '0.8rem', py: 1.5 }}>{col}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {movimientos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
                        <AccountBalanceOutlinedIcon sx={{ fontSize: 40, color: '#D3D1C7' }} />
                        <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>Sin movimientos</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : movimientos.map(m => (
                  <TableRow key={m.id} sx={{ '&:hover': { bgcolor: '#FAFAF9' }, '& td': { borderBottom: '1px solid #F0EEE8' } }}>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: '#888780' }}>
                        {new Date(m.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={TIPO_MOV_LABEL[m.tipo] ?? m.tipo} size="small"
                        sx={{ bgcolor: TIPO_MOV_COLOR[m.tipo]?.bg ?? ACCENT_BG, color: TIPO_MOV_COLOR[m.tipo]?.color ?? ACCENT, fontWeight: 600, fontSize: '0.72rem', height: 20, borderRadius: 1, border: 'none' }} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', color: '#5F5E5A' }}>{m.descripcion}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {m.monto > 0
                          ? <TrendingUpOutlinedIcon sx={{ fontSize: 14, color: '#C62828' }} />
                          : <TrendingDownOutlinedIcon sx={{ fontSize: 14, color: '#2E7D32' }} />}
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: m.monto > 0 ? '#C62828' : '#2E7D32' }}>
                          {m.monto > 0 ? '+' : ''}${m.monto?.toLocaleString('es-AR')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#2C2C2A' }}>
                        ${m.saldoPost?.toLocaleString('es-AR')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Dialog — Pago */}
      <Dialog open={dialogPago} onClose={() => setDialogPago(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>Registrar pago</DialogTitle>
        <DialogContent>
          {cc && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: ACCENT_BG, borderRadius: 2 }}>
              <Typography sx={{ fontSize: '0.85rem', color: ACCENT, fontWeight: 500 }}>{cc.nombrePersona}</Typography>
              <Typography sx={{ fontSize: '0.82rem', color: '#888780', mt: 0.25 }}>
                Saldo: <strong style={{ color: '#C62828' }}>${cc.saldoActual?.toLocaleString('es-AR')}</strong>
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField size="small" label="Monto *" type="number" fullWidth sx={fieldSx}
              value={formPago.monto}
              onChange={(e) => setFormPago(f => ({ ...f, monto: Number(e.target.value) }))} />
            <FormControl size="small" fullWidth>
              <InputLabel>Tipo de pago</InputLabel>
              <Select label="Tipo de pago" value={formPago.tipo} sx={{ borderRadius: 2 }}
                onChange={(e) => setFormPago(f => ({ ...f, tipo: e.target.value as TipoMovimientoCC }))}>
                <MenuItem value="PAGO_EFECTIVO">Efectivo</MenuItem>
                <MenuItem value="PAGO_TRANSFERENCIA">Transferencia</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" label="Descripción" fullWidth sx={fieldSx}
              value={formPago.descripcion}
              onChange={(e) => setFormPago(f => ({ ...f, descripcion: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogPago(false)} sx={{ color: '#888780', borderRadius: 2 }}>Cancelar</Button>
          <Button variant="contained" disableElevation onClick={handlePago} disabled={saving || formPago.monto <= 0}
            sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#2E4A7A' } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Confirmar pago'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Ajuste */}
      <Dialog open={dialogAjuste} onClose={() => setDialogAjuste(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>Ajuste de saldo</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 1.5, bgcolor: '#FFF8E1', borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.82rem', color: '#92400E' }}>
              Usá valores positivos para aumentar el saldo y negativos para reducirlo.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField size="small" label="Monto *" type="number" fullWidth sx={fieldSx}
              value={formAjuste.monto}
              onChange={(e) => setFormAjuste(f => ({ ...f, monto: Number(e.target.value) }))} />
            <TextField size="small" label="Descripción *" fullWidth sx={fieldSx}
              value={formAjuste.descripcion}
              onChange={(e) => setFormAjuste(f => ({ ...f, descripcion: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogAjuste(false)} sx={{ color: '#888780', borderRadius: 2 }}>Cancelar</Button>
          <Button variant="contained" disableElevation onClick={handleAjuste} disabled={saving || !formAjuste.descripcion}
            sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#2E4A7A' } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Confirmar ajuste'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Límite */}
      <Dialog open={dialogLimite} onClose={() => setDialogLimite(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>Fijar límite de crédito</DialogTitle>
        <DialogContent>
          {cc && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: ACCENT_BG, borderRadius: 2 }}>
              <Typography sx={{ fontSize: '0.85rem', color: ACCENT, fontWeight: 500 }}>{cc.nombrePersona}</Typography>
              <Typography sx={{ fontSize: '0.82rem', color: '#888780', mt: 0.25 }}>
                Límite actual: <strong>${cc.limiteCredito?.toLocaleString('es-AR') ?? '0'}</strong>
              </Typography>
            </Box>
          )}
          <TextField size="small" label="Nuevo límite *" type="number" fullWidth sx={fieldSx}
            value={nuevoLimite}
            onChange={(e) => setNuevoLimite(Number(e.target.value))} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogLimite(false)} sx={{ color: '#888780', borderRadius: 2 }}>Cancelar</Button>
          <Button variant="contained" disableElevation onClick={handleLimite} disabled={saving}
            sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#2E4A7A' } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
