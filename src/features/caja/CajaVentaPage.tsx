import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Grid, Divider, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip,
} from '@mui/material';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { buscarProductos, agregarItem, cobrarVenta, crearVenta } from '../../api/ventaApi';
import type { ProductoResponse } from '../../types/producto';
import type { VentaResponse } from '../../types/venta';
import type { MedioPago } from '../../types/medioPago';
import type { PersonaResponse } from '../../types/personas';
import { buscarPersonas } from '../../api/personasApi';
import { abrirCaja, miTurnoActual } from '../../api/cajaApi';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2, bgcolor: '#FAFAF9',
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1 },
  },
};

const MEDIOS: { value: MedioPago; label: string; key: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo', key: 'F1' },
  { value: 'TARJETA_DEBITO', label: 'Débito', key: 'F2' },
  { value: 'TARJETA_CREDITO', label: 'Crédito', key: 'F3' },
  { value: 'TRANSFERENCIA', label: 'Transferencia', key: 'F4' },
  { value: 'CUENTA_CORRIENTE', label: 'Cta. Cte.', key: 'F5' },
];

type Paso = 'dni' | 'fondo' | 'abierta';

export default function CajaVentaPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const montoRef = useRef<HTMLInputElement>(null);

  const [paso, setPaso] = useState<Paso>('dni');
  const [dni, setDni] = useState('');
  const [empleado, setEmpleado] = useState<PersonaResponse | null>(null);
  const [buscandoEmpleado, setBuscandoEmpleado] = useState(false);

  const [codigo, setCodigo] = useState('');
  const [sugerencias, setSugerencias] = useState<ProductoResponse[]>([]);
  const [indiceSugerencia, setIndiceSugerencia] = useState(0);
  const [buscando, setBuscando] = useState(false);

  const [venta, setVenta] = useState<VentaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [medio, setMedio] = useState<MedioPago>('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cobrando, setCobrando] = useState(false);

  const [dialogTicket, setDialogTicket] = useState(false);
  const [ventaCobrada, setVentaCobrada] = useState<VentaResponse | null>(null);
  const [vueltoFinal, setVueltoFinal] = useState(0);
  const [medioFinal, setMedioFinal] = useState<MedioPago>('EFECTIVO');
  const [montoRecibidoFinal, setMontoRecibidoFinal] = useState('');
  const [fondoInicial, setFondoInicial] = useState('');
  const [abriendo, setAbriendo] = useState(false);
  const [cajeroNombre, setCajeroNombre] = useState('');
  const [verificandoTurno, setVerificandoTurno] = useState(true);

  const total = venta?.total ?? 0;
  const vuelto = medio === 'EFECTIVO' && montoRecibido
    ? Math.max(0, Number(montoRecibido) - total) : 0;
  const montoValido = medio === 'EFECTIVO'
    ? Number(montoRecibido) >= total : true;

  const focoInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (paso === 'abierta') focoInput();
  }, [paso, focoInput]);

  // Al montar, verificar si el usuario ya tiene un turno ABIERTO.
  // Si lo tiene, saltar directo al paso 'abierta' en lugar de pedir
  // DNI/fondo y terminar disparando el 422 "Ya tenés un turno abierto".
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await miTurnoActual();
        const turno = res.data.data;
        if (activo && turno) {
          setCajeroNombre(turno.nombreUsuario);
          setPaso('abierta');
        }
      } catch {
        // si falla la verificación, seguimos con el flujo normal de DNI
      } finally {
        if (activo) setVerificandoTurno(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (paso !== 'abierta') return;
      const m = MEDIOS.find(m => m.key === e.key);
      if (m) {
        e.preventDefault();
        setMedio(m.value);
        setMontoRecibido('');
        if (m.value === 'EFECTIVO') setTimeout(() => montoRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paso]);

  const buscarEmpleado = async () => {
    if (!dni.trim()) return;
    setBuscandoEmpleado(true);
    setError(null);
    try {
      const res = await buscarPersonas(dni);
      const emp = res.data.data.content.find(p => p.esEmpleado && p.dni === dni);
      if (emp) {
        setEmpleado(emp);
        setPaso('fondo'); // ← va a pedir fondo
      } else {
        setError('No se encontró un empleado con ese DNI');
      }
    } catch {
      setError('Error al identificar empleado');
    } finally {
      setBuscandoEmpleado(false);
    }
  };

  const handleAbrirCaja = async () => {
    setAbriendo(true);
    setError(null);
    try {
      await abrirCaja(Number(fondoInicial));
      setPaso('abierta');
    } catch {
      setError('Error al abrir caja. Verificá que no haya un turno ya abierto.');
    } finally {
      setAbriendo(false);
    }
  };

  const agregarProducto = useCallback(async (producto: ProductoResponse, cantidad = 1) => {
  setSugerencias([]);
  setCodigo('');
  setLoading(true);
  setError(null);
  try {
    let ventaId = venta?.id;
    if (!ventaId) {
      const res = await crearVenta();
      ventaId = res.data.data.id;
    }
    const res = await agregarItem(ventaId, { productoId: producto.id, cantidad });
    setVenta(res.data.data);
  } catch {
    setError('Producto no encontrado o sin stock');
  } finally {
    setLoading(false);
    focoInput();
  }
}, [venta, focoInput]);

  const handleEnterCodigo = async () => {
  if (!codigo.trim()) return;
  setBuscando(true);
  setError(null);
  try {
    let cantidadSolicitada = 1;
    let codigoBusqueda = codigo.trim();

    if (codigo.includes('*')) {
      const [cantStr, cod] = codigo.split('*');
      cantidadSolicitada = parseInt(cantStr) || 1;
      codigoBusqueda = cod.trim();
    }

    const res = await buscarProductos(codigoBusqueda);
    const resultados = res.data.data.content;
    if (resultados.length === 1) {
      await agregarProducto(resultados[0], cantidadSolicitada);
    } else if (resultados.length > 1) {
      setSugerencias(resultados);
      setIndiceSugerencia(0);
    } else {
      setError(`No se encontró producto con código "${codigoBusqueda}"`);
      focoInput();
    }
  } finally {
    setBuscando(false);
  }
};

  const handleKeyDownCodigo = async (e: React.KeyboardEvent) => {
    if (sugerencias.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndiceSugerencia(i => Math.min(i + 1, sugerencias.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIndiceSugerencia(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); await agregarProducto(sugerencias[indiceSugerencia]); }
      else if (e.key === 'Escape') { setSugerencias([]); setCodigo(''); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      await handleEnterCodigo();
    }
  };

  const handleCobrar = async () => {
    if (!venta || !montoValido) return;
    setCobrando(true);
    setError(null);
    try {
      const res = await cobrarVenta(venta.id, {
        pagos: [{ medio, monto: total }],
        emitirComprobante: true,
      });
      setVueltoFinal(vuelto);
      setMedioFinal(medio);
      setMontoRecibidoFinal(montoRecibido);
      setVentaCobrada(res.data.data);
      setDialogTicket(true);
      setVenta(null);
      setMontoRecibido('');
      setMedio('EFECTIVO');
    } catch {
      setError('Error al cobrar');
    } finally {
      setCobrando(false);
    }
  };

  const handleMontoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && montoValido && venta && venta.items.length > 0) {
      void handleCobrar();
    }
  };

  const handleNuevaVenta = () => {
    setDialogTicket(false);
    setVentaCobrada(null);
    focoInput();
  };

  // ─── Verificando si ya hay un turno abierto ──────────────────
  if (verificandoTurno) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  // ─── Paso DNI ───────────────────────────────────────────────
  if (paso === 'dni') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <Box sx={{ width: 420 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PointOfSaleOutlinedIcon sx={{ fontSize: 20, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#2C2C2A', lineHeight: 1 }}>Apertura de caja</Typography>
              <Typography sx={{ fontSize: '0.82rem', color: '#888780' }}>Identificate para continuar</Typography>
            </Box>
          </Box>

          <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <Box sx={{ bgcolor: ACCENT_BG, borderRadius: 1.5, p: 0.75, display: 'flex' }}>
                  <BadgeOutlinedIcon sx={{ fontSize: 18, color: ACCENT }} />
                </Box>
                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#2C2C2A' }}>
                  Identificación del cajero
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>
              )}

              <TextField
                label="DNI"
                type="number"
                fullWidth
                size="small"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void buscarEmpleado()}
                autoFocus
                sx={{ mb: 2, ...fieldSx }}
              />
              <Button
                fullWidth variant="contained" disableElevation
                disabled={buscandoEmpleado || !dni.trim()}
                onClick={() => void buscarEmpleado()}
                sx={{ py: 1.3, borderRadius: 2, bgcolor: ACCENT, fontWeight: 600, '&:hover': { bgcolor: '#2E4A7A' } }}
              >
                {buscandoEmpleado
                  ? <CircularProgress size={20} color="inherit" />
                  : 'Continuar — Enter ↵'
                }
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }
  if (paso === 'fondo') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <Box sx={{ width: 420 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PointOfSaleOutlinedIcon sx={{ fontSize: 20, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#2C2C2A', lineHeight: 1 }}>Abrir caja</Typography>
              <Typography sx={{ fontSize: '0.82rem', color: '#888780' }}>Ingresá el fondo inicial del turno</Typography>
            </Box>
          </Box>

          <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              {/* Empleado */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, p: 1.5, bgcolor: ACCENT_BG, borderRadius: 2 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                    {empleado?.nombre?.[0] ?? '?'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#2C2C2A' }}>{empleado?.nombre}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#888780' }}>DNI {empleado?.dni}</Typography>
                </Box>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>
              )}

              <TextField
                label="Fondo inicial ($)"
                type="number"
                fullWidth size="small"
                value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fondoInicial && void handleAbrirCaja()}
                autoFocus
                sx={{ mb: 2, ...fieldSx }}
              />
              <Button
                fullWidth variant="contained" disableElevation
                disabled={abriendo || !fondoInicial}
                onClick={() => void handleAbrirCaja()}
                sx={{ py: 1.3, borderRadius: 2, bgcolor: ACCENT, fontWeight: 600, '&:hover': { bgcolor: '#2E4A7A' } }}
              >
                {abriendo
                  ? <CircularProgress size={20} color="inherit" />
                  : 'Abrir turno — Enter ↵'
                }
              </Button>
              <Button fullWidth onClick={() => { setPaso('dni'); setDni(''); setEmpleado(null); setError(null); }}
                sx={{ mt: 1, color: '#888780', borderRadius: 2 }}>
                ← Volver
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }
  // ─── Cobro ──────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 2, height: '100%' }}>

      {/* Panel izquierdo — productos */}
      <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1, p: 2.5 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A' }}>Productos</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#888780', mt: 0.25 }}>
                Cajero: <strong style={{ color: ACCENT }}>{empleado?.nombre ?? cajeroNombre}</strong>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {loading && <CircularProgress size={18} sx={{ color: ACCENT }} />}
              {venta && (
                <Chip
                  label={`${venta.items.reduce((a, i) => a + i.cantidad, 0)} ítem${venta.items.length !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{ bgcolor: ACCENT_BG, color: ACCENT, fontWeight: 600, fontSize: '0.75rem', height: 22, borderRadius: 1.5, border: 'none' }}
                />
              )}
            </Box>
          </Box>

          {/* Buscador */}
          <Box sx={{ position: 'relative', mb: 2 }}>
            <TextField
              inputRef={inputRef}
              fullWidth size="small"
              placeholder="Código de barras o nombre — Enter para buscar"
              value={codigo}
              onChange={(e) => { setCodigo(e.target.value); setSugerencias([]); setError(null); }}
              onKeyDown={handleKeyDownCodigo}
              disabled={loading || buscando}
              sx={fieldSx}
              slotProps={{
                input: {
                  startAdornment: <SearchOutlinedIcon sx={{ fontSize: 18, color: '#B4B2A9', mr: 0.5 }} />,
                  endAdornment: buscando ? <CircularProgress size={16} sx={{ color: ACCENT }} /> : null,
                }
              }}
            />

            {/* Sugerencias */}
            {sugerencias.length > 0 && (
              <Card elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, mt: 0.5, maxHeight: 280, overflow: 'auto', borderRadius: 2 }}>
                <Box sx={{ px: 2, py: 0.75, bgcolor: '#F4F3F1', borderBottom: '1px solid #F0EEE8' }}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#B4B2A9' }}>
                    ↑↓ navegar · Enter seleccionar · Esc cancelar
                  </Typography>
                </Box>
                {sugerencias.map((p, i) => (
                  <Box key={p.id} onClick={() => void agregarProducto(p)} sx={{
                    px: 2, py: 1.2, cursor: 'pointer',
                    bgcolor: i === indiceSugerencia ? ACCENT_BG : '#fff',
                    borderBottom: '1px solid #F0EEE8',
                    '&:last-child': { borderBottom: 'none' },
                    '&:hover': { bgcolor: ACCENT_BG },
                  }}>
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#2C2C2A' }}>{p.nombre}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#B4B2A9' }}>
                      {p.codigo} · ${p.precioVenta1?.toLocaleString('es-AR')} · Stock: {p.stockActual}
                    </Typography>
                  </Box>
                ))}
              </Card>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>
          )}

          {/* Lista de items */}
          {!venta || venta.items.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 1 }}>
              <SearchOutlinedIcon sx={{ fontSize: 36, color: '#D3D1C7' }} />
              <Typography sx={{ fontSize: '0.9rem', color: '#B4B2A9' }}>Escaneá un producto para comenzar</Typography>
            </Box>
          ) : (
            venta.items.map((item) => (
  <Box key={item.id} sx={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    py: 1.2, borderBottom: '1px solid #F0EEE8',
    '&:hover': { bgcolor: '#FAFAF9' },
  }}>
    <Box sx={{ flex: 1 }}>
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#2C2C2A' }}>
        {item.nombreProducto}
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: '#B4B2A9' }}>
        {item.cantidad} × ${item.precioUnitario?.toLocaleString('es-AR')}
      </Typography>
    </Box>
    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#2C2C2A', minWidth: 72, textAlign: 'right' }}>
      ${item.subtotal?.toLocaleString('es-AR')}
    </Typography>
  </Box>
))
          )}
        </CardContent>
      </Card>

      {/* Panel derecho */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Resumen */}
        <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A', mb: 1.5 }}>Resumen</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.85rem', color: '#888780' }}>Subtotal</Typography>
              <Typography sx={{ fontSize: '0.85rem', color: '#2C2C2A' }}>${venta?.subtotal?.toLocaleString('es-AR') ?? '0'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.85rem', color: '#888780' }}>IVA</Typography>
              <Typography sx={{ fontSize: '0.85rem', color: '#2C2C2A' }}>${venta?.totalIva?.toLocaleString('es-AR') ?? '0'}</Typography>
            </Box>
            <Divider sx={{ my: 1.5, borderColor: '#E3E1DB' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#2C2C2A' }}>Total</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: ACCENT }}>
                ${total?.toLocaleString('es-AR')}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Medio de pago */}
        <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, flex: 1 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A', mb: 0.5 }}>Medio de pago</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: '#B4B2A9', mb: 1.5 }}>F1–F5 para seleccionar</Typography>

            <Grid container spacing={1} sx={{ mb: 1.5 }}>
              {MEDIOS.map((m) => (
                <Grid size={{ xs: 6 }} key={m.value}>
                  <Button
                    fullWidth variant={medio === m.value ? 'contained' : 'outlined'} disableElevation
                    onClick={() => {
                      setMedio(m.value);
                      setMontoRecibido('');
                      if (m.value === 'EFECTIVO') setTimeout(() => montoRef.current?.focus(), 50);
                    }}
                    sx={{
                      borderRadius: 2, py: 1, fontSize: '0.8rem',
                      borderColor: medio === m.value ? ACCENT : '#E3E1DB',
                      bgcolor: medio === m.value ? ACCENT : '#FAFAF9',
                      color: medio === m.value ? '#fff' : '#3C3B38',
                      fontWeight: medio === m.value ? 600 : 400,
                      '&:hover': {
                        bgcolor: medio === m.value ? '#2E4A7A' : ACCENT_BG,
                        borderColor: ACCENT,
                        color: medio === m.value ? '#fff' : ACCENT,
                      },
                    }}
                  >
                    {m.label}
                  </Button>
                </Grid>
              ))}
            </Grid>

            {medio === 'EFECTIVO' && (
              <>
                <TextField
                  inputRef={montoRef}
                  fullWidth size="small"
                  label="Monto recibido"
                  type="number"
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  onKeyDown={handleMontoKeyDown}
                  sx={{ mb: 1.5, ...fieldSx }}
                />
                {montoRecibido && Number(montoRecibido) >= total && (
                  <Box sx={{ bgcolor: '#E8F5E9', borderRadius: 2, px: 2, py: 1.2, display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography sx={{ fontSize: '0.85rem', color: '#2E7D32' }}>Vuelto</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2E7D32' }}>
                      ${vuelto?.toLocaleString('es-AR')}
                    </Typography>
                  </Box>
                )}
                {montoRecibido && Number(montoRecibido) < total && (
                  <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2, py: 0.5 }}>
                    Faltan ${(total - Number(montoRecibido)).toLocaleString('es-AR')}
                  </Alert>
                )}
              </>
            )}

            <Button
              fullWidth variant="contained" disableElevation
              disabled={cobrando || loading || !venta || venta.items.length === 0 || !montoValido}
              onClick={() => void handleCobrar()}
              sx={{
                py: 1.5, borderRadius: 2, fontSize: '1rem', fontWeight: 700,
                bgcolor: ACCENT, '&:hover': { bgcolor: '#2E4A7A' },
                '&.Mui-disabled': { bgcolor: '#E3E1DB', color: '#B4B2A9' },
              }}
            >
              {cobrando
                ? <CircularProgress size={20} color="inherit" />
                : `Cobrar $${total?.toLocaleString('es-AR')} — Enter ↵`
              }
            </Button>
            <Typography sx={{ display: 'block', textAlign: 'center', fontSize: '0.75rem', color: '#B4B2A9', mt: 1 }}>
              🖨 Se imprimirá el ticket automáticamente
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Dialog ticket */}
      <Dialog open={dialogTicket} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', textAlign: 'center', pb: 1 }}>
          ✓ Venta cobrada
        </DialogTitle>
        <DialogContent>
          {ventaCobrada && (
            <Box id="ticket-print" sx={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8 }}>
              <Typography sx={{ textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}>SUPERMERCADO</Typography>
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: '#B4B2A9', fontFamily: 'monospace' }}>================================</Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                Venta #{ventaCobrada.id} · {new Date(ventaCobrada.fechaHora).toLocaleString('es-AR')}
              </Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'monospace' }}>Cajero: {empleado?.nombre ?? cajeroNombre}</Typography>
              <Typography sx={{ fontSize: 11, color: '#B4B2A9', fontFamily: 'monospace', mb: 1 }}>
                Cliente: {ventaCobrada.nombrePersona ?? 'Consumidor final'}
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: '#B4B2A9', fontFamily: 'monospace' }}>--------------------------------</Typography>
              {ventaCobrada.items.map((item) => (
                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 12, fontFamily: 'monospace', flex: 1 }} noWrap>
                    {item.cantidad}x {item.nombreProducto}
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontFamily: 'monospace', ml: 1 }}>
                    ${item.subtotal?.toLocaleString('es-AR')}
                  </Typography>
                </Box>
              ))}
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: '#B4B2A9', fontFamily: 'monospace', mt: 0.5 }}>--------------------------------</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: '#888780' }}>Subtotal</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>${ventaCobrada.subtotal?.toLocaleString('es-AR')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: '#888780' }}>IVA</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>${ventaCobrada.totalIva?.toLocaleString('es-AR')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }}>TOTAL</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }}>
                  ${ventaCobrada.total?.toLocaleString('es-AR')}
                </Typography>
              </Box>
              {medioFinal === 'EFECTIVO' && montoRecibidoFinal && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: '#888780' }}>Recibido</Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>${Number(montoRecibidoFinal).toLocaleString('es-AR')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: '#2E7D32' }}>Vuelto</Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: '#2E7D32' }}>${vueltoFinal?.toLocaleString('es-AR')}</Typography>
                  </Box>
                </>
              )}
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: '#B4B2A9', fontFamily: 'monospace', mt: 1 }}>================================</Typography>
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: '#B4B2A9', fontFamily: 'monospace' }}>¡Gracias por su compra!</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}
            sx={{ borderColor: '#E3E1DB', borderRadius: 2, color: '#3C3B38' }}>
            Imprimir
          </Button>
          <Button fullWidth variant="contained" disableElevation onClick={handleNuevaVenta} autoFocus
            sx={{ py: 1.2, borderRadius: 2, bgcolor: ACCENT, fontWeight: 600, '&:hover': { bgcolor: '#2E4A7A' } }}>
            Nueva venta — Enter ↵
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}