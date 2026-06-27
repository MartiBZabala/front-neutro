import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Grid, Divider, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip,
  IconButton, Tooltip,
} from '@mui/material';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { buscarProductos, agregarItem, cobrarVenta, crearVenta, quitarItem } from '../../api/ventaApi';
import { getComprobantePorVenta, descargarYAbrirPdf } from '../../api/facturacionApi';
import type { ProductoResponse } from '../../types/producto';
import type { VentaResponse } from '../../types/venta';
import type { MedioPago } from '../../types/medioPago';
import type { PersonaResponse } from '../../types/personas';
import { buscarPersonas } from '../../api/personasApi';
import { abrirCaja, miTurnoActual, arquearCaja, confirmarCierre } from '../../api/cajaApi';
import { getCCPorPersona } from '../../api/cuentaCorrienteApi';
import type { CCResponse } from '../../types/cuentaCorriente';
import { descargarCierreCajaPdf } from '../../api/reporteApi';

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
  { value: 'EFECTIVO',         label: 'Efectivo',      key: 'F1' },
  { value: 'TARJETA_DEBITO',   label: 'Débito',        key: 'F2' },
  { value: 'TARJETA_CREDITO',  label: 'Crédito',       key: 'F3' },
  { value: 'TRANSFERENCIA',    label: 'Transferencia', key: 'F4' },
  { value: 'CUENTA_CORRIENTE', label: 'Cta. Cte.',     key: 'F5' },
];

type Paso = 'dni' | 'fondo' | 'abierta';

export default function CajaVentaPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const montoRef = useRef<HTMLInputElement>(null);

  const [paso, setPaso] = useState<Paso>('dni');
  const [dni, setDni] = useState('');
  const [empleado, setEmpleado] = useState<PersonaResponse | null>(null);
  const [buscandoEmpleado, setBuscandoEmpleado] = useState(false);
  const [fondoInicial, setFondoInicial] = useState('');
  const [abriendo, setAbriendo] = useState(false);
  const [cajeroNombre, setCajeroNombre] = useState('');
  const [verificandoTurno, setVerificandoTurno] = useState(true);
  const [turnoActualId, setTurnoActualId] = useState<number | null>(null);

  const [codigo, setCodigo] = useState('');
  const [sugerencias, setSugerencias] = useState<ProductoResponse[]>([]);
  const [indiceSugerencia, setIndiceSugerencia] = useState(0);
  const [buscando, setBuscando] = useState(false);

  const [venta, setVenta] = useState<VentaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [quitando, setQuitando] = useState<number | null>(null); // itemId en proceso
  const [error, setError] = useState<string | null>(null);

  const [medio, setMedio] = useState<MedioPago>('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cobrando, setCobrando] = useState(false);

  // ── Cliente para Factura A ──────────────────────────────────────────────
  const [dialogCliente, setDialogCliente] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<PersonaResponse | null>(null);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [errorCliente, setErrorCliente] = useState<string | null>(null);
  const [resultadosCliente, setResultadosCliente] = useState<PersonaResponse[]>([]);

  // Cuenta corriente
  const [dialogCC, setDialogCC] = useState(false);
  const [busquedaCC, setBusquedaCC] = useState('');
  const [cuentaCorriente, setCuentaCorriente] = useState<CCResponse | null>(null);
  const [buscandoCC, setBuscandoCC] = useState(false);
  const [errorCC, setErrorCC] = useState<string | null>(null);

  // Post-cobro
  const [dialogTicket, setDialogTicket] = useState(false);
  const [ventaCobrada, setVentaCobrada] = useState<VentaResponse | null>(null);
  const [vueltoFinal, setVueltoFinal] = useState(0);
  const [medioFinal, setMedioFinal] = useState<MedioPago>('EFECTIVO');
  const [montoRecibidoFinal, setMontoRecibidoFinal] = useState('');
  const [comprobanteId, setComprobanteId] = useState<number | null>(null);
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  // Cierre de caja
  const [dialogCierre, setDialogCierre] = useState(false);
  const [arqueo, setArqueo] = useState({
    efectivo: '', tarjetaDebito: '', tarjetaCredito: '',
    transferencia: '', cuentaCorriente: '', qr: '',
  });
  const [cerrandoCaja, setCerrandoCaja] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  const total = venta?.total ?? 0;
  const vuelto = medio === 'EFECTIVO' && montoRecibido
    ? Math.max(0, Number(montoRecibido) - total) : 0;
  const montoValido = medio === 'EFECTIVO'
    ? Number(montoRecibido) >= total
    : medio === 'CUENTA_CORRIENTE'
      ? cuentaCorriente !== null && (cuentaCorriente.saldoActual + total) <= (cuentaCorriente.limiteCredito ?? 0)
      : true;

  // Nombre de cajero — puede venir del empleado (apertura nueva) o del turno existente
  const nombreCajero = empleado?.nombre ?? cajeroNombre;

  // La venta emite Factura A si el cliente es Responsable Inscripto
  const esFacturaA = clienteSeleccionado?.condicionIVA === 'RESPONSABLE_INSCRIPTO';

  const focoInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (paso === 'abierta') focoInput();
  }, [paso, focoInput]);

  // Al montar: verificar si ya hay un turno abierto para este usuario
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const res = await miTurnoActual();
        const turno = res.data.data;
        if (activo && turno) {
          setCajeroNombre(turno.nombreUsuario);
          setTurnoActualId(turno.id);
          setPaso('abierta');
        }
      } catch {
        // sin turno previo → flujo normal de apertura
      } finally {
        if (activo) setVerificandoTurno(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  // Atajos de teclado F1–F5 para medio de pago
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (paso !== 'abierta') return;
      const m = MEDIOS.find(m => m.key === e.key);
      if (m) {
        e.preventDefault();
        setMedio(m.value);
        setMontoRecibido('');
        if (m.value === 'CUENTA_CORRIENTE') {
          setCuentaCorriente(null);
          setBusquedaCC('');
          setErrorCC(null);
          setDialogCC(true);
        }
        if (m.value === 'EFECTIVO') setTimeout(() => montoRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paso]);

  // ── Apertura de caja ────────────────────────────────────────────────────

  const buscarEmpleado = async () => {
    if (!dni.trim()) return;
    setBuscandoEmpleado(true);
    setError(null);
    try {
      const res = await buscarPersonas(dni);
      const emp = res.data.data.content.find(p => p.esEmpleado && p.dni === dni);
      if (emp) { setEmpleado(emp); setPaso('fondo'); }
      else { setError('No se encontró un empleado con ese DNI'); }
    } catch { setError('Error al identificar empleado'); }
    finally { setBuscandoEmpleado(false); }
  };

  const handleAbrirCaja = async () => {
    setAbriendo(true);
    setError(null);
    try {
      const res = await abrirCaja(Number(fondoInicial));
      setTurnoActualId(res.data.data.id);
      setPaso('abierta');
    } catch { setError('Error al abrir caja. Verificá que no haya un turno ya abierto.'); }
    finally { setAbriendo(false); }
  };

  // ── Cierre de caja ──────────────────────────────────────────────────────

  const handleCerrarCaja = async () => {
    if (!turnoActualId) return;
    setCerrandoCaja(true);
    setErrorCierre(null);
    try {
      const req = {
        efectivo:        Number(arqueo.efectivo)        || 0,
        tarjetaDebito:   Number(arqueo.tarjetaDebito)   || 0,
        tarjetaCredito:  Number(arqueo.tarjetaCredito)  || 0,
        transferencia:   Number(arqueo.transferencia)   || 0,
        cuentaCorriente: Number(arqueo.cuentaCorriente) || 0,
        qr:              Number(arqueo.qr)              || 0,
      };
      await arquearCaja(turnoActualId, req);
      const res = await confirmarCierre(turnoActualId);
      await descargarCierreCajaPdf(res.data.data.id);

      // Reset completo
      setDialogCierre(false);
      setTurnoActualId(null);
      setArqueo({ efectivo: '', tarjetaDebito: '', tarjetaCredito: '', transferencia: '', cuentaCorriente: '', qr: '' });
      setPaso('dni');
      setDni('');
      setEmpleado(null);
      setCajeroNombre('');
      setVenta(null);
      setClienteSeleccionado(null);
    } catch { setErrorCierre('Error al cerrar la caja. Intentá de nuevo.'); }
    finally { setCerrandoCaja(false); }
  };

  // ── Búsqueda de cliente para Factura A ─────────────────────────────────

  const buscarCliente = async () => {
    if (!busquedaCliente.trim()) return;
    setBuscandoCliente(true);
    setErrorCliente(null);
    setResultadosCliente([]);
    try {
      const res = await buscarPersonas(busquedaCliente);
      const clientes = res.data.data.content.filter(p => p.esCliente);
      if (clientes.length === 0) {
        setErrorCliente('No se encontró ningún cliente con ese dato. Registralo desde Administración → Personas.');
      } else {
        setResultadosCliente(clientes);
      }
    } catch { setErrorCliente('Error al buscar cliente'); }
    finally { setBuscandoCliente(false); }
  };

  const confirmarCliente = (persona: PersonaResponse) => {
    setClienteSeleccionado(persona);
    setDialogCliente(false);
    setBusquedaCliente('');
    setResultadosCliente([]);
    setErrorCliente(null);
  };

  const quitarCliente = () => {
    setClienteSeleccionado(null);
    // Si hay venta en curso con cliente asignado, no la podemos desasociar
    // (el back no tiene ese endpoint), pero sí limpiamos el estado local
    // para que la próxima venta sea sin cliente
  };

  // ── Cuenta corriente ────────────────────────────────────────────────────

  const buscarCC = async () => {
    if (!busquedaCC.trim()) return;
    setBuscandoCC(true);
    setErrorCC(null);
    setCuentaCorriente(null);
    try {
      const res = await buscarPersonas(busquedaCC);
      const persona = res.data.data.content.find(
        p => p.tieneCuentaCorriente && (p.cuit === busquedaCC || p.dni === busquedaCC)
      );
      if (!persona) { setErrorCC('No se encontró cliente con cuenta corriente'); return; }
      const ccRes = await getCCPorPersona(persona.id);
      setCuentaCorriente(ccRes.data.data);
    } catch { setErrorCC('Error al buscar cuenta corriente'); }
    finally { setBuscandoCC(false); }
  };

  // ── Productos ───────────────────────────────────────────────────────────

  const agregarProducto = useCallback(async (producto: ProductoResponse, cantidad = 1) => {
    setSugerencias([]);
    setCodigo('');
    setLoading(true);
    setError(null);
    try {
      let ventaId = venta?.id;
      if (!ventaId) {
        // Crear la venta con el cliente seleccionado (si hay)
        const res = await crearVenta(clienteSeleccionado?.id);
        ventaId = res.data.data.id;
      }
      const res = await agregarItem(ventaId, { productoId: producto.id, cantidad });
      setVenta(res.data.data);
    } catch { setError('Producto no encontrado o sin stock'); }
    finally { setLoading(false); focoInput(); }
  }, [venta, clienteSeleccionado, focoInput]);

  const handleQuitarItem = async (itemId: number) => {
    if (!venta) return;
    setQuitando(itemId);
    setError(null);
    try {
      const res = await quitarItem(venta.id, itemId);
      // Si quedó sin ítems, la venta queda vacía pero existe — la reseteamos
      const ventaActualizada = res.data.data;
      setVenta(ventaActualizada.items.length > 0 ? ventaActualizada : null);
    } catch { setError('Error al quitar el producto'); }
    finally { setQuitando(null); focoInput(); }
  };

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
      if (resultados.length === 1) { await agregarProducto(resultados[0], cantidadSolicitada); }
      else if (resultados.length > 1) { setSugerencias(resultados); setIndiceSugerencia(0); }
      else { setError(`No se encontró producto con código "${codigoBusqueda}"`); focoInput(); }
    } finally { setBuscando(false); }
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

  // ── Cobro ───────────────────────────────────────────────────────────────

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
      try {
        const compRes = await getComprobantePorVenta(venta.id);
        setComprobanteId(compRes.data.data.estado === 'AUTORIZADO' ? compRes.data.data.id : null);
      } catch { setComprobanteId(null); }
      setDialogTicket(true);
      setVenta(null);
      setMontoRecibido('');
      setMedio('EFECTIVO');
      setCuentaCorriente(null);
      setBusquedaCC('');
      // Mantener cliente seleccionado para siguiente venta del mismo cliente
    } catch { setError('Error al cobrar'); }
    finally { setCobrando(false); }
  };

  const handleMontoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && montoValido && venta && venta.items.length > 0) {
      void handleCobrar();
    }
  };

  const handleNuevaVenta = () => {
    setDialogTicket(false);
    setVentaCobrada(null);
    setComprobanteId(null);
    focoInput();
  };

  const handleDescargarFactura = async () => {
    if (!comprobanteId) return;
    setDescargandoPdf(true);
    try { await descargarYAbrirPdf(comprobanteId); }
    catch { setError('Error al descargar la factura PDF'); }
    finally { setDescargandoPdf(false); }
  };

  // ── Pantalla de carga inicial ───────────────────────────────────────────

  if (verificandoTurno) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Box>
    );
  }

  // ── Paso: identificación del cajero ────────────────────────────────────

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
                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#2C2C2A' }}>Identificación del cajero</Typography>
              </Box>
              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}
              <TextField label="DNI" type="number" fullWidth size="small" value={dni}
                onChange={(e) => setDni(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void buscarEmpleado()}
                autoFocus sx={{ mb: 2, ...fieldSx }} />
              <Button fullWidth variant="contained" disableElevation disabled={buscandoEmpleado || !dni.trim()}
                onClick={() => void buscarEmpleado()}
                sx={{ py: 1.3, borderRadius: 2, bgcolor: ACCENT, fontWeight: 600, '&:hover': { bgcolor: '#2E4A7A' } }}>
                {buscandoEmpleado ? <CircularProgress size={20} color="inherit" /> : 'Continuar — Enter ↵'}
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }

  // ── Paso: fondo inicial ─────────────────────────────────────────────────

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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, p: 1.5, bgcolor: ACCENT_BG, borderRadius: 2 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{empleado?.nombre?.[0] ?? '?'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#2C2C2A' }}>{empleado?.nombre}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#888780' }}>DNI {empleado?.dni}</Typography>
                </Box>
              </Box>
              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}
              <TextField label="Fondo inicial ($)" type="number" fullWidth size="small" value={fondoInicial}
                onChange={(e) => setFondoInicial(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fondoInicial && void handleAbrirCaja()}
                autoFocus sx={{ mb: 2, ...fieldSx }} />
              <Button fullWidth variant="contained" disableElevation disabled={abriendo || !fondoInicial}
                onClick={() => void handleAbrirCaja()}
                sx={{ py: 1.3, borderRadius: 2, bgcolor: ACCENT, fontWeight: 600, '&:hover': { bgcolor: '#2E4A7A' } }}>
                {abriendo ? <CircularProgress size={20} color="inherit" /> : 'Abrir turno — Enter ↵'}
              </Button>
              <Button fullWidth onClick={() => { setPaso('dni'); setDni(''); setEmpleado(null); setError(null); }}
                sx={{ mt: 1, color: '#888780', borderRadius: 2 }}>← Volver</Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }

  // ── Paso: caja abierta ──────────────────────────────────────────────────

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 2, height: '100%' }}>

      {/* Panel izquierdo — productos */}
      <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1, p: 2.5 }}>

          {/* Header del panel */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A' }}>Productos</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#888780', mt: 0.25 }}>
                Cajero: <strong style={{ color: ACCENT }}>{nombreCajero}</strong>
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
              <Button variant="outlined" size="small" startIcon={<LockOutlinedIcon sx={{ fontSize: 15 }} />}
                onClick={() => setDialogCierre(true)}
                sx={{
                  borderColor: '#E3E1DB', borderRadius: 2, color: '#888780',
                  fontSize: '0.78rem', fontWeight: 600, textTransform: 'none',
                  '&:hover': { borderColor: '#C62828', color: '#C62828', bgcolor: '#FFEBEE' },
                }}>
                Cerrar caja
              </Button>
            </Box>
          </Box>

          {/* Buscador de productos */}
          <Box sx={{ position: 'relative', mb: 2 }}>
            <TextField inputRef={inputRef} fullWidth size="small"
              placeholder="Código de barras o nombre — Enter para buscar"
              value={codigo}
              onChange={(e) => { setCodigo(e.target.value); setSugerencias([]); setError(null); }}
              onKeyDown={handleKeyDownCodigo} disabled={loading || buscando} sx={fieldSx}
              slotProps={{
                input: {
                  startAdornment: <SearchOutlinedIcon sx={{ fontSize: 18, color: '#B4B2A9', mr: 0.5 }} />,
                  endAdornment: buscando ? <CircularProgress size={16} sx={{ color: ACCENT }} /> : null,
                },
              }} />
            {sugerencias.length > 0 && (
              <Card elevation={4} sx={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, mt: 0.5, maxHeight: 280, overflow: 'auto', borderRadius: 2 }}>
                <Box sx={{ px: 2, py: 0.75, bgcolor: '#F4F3F1', borderBottom: '1px solid #F0EEE8' }}>
                  <Typography sx={{ fontSize: '0.75rem', color: '#B4B2A9' }}>↑↓ navegar · Enter seleccionar · Esc cancelar</Typography>
                </Box>
                {sugerencias.map((p, i) => (
                  <Box key={p.id} onClick={() => void agregarProducto(p)} sx={{
                    px: 2, py: 1.2, cursor: 'pointer',
                    bgcolor: i === indiceSugerencia ? ACCENT_BG : '#fff',
                    borderBottom: '1px solid #F0EEE8', '&:last-child': { borderBottom: 'none' },
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

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

          {/* Lista de ítems */}
          {!venta || venta.items.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 1 }}>
              <SearchOutlinedIcon sx={{ fontSize: 36, color: '#D3D1C7' }} />
              <Typography sx={{ fontSize: '0.9rem', color: '#B4B2A9' }}>Escaneá un producto para comenzar</Typography>
            </Box>
          ) : venta.items.map((item) => (
            <Box key={item.id} sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              py: 1, px: 0.5, borderBottom: '1px solid #F0EEE8',
              '&:hover': { bgcolor: '#FAFAF9' },
              '&:hover .quitar-btn': { opacity: 1 },
            }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#2C2C2A' }} noWrap>
                  {item.nombreProducto}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#B4B2A9' }}>
                  {item.cantidad} × ${item.precioUnitario?.toLocaleString('es-AR')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#2C2C2A', minWidth: 72, textAlign: 'right' }}>
                  ${item.subtotal?.toLocaleString('es-AR')}
                </Typography>
                <Tooltip title="Quitar producto">
                  <span>
                    <IconButton
                      className="quitar-btn"
                      size="small"
                      disabled={quitando === item.id}
                      onClick={() => void handleQuitarItem(item.id)}
                      sx={{
                        opacity: 0, transition: 'opacity 0.15s',
                        color: '#C62828',
                        '&:hover': { bgcolor: '#FFEBEE' },
                        '&.Mui-disabled': { opacity: 0.4 },
                      }}>
                      {quitando === item.id
                        ? <CircularProgress size={14} color="inherit" />
                        : <RemoveCircleOutlineIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Panel derecho — cobro */}
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
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: ACCENT }}>${total?.toLocaleString('es-AR')}</Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Cobro */}
        <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, flex: 1 }}>
          <CardContent sx={{ p: 2.5 }}>

            {/* Selector de cliente para Factura A */}
            <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid #F0EEE8' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: '#2C2C2A' }}>Cliente</Typography>
                {!clienteSeleccionado && (
                  <Button size="small" startIcon={<PersonSearchOutlinedIcon sx={{ fontSize: 14 }} />}
                    onClick={() => setDialogCliente(true)}
                    sx={{ fontSize: '0.75rem', color: ACCENT, textTransform: 'none', fontWeight: 500 }}>
                    Buscar cliente
                  </Button>
                )}
              </Box>

              {clienteSeleccionado ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.25, bgcolor: esFacturaA ? '#F3E5F5' : ACCENT_BG, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonOutlinedIcon sx={{ fontSize: 16, color: esFacturaA ? '#6A1B9A' : ACCENT }} />
                    <Box>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#2C2C2A' }}>
                        {clienteSeleccionado.razonSocial ?? clienteSeleccionado.nombre}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#888780' }}>
                        {esFacturaA ? '🧾 Factura A' : 'Factura B'} · {clienteSeleccionado.condicionIVA.replace(/_/g, ' ')}
                      </Typography>
                    </Box>
                  </Box>
                  <Button size="small" onClick={quitarCliente}
                    sx={{ fontSize: '0.72rem', color: '#888780', textTransform: 'none', minWidth: 0 }}>
                    Quitar
                  </Button>
                </Box>
              ) : (
                <Typography sx={{ fontSize: '0.78rem', color: '#B4B2A9' }}>
                  Sin cliente — se emitirá Factura B (Consumidor Final)
                </Typography>
              )}
            </Box>

            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A', mb: 0.5 }}>Medio de pago</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: '#B4B2A9', mb: 1.5 }}>F1–F5 para seleccionar</Typography>

            <Grid container spacing={1} sx={{ mb: 1.5 }}>
              {MEDIOS.map((m) => (
                <Grid size={{ xs: 6 }} key={m.value}>
                  <Button fullWidth variant={medio === m.value ? 'contained' : 'outlined'} disableElevation
                    onClick={() => {
                      setMedio(m.value);
                      setMontoRecibido('');
                      if (m.value === 'CUENTA_CORRIENTE') {
                        setCuentaCorriente(null); setBusquedaCC(''); setErrorCC(null); setDialogCC(true);
                      }
                      if (m.value === 'EFECTIVO') setTimeout(() => montoRef.current?.focus(), 50);
                    }}
                    sx={{
                      borderRadius: 2, py: 1, fontSize: '0.8rem',
                      borderColor: medio === m.value ? ACCENT : '#E3E1DB',
                      bgcolor: medio === m.value ? ACCENT : '#FAFAF9',
                      color: medio === m.value ? '#fff' : '#3C3B38',
                      fontWeight: medio === m.value ? 600 : 400,
                      '&:hover': { bgcolor: medio === m.value ? '#2E4A7A' : ACCENT_BG, borderColor: ACCENT, color: medio === m.value ? '#fff' : ACCENT },
                    }}>
                    {m.label}
                  </Button>
                </Grid>
              ))}
            </Grid>

            {/* Efectivo */}
            {medio === 'EFECTIVO' && (
              <>
                <TextField inputRef={montoRef} fullWidth size="small" label="Monto recibido" type="number"
                  value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)}
                  onKeyDown={handleMontoKeyDown} sx={{ mb: 1.5, ...fieldSx }} />
                {montoRecibido && Number(montoRecibido) >= total && (
                  <Box sx={{ bgcolor: '#E8F5E9', borderRadius: 2, px: 2, py: 1.2, display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography sx={{ fontSize: '0.85rem', color: '#2E7D32' }}>Vuelto</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2E7D32' }}>${vuelto?.toLocaleString('es-AR')}</Typography>
                  </Box>
                )}
                {montoRecibido && Number(montoRecibido) < total && (
                  <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2, py: 0.5 }}>
                    Faltan ${(total - Number(montoRecibido)).toLocaleString('es-AR')}
                  </Alert>
                )}
              </>
            )}

            {/* Cuenta corriente seleccionada */}
            {medio === 'CUENTA_CORRIENTE' && cuentaCorriente && (
              <Box sx={{ mb: 1.5, p: 1.5, bgcolor: ACCENT_BG, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#2C2C2A' }}>
                    {cuentaCorriente.nombrePersona}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#888780' }}>
                    Disponible: ${Math.max(0, (cuentaCorriente.limiteCredito ?? 0) - cuentaCorriente.saldoActual).toLocaleString('es-AR')}
                  </Typography>
                </Box>
                <Button size="small" onClick={() => { setCuentaCorriente(null); setBusquedaCC(''); setErrorCC(null); setDialogCC(true); }}
                  sx={{ fontSize: '0.75rem', color: ACCENT, textTransform: 'none' }}>
                  Cambiar
                </Button>
              </Box>
            )}
            {medio === 'CUENTA_CORRIENTE' && !cuentaCorriente && (
              <Box sx={{ mb: 1.5, p: 1.5, border: '1px dashed #E3E1DB', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onClick={() => setDialogCC(true)}>
                <Typography sx={{ fontSize: '0.85rem', color: '#B4B2A9' }}>Seleccioná un cliente</Typography>
              </Box>
            )}

            {/* Botón cobrar */}
            <Button fullWidth variant="contained" disableElevation
              disabled={cobrando || loading || !venta || venta.items.length === 0 || !montoValido}
              onClick={() => void handleCobrar()}
              sx={{ py: 1.5, borderRadius: 2, fontSize: '1rem', fontWeight: 700, bgcolor: ACCENT, '&:hover': { bgcolor: '#2E4A7A' }, '&.Mui-disabled': { bgcolor: '#E3E1DB', color: '#B4B2A9' } }}>
              {cobrando ? <CircularProgress size={20} color="inherit" /> : `Cobrar $${total?.toLocaleString('es-AR')} — Enter ↵`}
            </Button>

          </CardContent>
        </Card>
      </Box>

      {/* Dialog — Cierre de caja */}
      <Dialog open={dialogCierre} onClose={() => !cerrandoCaja && setDialogCierre(false)}
        maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockOutlinedIcon sx={{ fontSize: 20, color: '#C62828' }} />
            Cierre de caja — Turno #{turnoActualId}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.85rem', color: '#888780', mb: 2 }}>
            Ingresá los montos contados físicamente en caja. Se comparará con lo registrado en el sistema.
          </Typography>
          {errorCierre && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{errorCierre}</Alert>}
          <Grid container spacing={2}>
            {[
              { key: 'efectivo',        label: 'Efectivo en caja ($)' },
              { key: 'tarjetaDebito',   label: 'Tarjeta débito ($)' },
              { key: 'tarjetaCredito',  label: 'Tarjeta crédito ($)' },
              { key: 'transferencia',   label: 'Transferencias ($)' },
              { key: 'cuentaCorriente', label: 'Cuenta corriente ($)' },
              { key: 'qr',              label: 'QR / Billetera digital ($)' },
            ].map((f) => (
              <Grid size={{ xs: 12, sm: 6 }} key={f.key}>
                <TextField fullWidth size="small" label={f.label} type="number"
                  value={arqueo[f.key as keyof typeof arqueo]}
                  onChange={(e) => setArqueo(a => ({ ...a, [f.key]: e.target.value }))}
                  sx={fieldSx} />
              </Grid>
            ))}
          </Grid>
          {Object.values(arqueo).some(v => v !== '') && (() => {
            const totalContado = Object.values(arqueo).reduce((acc, v) => acc + (Number(v) || 0), 0);
            return (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: '#F4F3F1', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.85rem', color: '#888780' }}>Total contado</Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#2C2C2A' }}>
                    ${totalContado.toLocaleString('es-AR')}
                  </Typography>
                </Box>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogCierre(false)} disabled={cerrandoCaja}
            sx={{ color: '#888780', borderRadius: 2 }}>Cancelar</Button>
          <Button variant="contained" disableElevation onClick={() => void handleCerrarCaja()}
            disabled={cerrandoCaja}
            sx={{ bgcolor: '#C62828', borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#B71C1C' } }}>
            {cerrandoCaja
              ? <><CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />Cerrando...</>
              : 'Cerrar caja y generar PDF'
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Buscar cliente (Factura A) */}
      <Dialog open={dialogCliente} onClose={() => { setDialogCliente(false); setBusquedaCliente(''); setResultadosCliente([]); setErrorCliente(null); }}
        maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonSearchOutlinedIcon sx={{ fontSize: 20, color: ACCENT }} />
            Buscar cliente
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.82rem', color: '#888780', mb: 1.5 }}>
            Para emitir Factura A el cliente debe ser Responsable Inscripto y estar registrado en el sistema.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <TextField fullWidth size="small" placeholder="Nombre, CUIT o DNI" autoFocus
              value={busquedaCliente}
              onChange={(e) => { setBusquedaCliente(e.target.value); setResultadosCliente([]); setErrorCliente(null); }}
              onKeyDown={(e) => e.key === 'Enter' && void buscarCliente()}
              sx={fieldSx} />
            <Button variant="outlined" disableElevation onClick={() => void buscarCliente()} disabled={buscandoCliente}
              sx={{ borderColor: '#E3E1DB', borderRadius: 2, color: '#3C3B38', px: 2, minWidth: 80,
                '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG } }}>
              {buscandoCliente ? <CircularProgress size={16} /> : 'Buscar'}
            </Button>
          </Box>
          {errorCliente && <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2, fontSize: '0.82rem' }}>{errorCliente}</Alert>}
          {resultadosCliente.length > 0 && (
            <Box sx={{ border: '1px solid #E3E1DB', borderRadius: 2, overflow: 'hidden' }}>
              {resultadosCliente.map((p, i) => (
                <Box key={p.id}
                  onClick={() => confirmarCliente(p)}
                  sx={{
                    p: 1.5, cursor: 'pointer',
                    borderBottom: i < resultadosCliente.length - 1 ? '1px solid #F0EEE8' : 'none',
                    '&:hover': { bgcolor: ACCENT_BG },
                  }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: '#2C2C2A' }}>
                        {p.razonSocial ?? p.nombre}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#888780' }}>
                        {p.cuit ? `CUIT ${p.cuit}` : p.dni ? `DNI ${p.dni}` : ''}
                      </Typography>
                    </Box>
                    <Chip
                      label={p.condicionIVA === 'RESPONSABLE_INSCRIPTO' ? 'RI' : p.condicionIVA.replace(/_/g, ' ')}
                      size="small"
                      sx={{
                        fontSize: '0.7rem', height: 20, borderRadius: 1,
                        bgcolor: p.condicionIVA === 'RESPONSABLE_INSCRIPTO' ? '#F3E5F5' : '#F4F3F1',
                        color: p.condicionIVA === 'RESPONSABLE_INSCRIPTO' ? '#6A1B9A' : '#888780',
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => { setDialogCliente(false); setBusquedaCliente(''); setResultadosCliente([]); setErrorCliente(null); }}
            sx={{ color: '#888780', borderRadius: 2 }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Cuenta corriente */}
      <Dialog open={dialogCC} onClose={() => { setDialogCC(false); if (!cuentaCorriente) setMedio('EFECTIVO'); }}
        maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>Cuenta corriente</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <TextField fullWidth size="small" placeholder="CUIT o DNI del cliente" autoFocus
              value={busquedaCC}
              onChange={(e) => { setBusquedaCC(e.target.value); setCuentaCorriente(null); setErrorCC(null); }}
              onKeyDown={(e) => e.key === 'Enter' && void buscarCC()}
              sx={fieldSx} />
            <Button variant="outlined" disableElevation onClick={() => void buscarCC()} disabled={buscandoCC}
              sx={{ borderColor: '#E3E1DB', borderRadius: 2, color: '#3C3B38', px: 2, minWidth: 80,
                '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG } }}>
              {buscandoCC ? <CircularProgress size={16} /> : 'Buscar'}
            </Button>
          </Box>
          {errorCC && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>{errorCC}</Alert>}
          {cuentaCorriente && (
            <Box sx={{ border: '1px solid #E3E1DB', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ p: 1.5, bgcolor: ACCENT_BG }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#2C2C2A' }}>
                  {cuentaCorriente.nombrePersona}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {[
                  { label: 'Saldo actual', valor: `$${cuentaCorriente.saldoActual.toLocaleString('es-AR')}`, alerta: cuentaCorriente.saldoActual >= (cuentaCorriente.limiteCredito ?? 0) },
                  { label: 'Límite', valor: `$${(cuentaCorriente.limiteCredito ?? 0).toLocaleString('es-AR')}`, alerta: false },
                  { label: 'Disponible', valor: `$${Math.max(0, (cuentaCorriente.limiteCredito ?? 0) - cuentaCorriente.saldoActual).toLocaleString('es-AR')}`, alerta: ((cuentaCorriente.limiteCredito ?? 0) - cuentaCorriente.saldoActual) <= 0 },
                ].map(({ label, valor, alerta }) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '0.82rem', color: '#888780' }}>{label}</Typography>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: alerta ? '#C62828' : '#2C2C2A' }}>{valor}</Typography>
                  </Box>
                ))}
                {cuentaCorriente.saldoActual + total > (cuentaCorriente.limiteCredito ?? 0) && (
                  <Alert severity="error" sx={{ mt: 0.5, borderRadius: 2, py: 0.5, fontSize: '0.78rem' }}>
                    Límite insuficiente para esta compra de ${total.toLocaleString('es-AR')}
                  </Alert>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => { setDialogCC(false); if (!cuentaCorriente) setMedio('EFECTIVO'); }}
            sx={{ color: '#888780', borderRadius: 2 }}>Cancelar</Button>
          <Button fullWidth variant="contained" disableElevation
            disabled={!cuentaCorriente || cuentaCorriente.saldoActual + total > (cuentaCorriente.limiteCredito ?? 0)}
            onClick={() => setDialogCC(false)}
            sx={{ py: 1.2, borderRadius: 2, bgcolor: ACCENT, fontWeight: 600, '&:hover': { bgcolor: '#2E4A7A' }, '&.Mui-disabled': { bgcolor: '#E3E1DB', color: '#B4B2A9' } }}>
            Confirmar — Enter ↵
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Venta cobrada */}
      <Dialog open={dialogTicket} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        {/* CSS para ocultar todo excepto el ticket al imprimir */}
        <style>{`
          @media print {
            body > * { display: none !important; }
            .ticket-print-area { display: block !important; }
          }
        `}</style>

        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', textAlign: 'center', pb: 1 }}>
          ✓ Venta cobrada
        </DialogTitle>
        <DialogContent>
          {ventaCobrada && (
            <Box className="ticket-print-area" sx={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8 }}>
              <Typography sx={{ textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}>COMPROBANTE</Typography>
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: '#B4B2A9', fontFamily: 'monospace' }}>================================</Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                Venta #{ventaCobrada.id} · {new Date(ventaCobrada.fechaHora).toLocaleString('es-AR')}
              </Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'monospace' }}>Cajero: {nombreCajero}</Typography>
              <Typography sx={{ fontSize: 11, color: '#B4B2A9', fontFamily: 'monospace', mb: 1 }}>
                Cliente: {ventaCobrada.nombrePersona ?? 'Consumidor Final'}
              </Typography>
              <Typography sx={{ textAlign: 'center', fontSize: 11, color: '#B4B2A9', fontFamily: 'monospace' }}>--------------------------------</Typography>
              {ventaCobrada.items.map((item) => (
                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 12, fontFamily: 'monospace', flex: 1 }} noWrap>{item.cantidad}x {item.nombreProducto}</Typography>
                  <Typography sx={{ fontSize: 12, fontFamily: 'monospace', ml: 1 }}>${item.subtotal?.toLocaleString('es-AR')}</Typography>
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
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15 }}>${ventaCobrada.total?.toLocaleString('es-AR')}</Typography>
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

        {/* Botones: fila superior con acciones secundarias, fila inferior con Nueva venta */}
        <Box sx={{ px: 3, pb: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<PrintOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => window.print()}
              sx={{ flex: 1, borderColor: '#E3E1DB', borderRadius: 2, color: '#5F5E5A', fontSize: '0.82rem',
                '&:hover': { borderColor: '#888780', bgcolor: '#F4F3F1' } }}>
              Imprimir
            </Button>
            {comprobanteId && (
              <Button
                variant="outlined"
                startIcon={descargandoPdf ? <CircularProgress size={14} /> : <PictureAsPdfOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={() => void handleDescargarFactura()}
                disabled={descargandoPdf}
                sx={{ flex: 1, borderColor: ACCENT, color: ACCENT, borderRadius: 2, fontSize: '0.82rem', fontWeight: 600,
                  '&:hover': { bgcolor: ACCENT_BG }, '&.Mui-disabled': { borderColor: '#E3E1DB', color: '#B4B2A9' } }}>
                Factura PDF
              </Button>
            )}
          </Box>
          <Button fullWidth variant="contained" disableElevation onClick={handleNuevaVenta} autoFocus
            sx={{ py: 1.3, borderRadius: 2, bgcolor: ACCENT, fontWeight: 700, fontSize: '0.95rem', '&:hover': { bgcolor: '#2E4A7A' } }}>
            Nueva venta — Enter ↵
          </Button>
        </Box>
      </Dialog>

    </Box>
  );
}
