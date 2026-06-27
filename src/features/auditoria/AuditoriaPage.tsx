import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box, Card, Typography, Grid, Alert, CircularProgress,
  TextField, MenuItem, Select, FormControl, InputLabel,
  Button, Chip, Table, TableHead, TableRow, TableCell, TableBody,
  TablePagination, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip,
} from '@mui/material';
import SearchOutlinedIcon        from '@mui/icons-material/SearchOutlined';
import ShieldOutlinedIcon        from '@mui/icons-material/ShieldOutlined';
import FilterAltOutlinedIcon     from '@mui/icons-material/FilterAltOutlined';
import HistoryOutlinedIcon       from '@mui/icons-material/HistoryOutlined';
import CancelOutlinedIcon        from '@mui/icons-material/CancelOutlined';
import TuneOutlinedIcon          from '@mui/icons-material/TuneOutlined';
import PersonOffOutlinedIcon     from '@mui/icons-material/PersonOffOutlined';
import WarningAmberOutlinedIcon  from '@mui/icons-material/WarningAmberOutlined';
import PersonOutlinedIcon        from '@mui/icons-material/PersonOutlined';
import FileDownloadOutlinedIcon  from '@mui/icons-material/FileDownloadOutlined';
import OpenInFullOutlinedIcon    from '@mui/icons-material/OpenInFullOutlined';
import CloseIcon                 from '@mui/icons-material/Close';
import {
  listarAuditoria, obtenerMetricas, descargarCsvAuditoria,
  type AuditoriaResponse, type AuditoriaFiltros,
} from '../../api/auditoriaApi';

// ── Constantes de estilo ───────────────────────────────────────────────────

const ACCENT    = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

const ACCION_STYLE: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  ANULAR_VENTA:           { color: '#C62828', bg: '#FFEBEE', icon: <CancelOutlinedIcon sx={{ fontSize: 13 }} /> },
  AJUSTE_STOCK:           { color: ACCENT,    bg: ACCENT_BG, icon: <TuneOutlinedIcon sx={{ fontSize: 13 }} /> },
  BAJA_PRODUCTO:          { color: '#C62828', bg: '#FFEBEE', icon: <CancelOutlinedIcon sx={{ fontSize: 13 }} /> },
  CREAR_EMPLEADO:         { color: '#2E7D32', bg: '#E8F5E9', icon: <PersonOutlinedIcon sx={{ fontSize: 13 }} /> },
  BAJA_EMPLEADO:          { color: '#E65100', bg: '#FFF3E0', icon: <PersonOffOutlinedIcon sx={{ fontSize: 13 }} /> },
  FIJAR_LIMITE_CC:        { color: '#6A1B9A', bg: '#F3E5F5', icon: <TuneOutlinedIcon sx={{ fontSize: 13 }} /> },
  LIQUIDAR_CC_EMPLEADO:   { color: '#6A1B9A', bg: '#F3E5F5', icon: <HistoryOutlinedIcon sx={{ fontSize: 13 }} /> },
  AJUSTE_CC:              { color: '#E65100', bg: '#FFF3E0', icon: <TuneOutlinedIcon sx={{ fontSize: 13 }} /> },
  REINTENTAR_COMPROBANTE: { color: '#C62828', bg: '#FFEBEE', icon: <WarningAmberOutlinedIcon sx={{ fontSize: 13 }} /> },
};

const ACCION_FALLBACK = { color: '#888780', bg: '#F5F5F5', icon: <HistoryOutlinedIcon sx={{ fontSize: 13 }} /> };

const TABLA_LABEL: Record<string, string> = {
  ventas: 'Ventas', productos: 'Productos',
  personas: 'Personas', cuentas_corrientes: 'Cta. Corriente', comprobantes: 'Facturación',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2, bgcolor: '#FAFAF9',
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1 },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────

const formatFecha = (f: string) =>
  new Date(f).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

/** Intenta parsear el JSON guardado por el nuevo AuditAspect y formatearlo con indent */
const prettyJson = (raw: string | null): string => {
  if (!raw) return '—';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

/** Resumen de una línea para mostrar en la tabla (sin truncado arbitrario) */
const resumenDetalle = (e: AuditoriaResponse): { texto: string; esError: boolean } => {
  const esError = !e.datosNuevos && !e.datosAnteriores && !!e.error;
  const raw = e.datosNuevos ?? e.datosAnteriores ?? e.error ?? '';
  if (!raw) return { texto: '—', esError };

  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const partes: string[] = [];
    if (obj['nombre'])   partes.push(String(obj['nombre']));
    if (obj['codigo'])   partes.push(`Cód: ${obj['codigo']}`);
    if (obj['id'])       partes.push(`#${obj['id']}`);
    if (obj['monto'])    partes.push(`$${obj['monto']}`);
    if (obj['legajo'])   partes.push(`Legajo: ${obj['legajo']}`);
    if (obj['motivo'])   partes.push(`Motivo: ${obj['motivo']}`);
    if (partes.length > 0) return { texto: partes.join(' · '), esError };
    // JSON pero sin campos conocidos → primera clave disponible
    const primera = Object.entries(obj)[0];
    if (primera) return { texto: `${primera[0]}: ${primera[1]}`, esError };
  } catch { /* no era JSON — texto plano del AuditAspect viejo */ }

  return {
    texto: raw.length > 90 ? raw.slice(0, 90) + '…' : raw,
    esError,
  };
};

// ── Componente modal de detalle ────────────────────────────────────────────

function DetalleModal({ evento, onClose }: { evento: AuditoriaResponse | null; onClose: () => void }) {
  if (!evento) return null;
  const style = ACCION_STYLE[evento.accion] ?? ACCION_FALLBACK;

  return (
    <Dialog open={!!evento} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<Box sx={{ color: `${style.color} !important`, display: 'flex', pl: 0.5 }}>{style.icon}</Box>}
            label={evento.accion.replace(/_/g, ' ')}
            size="small"
            sx={{ bgcolor: style.bg, color: style.color, fontWeight: 700, fontSize: '0.75rem', borderRadius: 1.5 }}
          />
          <Typography sx={{ fontSize: '0.85rem', color: '#888780' }}>
            #{evento.id}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Metadata */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          {[
            { label: 'Fecha',    valor: formatFecha(evento.fecha) },
            { label: 'Módulo',   valor: TABLA_LABEL[evento.tabla ?? ''] ?? evento.tabla ?? '—' },
            { label: 'Registro', valor: evento.registroId ? `#${evento.registroId}` : '—' },
            { label: 'Usuario',  valor: evento.usuarioNombre ?? (evento.usuarioId ? `ID ${evento.usuarioId}` : '—') },
            { label: 'IP',       valor: evento.ip ?? '—' },
          ].map(({ label, valor }) => (
            <Box key={label}>
              <Typography sx={{ fontSize: '0.72rem', color: '#B4B2A9', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', mb: 0.25 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: '#2C2C2A', fontFamily: label === 'IP' || label === 'Registro' ? 'monospace' : 'inherit' }}>
                {valor}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Datos anteriores */}
        {evento.datosAnteriores && (
          <Box>
            <Typography sx={{ fontSize: '0.72rem', color: '#B4B2A9', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', mb: 0.5 }}>
              Datos enviados
            </Typography>
            <Box component="pre" sx={{
              bgcolor: '#F4F3F1', borderRadius: 2, p: 1.5,
              fontSize: '0.78rem', color: '#2C2C2A', overflowX: 'auto',
              m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {prettyJson(evento.datosAnteriores)}
            </Box>
          </Box>
        )}

        {/* Datos nuevos / resultado */}
        {evento.datosNuevos && (
          <Box>
            <Typography sx={{ fontSize: '0.72rem', color: '#B4B2A9', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', mb: 0.5 }}>
              Resultado
            </Typography>
            <Box component="pre" sx={{
              bgcolor: '#F4F3F1', borderRadius: 2, p: 1.5,
              fontSize: '0.78rem', color: '#2C2C2A', overflowX: 'auto',
              m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {prettyJson(evento.datosNuevos)}
            </Box>
          </Box>
        )}

        {/* Error */}
        {evento.error && (
          <Box>
            <Typography sx={{ fontSize: '0.72rem', color: '#C62828', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', mb: 0.5 }}>
              Error
            </Typography>
            <Box component="pre" sx={{
              bgcolor: '#FFEBEE', borderRadius: 2, p: 1.5,
              fontSize: '0.78rem', color: '#C62828', overflowX: 'auto',
              m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {evento.error}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} sx={{ color: '#888780', borderRadius: 2 }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export default function AuditoriaPage() {
  const [eventos, setEventos]           = useState<AuditoriaResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages]     = useState(0);
  const [loading, setLoading]           = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [metricas, setMetricas]         = useState<Record<string, number>>({});

  // Filtros (estado pendiente de aplicar)
  const [busqueda, setBusqueda]   = useState('');
  const [accionFiltro, setAccionFiltro] = useState('');
  const [desde, setDesde]         = useState('');
  const [hasta, setHasta]         = useState('');

  // Filtros actualmente aplicados (los que se mandaron al back en el último fetch)
  const filtrosAplicadosRef = useRef<AuditoriaFiltros>({});

  // Paginación
  const [page, setPage]           = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Modal
  const [detalleEvento, setDetalleEvento] = useState<AuditoriaResponse | null>(null);

  // Acciones únicas derivadas de todos los eventos cargados (sin setState en effect)
  const accionesUnicas = useMemo(
    () => [...new Set(eventos.map(e => e.accion))].sort(),
    [eventos],
  );

  // ── Carga de datos ──────────────────────────────────────────────────────

  // Función reutilizable para los handlers (filtros, paginación, etc.)
  const cargar = async (filtros: AuditoriaFiltros, pag: number, size: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listarAuditoria({ ...filtros, page: pag, size });
      const paged = res.data.data;
      setEventos(paged.content);
      setTotalElements(paged.totalElements);
      setTotalPages(paged.totalPages);
    } catch {
      setError('Error al cargar datos de auditoría');
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial con métricas — lógica dentro del effect para evitar setState en cascada
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resEventos, resMetricas] = await Promise.allSettled([
          listarAuditoria({ page: 0, size: 50 }),
          obtenerMetricas(),
        ]);
        if (resEventos.status === 'fulfilled') {
          const paged = resEventos.value.data.data;
          setEventos(paged.content);
          setTotalElements(paged.totalElements);
          setTotalPages(paged.totalPages);
        } else {
          setError('Error al cargar datos de auditoría');
        }
        if (resMetricas.status === 'fulfilled') {
          setMetricas(resMetricas.value.data.data);
        }
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Acciones de filtros ─────────────────────────────────────────────────

  const buildFiltros = (): AuditoriaFiltros => ({
    ...(accionFiltro ? { accion: accionFiltro } : {}),
    ...(desde        ? { desde: desde + 'T00:00:00' } : {}),
    ...(hasta        ? { hasta: hasta + 'T23:59:59' } : {}),
    // busqueda de texto: el back no tiene full-text search todavía,
    // se aplica localmente sólo como complemento visual sobre la página actual.
  });

  const aplicarFiltros = () => {
    const filtros = buildFiltros();
    filtrosAplicadosRef.current = filtros;
    setPage(0);
    void cargar(filtros, 0, rowsPerPage);
  };

  const limpiarFiltros = () => {
    setBusqueda(''); setAccionFiltro(''); setDesde(''); setHasta('');
    filtrosAplicadosRef.current = {};
    setPage(0);
    void cargar({}, 0, rowsPerPage);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
    void cargar(filtrosAplicadosRef.current, newPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value, 10);
    setRowsPerPage(size);
    setPage(0);
    void cargar(filtrosAplicadosRef.current, 0, size);
  };

  // ── Exportación ─────────────────────────────────────────────────────────

  const handleExport = async () => {
    setLoadingExport(true);
    try {
      await descargarCsvAuditoria(filtrosAplicadosRef.current);
    } catch {
      setError('Error al exportar');
    } finally {
      setLoadingExport(false);
    }
  };

  // ── Filtrado local de texto (sobre la página cargada) ───────────────────

  const eventosFiltrados = busqueda
    ? eventos.filter(e => {
        const q = busqueda.toLowerCase();
        const { texto } = resumenDetalle(e);
        return (
          e.accion.toLowerCase().includes(q) ||
          (e.tabla ?? '').toLowerCase().includes(q) ||
          (e.usuarioNombre ?? '').toLowerCase().includes(q) ||
          texto.toLowerCase().includes(q)
        );
      })
    : eventos;

  const tieneFilros = busqueda || accionFiltro || desde || hasta;

  // ── Render ──────────────────────────────────────────────────────────────

  const metricasItems = [
    {
      label: 'Total eventos',
      value: Object.values(metricas).reduce((a, b) => a + b, 0),
      icon: <HistoryOutlinedIcon sx={{ fontSize: 18 }} />,
      color: ACCENT, bg: ACCENT_BG,
    },
    {
      label: 'Ventas anuladas',
      value: metricas['ANULAR_VENTA'] ?? 0,
      icon: <CancelOutlinedIcon sx={{ fontSize: 18 }} />,
      color: '#C62828', bg: '#FFEBEE',
    },
    {
      label: 'Ajustes stock',
      value: metricas['AJUSTE_STOCK'] ?? 0,
      icon: <TuneOutlinedIcon sx={{ fontSize: 18 }} />,
      color: ACCENT, bg: ACCENT_BG,
    },
    {
      label: 'Bajas empleados',
      value: metricas['BAJA_EMPLEADO'] ?? 0,
      icon: <PersonOffOutlinedIcon sx={{ fontSize: 18 }} />,
      color: '#E65100', bg: '#FFF3E0',
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#2C2C2A', letterSpacing: '-0.3px' }}>
            Auditoría
          </Typography>
          <Typography variant="body2" sx={{ color: '#888780', mt: 0.5 }}>
            Registro de acciones y cambios en el sistema
          </Typography>
        </Box>
        <Tooltip title={loadingExport ? 'Exportando…' : 'Exportar resultados actuales como CSV'}>
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={loadingExport
                ? <CircularProgress size={14} />
                : <FileDownloadOutlinedIcon />}
              disabled={loadingExport}
              onClick={() => void handleExport()}
              sx={{
                borderColor: '#D3D1C7', color: '#5F5E5A', borderRadius: 2,
                fontWeight: 600, fontSize: '0.8rem',
                '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG },
              }}
            >
              Exportar CSV
            </Button>
          </span>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Métricas — datos reales del back vía /api/auditoria/metricas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {metricasItems.map((m) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={m.label}>
            <Card elevation={0} sx={{
              border: '1px solid #E3E1DB', borderRadius: 3,
              transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' },
            }}>
              <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: '#888780', mb: 1 }}>{m.label}</Typography>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: '#2C2C2A', lineHeight: 1 }}>
                    {Object.keys(metricas).length === 0 ? '…' : m.value.toLocaleString('es-AR')}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: m.bg, color: m.color, borderRadius: 2, p: 0.75, display: 'flex' }}>{m.icon}</Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filtros */}
      <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, mb: 2 }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
            <FilterAltOutlinedIcon sx={{ fontSize: 18, color: ACCENT }} />
            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#2C2C2A' }}>Filtros</Typography>
          </Box>

          {/* Búsqueda de texto — filtra localmente sobre la página cargada */}
          <TextField
            size="small"
            placeholder="Buscar en resultados…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            sx={{ flex: 1, minWidth: 180, ...fieldSx }}
            slotProps={{ input: { startAdornment: <SearchOutlinedIcon sx={{ fontSize: 17, color: '#B4B2A9', mr: 0.5 }} /> } }}
          />

          {/* Acción — filtra en el backend */}
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Acción</InputLabel>
            <Select label="Acción" value={accionFiltro} onChange={(e) => setAccionFiltro(e.target.value)}
              sx={{ borderRadius: 2, bgcolor: '#FAFAF9' }}>
              <MenuItem value="">Todas las acciones</MenuItem>
              {accionesUnicas.map(a => {
                const st = ACCION_STYLE[a] ?? ACCION_FALLBACK;
                return (
                  <MenuItem key={a} value={a}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: st.color }}>{st.icon}</Box>
                      <Typography sx={{ fontSize: '0.85rem' }}>{a.replace(/_/g, ' ')}</Typography>
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <TextField size="small" type="date" label="Desde" value={desde}
            onChange={(e) => setDesde(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
          <TextField size="small" type="date" label="Hasta" value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />

          <Button
            variant="contained" disableElevation onClick={aplicarFiltros}
            sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 2.5, '&:hover': { bgcolor: '#2E4A7A' } }}>
            Filtrar
          </Button>
          {tieneFilros && (
            <Button onClick={limpiarFiltros} sx={{ color: '#888780', borderRadius: 2, fontWeight: 500 }}>
              Limpiar
            </Button>
          )}
        </Box>

        {tieneFilros && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Typography sx={{ fontSize: '0.78rem', color: '#888780' }}>
              {busqueda
                ? `Mostrando ${eventosFiltrados.length} de ${eventos.length} en esta página · ${totalElements.toLocaleString('es-AR')} totales`
                : `${totalElements.toLocaleString('es-AR')} eventos · página ${page + 1} de ${totalPages}`
              }
            </Typography>
          </Box>
        )}
      </Card>

      {/* Tabla */}
      <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
            <CircularProgress size={28} sx={{ color: ACCENT }} />
            <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>Cargando eventos…</Typography>
          </Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F4F3F1' }}>
                  {['Fecha y hora', 'Acción', 'Módulo', 'Registro', 'Usuario', 'Detalle', ''].map((col) => (
                    <TableCell key={col} sx={{
                      fontWeight: 700, color: '#888780', fontSize: '0.8rem',
                      letterSpacing: '0.3px', py: 1.5,
                      ...(col === '' ? { width: 36, p: 0 } : {}),
                    }}>
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {eventosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
                        <ShieldOutlinedIcon sx={{ fontSize: 40, color: '#D3D1C7' }} />
                        <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>
                          {tieneFilros ? 'No hay eventos que coincidan con los filtros' : 'No hay eventos registrados'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : eventosFiltrados.map((e) => {
                  const style = ACCION_STYLE[e.accion] ?? ACCION_FALLBACK;
                  const { texto: detalle, esError } = resumenDetalle(e);
                  const tieneDetalle = !!(e.datosAnteriores || e.datosNuevos || e.error);

                  return (
                    <TableRow
                      key={e.id}
                      sx={{ '&:hover': { bgcolor: '#FAFAF9' }, '& td': { borderBottom: '1px solid #F0EEE8' } }}
                    >
                      {/* Fecha */}
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: '#888780', fontFamily: 'monospace' }}>
                          {formatFecha(e.fecha)}
                        </Typography>
                      </TableCell>

                      {/* Acción */}
                      <TableCell>
                        <Chip
                          icon={<Box sx={{ color: `${style.color} !important`, display: 'flex', pl: 0.5 }}>{style.icon}</Box>}
                          label={e.accion.replace(/_/g, ' ')}
                          size="small"
                          sx={{
                            bgcolor: style.bg, color: style.color,
                            fontWeight: 700, fontSize: '0.72rem',
                            height: 24, borderRadius: 1.5,
                            '& .MuiChip-label': { px: 1 },
                          }}
                        />
                      </TableCell>

                      {/* Módulo */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ACCENT, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '0.82rem', color: '#5F5E5A', fontWeight: 500 }}>
                            {TABLA_LABEL[e.tabla ?? ''] ?? e.tabla ?? '—'}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Registro */}
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: '#888780', fontFamily: 'monospace' }}>
                          {e.registroId ? `#${e.registroId}` : '—'}
                        </Typography>
                      </TableCell>

                      {/* Usuario — columna nueva */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {e.usuarioNombre && (
                            <PersonOutlinedIcon sx={{ fontSize: 13, color: '#B4B2A9' }} />
                          )}
                          <Typography sx={{ fontSize: '0.82rem', color: '#5F5E5A' }}>
                            {e.usuarioNombre ?? (e.usuarioId ? `#${e.usuarioId}` : '—')}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Detalle */}
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography sx={{
                          fontSize: '0.82rem',
                          color: esError ? '#C62828' : '#5F5E5A',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {detalle}
                        </Typography>
                      </TableCell>

                      {/* Expandir */}
                      <TableCell sx={{ pr: 1 }}>
                        {tieneDetalle && (
                          <Tooltip title="Ver detalle completo">
                            <IconButton size="small" onClick={() => setDetalleEvento(e)}
                              sx={{ color: '#B4B2A9', '&:hover': { color: ACCENT } }}>
                              <OpenInFullOutlinedIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Paginación */}
            <TablePagination
              component="div"
              count={totalElements}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[25, 50, 100]}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}–${to} de ${count.toLocaleString('es-AR')}`}
              sx={{
                borderTop: '1px solid #F0EEE8',
                '& .MuiTablePagination-toolbar': { minHeight: 48 },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontSize: '0.8rem', color: '#888780',
                },
              }}
            />
          </>
        )}
      </Card>

      {/* Modal de detalle */}
      <DetalleModal evento={detalleEvento} onClose={() => setDetalleEvento(null)} />
    </Box>
  );
}
