import { useState, useEffect } from 'react';
import {
  Box, Card, Button, Typography, Chip, Alert,
  Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, TextField, TablePagination,
} from '@mui/material';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import {
  listarRechazados, reintentarComprobante, getComprobantePorVenta, descargarYAbrirPdf, listarTodos,
} from '../../api/facturacionApi';
import type { ComprobanteResponse, EstadoComprobante } from '../../types/facturacion';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

const TIPO_LABEL: Record<string, string> = {
  FACTURA_A: 'Factura A',
  FACTURA_B: 'Factura B',
  FACTURA_C: 'Factura C',
};

const ESTADO_STYLE: Record<EstadoComprobante, { label: string; color: string; bg: string }> = {
  AUTORIZADO: { label: 'Autorizado', color: '#2E7D32', bg: '#E8F5E9' },
  RECHAZADO:  { label: 'Rechazado',  color: '#C62828', bg: '#FFEBEE' },
  ENVIANDO:   { label: 'Enviando',   color: '#E65100', bg: '#FFF3E0' },
  BORRADOR:   { label: 'Borrador',   color: '#888780', bg: '#F5F5F5' },
};

type TabFiltro = 'todos' | 'autorizados' | 'rechazados';

export default function FacturacionPage() {
  const [comprobantes, setComprobantes] = useState<ComprobanteResponse[]>([]);
  const [rechazados, setRechazados] = useState<ComprobanteResponse[]>([]);
  const [tab, setTab] = useState<TabFiltro>('todos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reintentando, setReintentando] = useState<number | null>(null);

  const [dialogDetalle, setDialogDetalle] = useState(false);
  const [comprobanteSeleccionado, setComprobanteSeleccionado] = useState<ComprobanteResponse | null>(null);
  const [busquedaVenta, setBusquedaVenta] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [descargando, setDescargando] = useState<number | null>(null);

  // Paginación — solo aplica al tab "todos"
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [todosRes, rechazadosRes] = await Promise.all([
          listarTodos(0, 50),
          listarRechazados(),
        ]);
        setComprobantes(todosRes.data.data.content);
        setTotalElements(todosRes.data.data.totalElements);
        setRechazados(rechazadosRes.data.data);
      } catch {
        setError('Error al cargar comprobantes');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const cargarRechazados = async () => {
    try {
      const [todosRes, rechazadosRes] = await Promise.all([
        listarTodos(page, rowsPerPage),
        listarRechazados(),
      ]);
      setComprobantes(todosRes.data.data.content);
      setTotalElements(todosRes.data.data.totalElements);
      setRechazados(rechazadosRes.data.data);
    } catch {
      setError('Error al cargar rechazados');
    }
  };

  const handleReintentar = async (id: number) => {
    setReintentando(id);
    setError(null);
    try {
      await reintentarComprobante(id);
      cargarRechazados();
    } catch {
      setError('Error al reintentar el comprobante');
    } finally {
      setReintentando(null);
    }
  };

  const handleBuscarPorVenta = async () => {
    if (!busquedaVenta.trim()) return;
    setBuscando(true);
    setError(null);
    try {
      const res = await getComprobantePorVenta(Number(busquedaVenta));
      setComprobanteSeleccionado(res.data.data);
      setDialogDetalle(true);
    } catch {
      setError(`No se encontró comprobante para la venta #${busquedaVenta}`);
    } finally {
      setBuscando(false);
    }
  };

  const abrirDetalle = (c: ComprobanteResponse) => {
    setComprobanteSeleccionado(c);
    setDialogDetalle(true);
  };

  const handleDescargarPdf = async (id: number) => {
    setDescargando(id);
    setError(null);
    try {
      await descargarYAbrirPdf(id);
    } catch {
      setError('Error al descargar el PDF del comprobante');
    } finally {
      setDescargando(null);
    }
  };

  const comprobantesFiltrados = comprobantes.filter((c) => {
    if (tab === 'autorizados') return c.estado === 'AUTORIZADO';
    if (tab === 'rechazados') return c.estado === 'RECHAZADO';
    return true;
  });

  const formatNumero = (c: ComprobanteResponse) =>
    `${String(c.puntoVenta).padStart(4, '0')}-${String(c.numero).padStart(8, '0')}`;

  const totalAutorizados = comprobantes.filter(c => c.estado === 'AUTORIZADO').length;

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#2C2C2A', letterSpacing: '-0.3px' }}>
            Facturación
          </Typography>
          <Typography variant="body2" sx={{ color: '#888780', mt: 0.5 }}>
            Comprobantes electrónicos ARCA
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Buscar por N° venta..."
            value={busquedaVenta}
            onChange={(e) => setBusquedaVenta(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBuscarPorVenta()}
            slotProps={{ input: { startAdornment: <SearchOutlinedIcon sx={{ fontSize: 18, color: '#B4B2A9', mr: 0.5 }} /> } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2, bgcolor: '#FAFAF9',
                '&:hover fieldset': { borderColor: ACCENT },
                '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1 },
              },
            }}
          />
          <Button
            variant="contained" disableElevation
            onClick={handleBuscarPorVenta}
            disabled={buscando}
            sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 2.5, '&:hover': { bgcolor: '#2E4A7A' } }}
          >
            {buscando ? <CircularProgress size={18} color="inherit" /> : 'Buscar'}
          </Button>
        </Box>
      </Box>

      {/* Métricas */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, flex: 1, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' } }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontSize: '0.82rem', color: '#888780', fontWeight: 500 }}>Total comprobantes</Typography>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 700, color: '#2C2C2A', lineHeight: 1.2, mt: 0.5 }}>
                {loading ? '...' : totalElements}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: ACCENT_BG, color: ACCENT, borderRadius: 2, p: 1, display: 'flex' }}>
              <ReceiptOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>
          </Box>
        </Card>
        <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, flex: 1, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' } }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontSize: '0.82rem', color: '#888780', fontWeight: 500 }}>Autorizados</Typography>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 700, color: '#2E7D32', lineHeight: 1.2, mt: 0.5 }}>
                {loading ? '...' : totalAutorizados}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', borderRadius: 2, p: 1, display: 'flex' }}>
              <CheckCircleOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>
          </Box>
        </Card>
        <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, flex: 1, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' } }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontSize: '0.82rem', color: '#888780', fontWeight: 500 }}>Rechazados</Typography>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 700, color: rechazados.length > 0 ? '#C62828' : '#2C2C2A', lineHeight: 1.2, mt: 0.5 }}>
                {loading ? '...' : rechazados.length}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: rechazados.length > 0 ? '#FFEBEE' : '#F5F5F5', color: rechazados.length > 0 ? '#C62828' : '#888780', borderRadius: 2, p: 1, display: 'flex' }}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Alerta rechazados */}
      {rechazados.length > 0 && (
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          bgcolor: '#FFF8E1', border: '1px solid #FFE082',
          borderRadius: 2.5, px: 2, py: 1.5, mb: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <WarningAmberOutlinedIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
            <Typography sx={{ fontSize: '0.9rem', color: '#92400E', fontWeight: 500 }}>
              {rechazados.length} comprobante{rechazados.length > 1 ? 's' : ''} rechazado{rechazados.length > 1 ? 's' : ''} — requieren atención
            </Typography>
          </Box>
          <Button size="small" onClick={() => setTab('rechazados')}
            sx={{ color: '#92400E', fontWeight: 600, fontSize: '0.82rem', '&:hover': { bgcolor: '#FFE082' } }}>
            Ver rechazados →
          </Button>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 2,
          '& .MuiTab-root': { fontSize: '0.9rem', fontWeight: 500, textTransform: 'none', minHeight: 40 },
          '& .Mui-selected': { color: ACCENT, fontWeight: 700 },
          '& .MuiTabs-indicator': { bgcolor: ACCENT, height: 3, borderRadius: 2 },
        }}
      >
        <Tab value="todos" label={`Todos (${totalElements})`} />
        <Tab value="autorizados" label={`Autorizados (${totalAutorizados})`} />
        <Tab value="rechazados" label={`Rechazados${rechazados.length > 0 ? ` (${rechazados.length})` : ''}`} />
      </Tabs>

      {/* Tabla */}
      <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
            <CircularProgress size={28} sx={{ color: ACCENT }} />
            <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>Cargando comprobantes...</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F4F3F1' }}>
                {['Comprobante', 'Venta', 'Tipo', 'Autorización', 'Total', 'Estado', 'Acciones'].map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 700, color: '#888780', fontSize: '0.8rem', letterSpacing: '0.3px', py: 1.5 }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {comprobantesFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
                      <ReceiptOutlinedIcon sx={{ fontSize: 40, color: '#D3D1C7' }} />
                      <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>No hay comprobantes</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                comprobantesFiltrados.map((c) => (
                  <TableRow key={c.id} sx={{
                    '&:hover': { bgcolor: '#FAFAF9' },
                    '& td': { borderBottom: '1px solid #F0EEE8' },
                  }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: ACCENT, fontFamily: 'monospace' }}>
                        {formatNumero(c)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', color: '#888780' }}>#{c.ventaId}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#2C2C2A' }}>
                        {TIPO_LABEL[c.tipo] ?? c.tipo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {c.modoAutorizacion ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={c.modoAutorizacion}
                            size="small"
                            sx={{
                              bgcolor: c.modoAutorizacion === 'CAE' ? ACCENT_BG : '#F3E5F5',
                              color: c.modoAutorizacion === 'CAE' ? ACCENT : '#6A1B9A',
                              fontWeight: 700, fontSize: '0.72rem', height: 20, borderRadius: 1, border: 'none',
                            }}
                          />
                          <Typography sx={{ fontSize: '0.78rem', color: '#888780', fontFamily: 'monospace' }}>
                            {c.cae ?? c.caea}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: '0.85rem', color: '#D3D1C7' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#2C2C2A' }}>
                        ${c.importeTotal?.toLocaleString('es-AR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ESTADO_STYLE[c.estado].label}
                        size="small"
                        sx={{
                          bgcolor: ESTADO_STYLE[c.estado].bg,
                          color: ESTADO_STYLE[c.estado].color,
                          fontWeight: 600, fontSize: '0.72rem',
                          height: 22, borderRadius: 1.5, border: 'none',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" onClick={() => abrirDetalle(c)}
                            sx={{ color: '#888780', '&:hover': { color: ACCENT, bgcolor: ACCENT_BG } }}>
                            <ReceiptOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        {c.estado === 'AUTORIZADO' && (
                          <Tooltip title="Descargar PDF">
                            <IconButton
                              size="small"
                              onClick={() => handleDescargarPdf(c.id)}
                              disabled={descargando === c.id}
                              sx={{ color: '#888780', '&:hover': { color: ACCENT, bgcolor: ACCENT_BG } }}
                            >
                              {descargando === c.id
                                ? <CircularProgress size={14} />
                                : <PictureAsPdfOutlinedIcon sx={{ fontSize: 16 }} />
                              }
                            </IconButton>
                          </Tooltip>
                        )}
                        {c.estado === 'RECHAZADO' && (
                          <Tooltip title="Reintentar">
                            <IconButton
                              size="small"
                              onClick={() => handleReintentar(c.id)}
                              disabled={reintentando === c.id}
                              sx={{ color: '#C62828', '&:hover': { bgcolor: '#FFEBEE' } }}
                            >
                              {reintentando === c.id
                                ? <CircularProgress size={14} />
                                : <ReplayOutlinedIcon sx={{ fontSize: 16 }} />
                              }
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Paginación — solo tab "todos" */}
      {tab === 'todos' && !loading && totalElements > 0 && (
        <TablePagination
          component="div"
          count={totalElements}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={async (_, newPage) => {
            setPage(newPage);
            setLoading(true);
            try {
              const res = await listarTodos(newPage, rowsPerPage);
              setComprobantes(res.data.data.content);
            } catch { setError('Error al cargar comprobantes'); }
            finally { setLoading(false); }
          }}
          onRowsPerPageChange={async (e) => {
            const size = parseInt(e.target.value, 10);
            setRowsPerPage(size);
            setPage(0);
            setLoading(true);
            try {
              const res = await listarTodos(0, size);
              setComprobantes(res.data.data.content);
              setTotalElements(res.data.data.totalElements);
            } catch { setError('Error al cargar comprobantes'); }
            finally { setLoading(false); }
          }}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} de ${count.toLocaleString('es-AR')}`}
          sx={{
            mt: 1,
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.8rem', color: '#888780',
            },
          }}
        />
      )}

      {/* Dialog — Detalle */}
      <Dialog open={dialogDetalle} onClose={() => setDialogDetalle(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
          Comprobante {comprobanteSeleccionado ? formatNumero(comprobanteSeleccionado) : ''}
        </DialogTitle>
        <DialogContent>
          {comprobanteSeleccionado && (
            <Box sx={{ mt: 1 }}>
              {/* Estado badge */}
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={ESTADO_STYLE[comprobanteSeleccionado.estado].label}
                  sx={{
                    bgcolor: ESTADO_STYLE[comprobanteSeleccionado.estado].bg,
                    color: ESTADO_STYLE[comprobanteSeleccionado.estado].color,
                    fontWeight: 700, fontSize: '0.85rem', height: 28, borderRadius: 2, border: 'none',
                  }}
                />
              </Box>

              {[
                { label: 'Tipo', value: TIPO_LABEL[comprobanteSeleccionado.tipo] },
                { label: 'Venta', value: `#${comprobanteSeleccionado.ventaId}` },
                { label: 'Modo autorización', value: comprobanteSeleccionado.modoAutorizacion ?? '—' },
                { label: 'CAE / CAEA', value: comprobanteSeleccionado.cae ?? comprobanteSeleccionado.caea ?? '—' },
                { label: 'Vencimiento', value: comprobanteSeleccionado.autorizacionVencimiento ?? '—' },
                { label: 'Total', value: `$${comprobanteSeleccionado.importeTotal?.toLocaleString('es-AR')}` },
                { label: 'Fecha emisión', value: comprobanteSeleccionado.fechaEmision ? new Date(comprobanteSeleccionado.fechaEmision).toLocaleString('es-AR') : '—' },
              ].map((row) => (
                <Box key={row.label} sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  py: 1, px: 1, borderRadius: 1.5,
                  borderBottom: '1px solid #F0EEE8',
                  '&:hover': { bgcolor: '#FAFAF9' },
                }}>
                  <Typography sx={{ fontSize: '0.875rem', color: '#888780' }}>{row.label}</Typography>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#2C2C2A' }}>{row.value}</Typography>
                </Box>
              ))}

              {comprobanteSeleccionado.errorArca && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: '#FFEBEE', borderRadius: 2 }}>
                  <Typography sx={{ fontSize: '0.85rem', color: '#C62828', fontWeight: 500 }}>
                    Error ARCA
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: '#C62828', mt: 0.5 }}>
                    {comprobanteSeleccionado.errorArca}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogDetalle(false)} sx={{ color: '#888780', borderRadius: 2 }}>
            Cerrar
          </Button>
          {comprobanteSeleccionado?.estado === 'AUTORIZADO' && (
            <Button
              variant="outlined" disableElevation
              disabled={descargando === comprobanteSeleccionado?.id}
              onClick={() => handleDescargarPdf(comprobanteSeleccionado!.id)}
              startIcon={descargando === comprobanteSeleccionado?.id
                ? <CircularProgress size={14} />
                : <PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} />}
              sx={{ borderColor: ACCENT, color: ACCENT, borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: ACCENT_BG, borderColor: ACCENT } }}
            >
              Descargar PDF
            </Button>
          )}
          {comprobanteSeleccionado?.estado === 'RECHAZADO' && (
            <Button
              variant="contained" disableElevation
              disabled={reintentando === comprobanteSeleccionado?.id}
              onClick={() => { handleReintentar(comprobanteSeleccionado!.id); setDialogDetalle(false); }}
              sx={{ bgcolor: '#C62828', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#B71C1C' } }}
            >
              Reintentar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}