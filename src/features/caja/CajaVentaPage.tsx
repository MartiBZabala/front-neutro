import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Grid, IconButton, Divider, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { buscarProductos, agregarItem, cobrarVenta, crearVenta } from '../../api/ventaApi';
import { abrirCaja } from '../../api/cajaApi';

import type { ProductoResponse } from '../../types/producto';
import type { VentaResponse } from '../../types/venta';
import type { MedioPago } from '../../types/medioPago';
import type { PersonaResponse } from '../../types/personas';


const MEDIOS: { value: MedioPago; label: string; key: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo (F1)', key: 'F1' },
  { value: 'TARJETA_DEBITO', label: 'Débito (F2)', key: 'F2' },
  { value: 'TARJETA_CREDITO', label: 'Crédito (F3)', key: 'F3' },
  { value: 'TRANSFERENCIA', label: 'Transferencia (F4)', key: 'F4' },
  { value: 'CUENTA_CORRIENTE', label: 'Cta. Cte. (F5)', key: 'F5' },
];

type Paso = 'dni' | 'fondo' | 'abierta';

export default function CajaVentaPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const montoRef = useRef<HTMLInputElement>(null);

  // Pasos de apertura
  const [paso, setPaso] = useState<Paso>('dni');
  const [dni, setDni] = useState('');
  const [empleado, setEmpleado] = useState<PersonaResponse | null>(null);
  const [buscandoEmpleado, setBuscandoEmpleado] = useState(false);
  const [fondoInicial, setFondoInicial] = useState('');
  const [abriendo, setAbriendo] = useState(false);

  // Búsqueda de producto
  const [codigo, setCodigo] = useState('');
  const [sugerencias, setSugerencias] = useState<ProductoResponse[]>([]);
  const [indiceSugerencia, setIndiceSugerencia] = useState(0);
  const [buscando, setBuscando] = useState(false);

  // Venta
  const [venta, setVenta] = useState<VentaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cobro
  const [medio, setMedio] = useState<MedioPago>('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cobrando, setCobrando] = useState(false);

  // Ticket
  const [dialogTicket, setDialogTicket] = useState(false);
  const [ventaCobrada, setVentaCobrada] = useState<VentaResponse | null>(null);
  const [vueltoFinal, setVueltoFinal] = useState(0);
  const [medioFinal, setMedioFinal] = useState<MedioPago>('EFECTIVO');
  const [montoRecibidoFinal, setMontoRecibidoFinal] = useState('');

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

  // F1-F5 para medio de pago
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
    await new Promise((r) => setTimeout(r, 400)); // mock
    if (dni === '12345678') {
      setEmpleado({ id: 1, nombre: 'Juan Pérez', dni: '12345678', esEmpleado: true, esCliente: false, tieneCuentaCorriente: false, activo: true, razonSocial: null, cuit: null, condicionIVA: 'CONSUMIDOR_FINAL', domicilio: null, email: null, telefono: null });
      setPaso('abierta'); // ← directo a cobrar, sin fondo
    } else {
      setError('No se encontró un empleado con ese DNI');
    }
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
      setError('Error al abrir caja');
    } finally {
      setAbriendo(false);
    }
  };

  const agregarProducto = useCallback(async (producto: ProductoResponse) => {
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
      const res = await agregarItem(ventaId, { productoId: producto.id, cantidad: 1 });
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
      const res = await buscarProductos(codigo);
      const resultados = res.data.data;
      if (resultados.length === 1) {
        await agregarProducto(resultados[0]);
      } else if (resultados.length > 1) {
        setSugerencias(resultados);
        setIndiceSugerencia(0);
      } else {
        setError(`No se encontró producto con código "${codigo}"`);
        focoInput();
      }
    } finally {
      setBuscando(false);
    }
  };

  const handleKeyDownCodigo = async (e: React.KeyboardEvent) => {
    if (sugerencias.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndiceSugerencia(i => Math.min(i + 1, sugerencias.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndiceSugerencia(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        await agregarProducto(sugerencias[indiceSugerencia]);
      } else if (e.key === 'Escape') {
        setSugerencias([]);
        setCodigo('');
      }
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
      handleCobrar();
    }
  };

  const handleNuevaVenta = () => {
    setDialogTicket(false);
    setVentaCobrada(null);
    focoInput();
  };

  // ─── Paso 1: DNI ───────────────────────────────────────────
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
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
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

  // ─── Paso 2: Fondo inicial ─────────────────────────────────
  if (paso === 'fondo') {
    return (
      <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8 }}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
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
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
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
              disabled={abriendo || !fondoInicial}
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
              onClick={() => { setPaso('dni'); setDni(''); setEmpleado(null); setError(null); }}
              sx={{ mt: 1, color: 'text.secondary' }}
            >
              ← Volver
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // ─── Paso 3: Cobro ─────────────────────────────────────────
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 2, height: '100%' }}>

      {/* Panel izquierdo — productos */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>Productos</Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Cajero: {empleado?.nombre}
              </Typography>
            </Box>
            {loading && <CircularProgress size={18} />}
          </Box>

          {/* Input código */}
          <Box sx={{ position: 'relative', mb: 2 }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              size="small"
              placeholder="Código de barras — Enter para buscar"
              value={codigo}
              onChange={(e) => { setCodigo(e.target.value); setSugerencias([]); setError(null); }}
              onKeyDown={handleKeyDownCodigo}
              disabled={loading || buscando}
              slotProps={{ input: { endAdornment: buscando ? <CircularProgress size={16} /> : null } }}
            />

            {/* Lista navegable */}
            {sugerencias.length > 0 && (
              <Card elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, mt: 0.5, maxHeight: 280, overflow: 'auto' }}>
                <Box sx={{ px: 2, py: 0.75, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    ↑↓ navegar · Enter seleccionar · Esc cancelar
                  </Typography>
                </Box>
                {sugerencias.map((p, i) => (
                  <Box
                    key={p.id}
                    onClick={() => agregarProducto(p)}
                    sx={{
                      px: 2, py: 1.2, cursor: 'pointer',
                      bgcolor: i === indiceSugerencia ? 'action.selected' : 'background.paper',
                      borderBottom: '1px solid', borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{p.nombre}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {p.codigo} · ${p.precioVenta1?.toLocaleString('es-AR')} · Stock: {p.stockActual}
                    </Typography>
                  </Box>
                ))}
              </Card>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
          )}

          {/* Items */}
          {!venta || venta.items.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                Escaneá un producto para comenzar
              </Typography>
            </Box>
          ) : (
            venta.items.map((item) => (
              <Box key={item.id} sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                py: 1.2, borderBottom: '1px solid', borderColor: 'divider',
              }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.nombreProducto}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                    ${item.precioUnitario?.toLocaleString('es-AR')} c/u
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.3 }}>
                    <RemoveIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <Typography variant="body2" sx={{ mx: 1, minWidth: 24, textAlign: 'center' }}>
                    {item.cantidad}
                  </Typography>
                  <IconButton size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.3 }}>
                    <AddIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <Typography variant="body2" sx={{ fontWeight: 500, ml: 1.5, minWidth: 72, textAlign: 'right' }}>
                    ${item.subtotal?.toLocaleString('es-AR')}
                  </Typography>
                  <IconButton size="small" sx={{ ml: 0.5, color: 'text.disabled' }}>
                    <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Box>
            ))
          )}
        </CardContent>
      </Card>

      {/* Panel derecho — cobro */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Totales */}
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 1.5 }}>Resumen</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Subtotal</Typography>
              <Typography variant="body2">${venta?.subtotal?.toLocaleString('es-AR') ?? '0'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>IVA</Typography>
              <Typography variant="body2">${venta?.totalIva?.toLocaleString('es-AR') ?? '0'}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>Total</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                ${total?.toLocaleString('es-AR')}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Medio de pago */}
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', flex: 1 }}>
          <CardContent>
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>Medio de pago</Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1.5 }}>
              F1–F5 para seleccionar
            </Typography>

            <Grid container spacing={1} sx={{ mb: 1.5 }}>
              {MEDIOS.map((m) => (
                <Grid size={{ xs: 6 }} key={m.value}>
                  <Button
                    fullWidth
                    variant={medio === m.value ? 'contained' : 'outlined'}
                    disableElevation
                    onClick={() => {
                      setMedio(m.value);
                      setMontoRecibido('');
                      if (m.value === 'EFECTIVO') setTimeout(() => montoRef.current?.focus(), 50);
                    }}
                    sx={{
                      borderColor: 'divider',
                      color: medio === m.value ? 'primary.contrastText' : 'text.primary',
                      py: 1, fontSize: 12,
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
                  sx={{ mb: 1 }}
                />
                {montoRecibido && Number(montoRecibido) >= total && (
                  <Box sx={{ bgcolor: '#E8F5E9', borderRadius: 2, px: 2, py: 1.2, display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: 'success.dark' }}>Vuelto</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'success.dark' }}>
                      ${vuelto?.toLocaleString('es-AR')}
                    </Typography>
                  </Box>
                )}
                {montoRecibido && Number(montoRecibido) < total && (
                  <Alert severity="warning" sx={{ mb: 1, py: 0.5 }}>
                    Faltan ${(total - Number(montoRecibido)).toLocaleString('es-AR')}
                  </Alert>
                )}
              </>
            )}

            <Button
              fullWidth variant="contained" disableElevation
              disabled={cobrando || loading || !venta || venta.items.length === 0 || !montoValido}
              onClick={handleCobrar}
              sx={{ py: 1.5, fontSize: 15, mt: 0.5 }}
            >
              {cobrando
                ? <CircularProgress size={20} color="inherit" />
                : `Cobrar $${total?.toLocaleString('es-AR')} — Enter ↵`
              }
            </Button>
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.disabled', mt: 1 }}>
              🖨 Se imprimirá el ticket automáticamente
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Dialog ticket */}
      <Dialog open={dialogTicket} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 500, textAlign: 'center' }}>✓ Venta cobrada</DialogTitle>
        <DialogContent>
          {ventaCobrada && (
            <Box id="ticket-print" sx={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8 }}>
              <Typography sx={{ textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}>
                SUPERMERCADO
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: 'text.disabled', fontFamily: 'monospace' }}>
                ================================
              </Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                Venta #{ventaCobrada.id} · {new Date(ventaCobrada.fechaHora).toLocaleString('es-AR')}
              </Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                Cajero: {empleado?.nombre}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', fontFamily: 'monospace', mb: 1 }}>
                Cliente: {ventaCobrada.nombrePersona}
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: 'text.disabled', fontFamily: 'monospace' }}>
                --------------------------------
              </Typography>
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
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: 'text.disabled', fontFamily: 'monospace', mt: 0.5 }}>
                --------------------------------
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>Subtotal</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>${ventaCobrada.subtotal?.toLocaleString('es-AR')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>IVA</Typography>
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
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>Recibido</Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      ${Number(montoRecibidoFinal).toLocaleString('es-AR')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: 'success.main' }}>Vuelto</Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: 'success.main' }}>
                      ${vueltoFinal?.toLocaleString('es-AR')}
                    </Typography>
                  </Box>
                </>
              )}
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: 'text.disabled', fontFamily: 'monospace', mt: 1 }}>
                ================================
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: 'text.disabled', fontFamily: 'monospace' }}>
                ¡Gracias por su compra!
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintOutlinedIcon />}
            onClick={() => window.print()}
            sx={{ borderColor: 'divider', color: 'text.primary' }}
          >
            Imprimir
          </Button>
          <Button
            fullWidth variant="contained" disableElevation
            onClick={handleNuevaVenta}
            sx={{ py: 1.2 }}
            autoFocus
          >
            Nueva venta — Enter ↵
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}