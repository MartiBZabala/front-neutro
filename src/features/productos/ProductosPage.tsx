import { useState, useEffect } from 'react';
import {
  Box, Card, TextField, Button, Typography, Chip,
  Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import AddIcon from '@mui/icons-material/Add';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import {
  listarProductos, crearProducto, editarProducto,
  desactivarProducto, ajustarStock, listarCategorias,
} from '../../api/productoApi';
import type { ProductoResponse, ProductoRequest, CategoriaResponse, AlicuotaIVA } from '../../types/producto';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

const IVA_OPTIONS = [
  { value: 'EXENTO', label: 'Exento' },
  { value: 'CERO', label: '0%' },
  { value: 'DIEZ_Y_MEDIO', label: '10,5%' },
  { value: 'VEINTIUNO', label: '21%' },
  { value: 'VEINTISIETE', label: '27%' },
];

const emptyForm: ProductoRequest = {
  codigo: '', nombre: '', descripcion: '', categoriaId: undefined,
  precioCosto: 0, precioVenta1: 0, precioVenta2: 0, precioVenta3: 0,
  alicuotaIVA: 'VEINTIUNO', stockInicial: 0, stockMinimo: 0,
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2, bgcolor: '#FAFAF9',
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1 },
  },
};

export default function ProductosPage() {
  const [productos, setProductos] = useState<ProductoResponse[]>([]);
  const [categorias, setCategorias] = useState<CategoriaResponse[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | undefined>();
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialogs producto
  const [dialogProducto, setDialogProducto] = useState(false);
  const [dialogStock, setDialogStock] = useState(false);
  const [dialogEliminar, setDialogEliminar] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoResponse | null>(null);
  const [productoAEliminar, setProductoAEliminar] = useState<ProductoResponse | null>(null);
  const [form, setForm] = useState<ProductoRequest>(emptyForm);
  const [ajuste, setAjuste] = useState({ cantidad: 0, motivo: '' });
  const [saving, setSaving] = useState(false);

  // Carga rápida
  const [dialogCargaRapida, setDialogCargaRapida] = useState(false);
  const [inputCarga, setInputCarga] = useState('');
  const [buscandoCarga, setBuscandoCarga] = useState(false);
  const [resultadoCarga, setResultadoCarga] = useState<{ tipo: 'ok' | 'nuevo' | null; producto?: ProductoResponse; codigo?: string; cantidad?: number }>({ tipo: null });
  const [logCarga, setLogCarga] = useState<{ nombre: string; cantidad: number; ok: boolean }[]>([]);
  const [savingCarga, setSavingCarga] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          listarProductos(undefined, undefined),
          listarCategorias(),
        ]);
        setProductos(prodRes.data.data.content);
        setCategorias(catRes.data.data);
      } catch {
        setError('Error al cargar productos');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listarProductos(busqueda || undefined, categoriaId);
      setProductos(res.data.data.content);
    } catch {
      setError('Error al buscar productos');
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = soloStockBajo ? productos.filter(p => p.stockBajo) : productos;

  const abrirCrear = () => { setProductoSeleccionado(null); setForm(emptyForm); setDialogProducto(true); };
  const abrirEditar = (p: ProductoResponse) => {
    setProductoSeleccionado(p);
    setForm({
      codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion ?? '',
      categoriaId: p.categoriaId ?? undefined,
      precioCosto: p.precioCosto, precioVenta1: p.precioVenta1,
      precioVenta2: p.precioVenta2, precioVenta3: p.precioVenta3,
      alicuotaIVA: p.alicuotaIVA, stockInicial: p.stockActual, stockMinimo: p.stockMinimo,
    });
    setDialogProducto(true);
  };
  const abrirStock = (p: ProductoResponse) => { setProductoSeleccionado(p); setAjuste({ cantidad: 0, motivo: '' }); setDialogStock(true); };
  const abrirEliminar = (p: ProductoResponse) => { setProductoAEliminar(p); setDialogEliminar(true); };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      if (productoSeleccionado) {
        await editarProducto(productoSeleccionado.id, form);
      } else {
        await crearProducto(form);
      }
      setDialogProducto(false);
      cargar();
    } catch {
      setError('Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDesactivar = async () => {
    if (!productoAEliminar) return;
    try {
      await desactivarProducto(productoAEliminar.id);
      setDialogEliminar(false);
      setProductoAEliminar(null);
      cargar();
    } catch {
      setError('Error al desactivar');
    }
  };

  const handleAjusteStock = async () => {
    if (!productoSeleccionado) return;
    setSaving(true);
    try {
      await ajustarStock(productoSeleccionado.id, ajuste);
      setDialogStock(false);
      cargar();
    } catch {
      setError('Error al ajustar stock');
    } finally {
      setSaving(false);
    }
  };

  // ── Carga rápida ──
  const procesarInputCarga = async () => {
    if (!inputCarga.trim()) return;
    setBuscandoCarga(true);
    setResultadoCarga({ tipo: null });
    try {
      let cantidad = 1;
      let codigoBusqueda = inputCarga.trim();
      if (inputCarga.includes('*')) {
        const [cantStr, cod] = inputCarga.split('*');
        cantidad = parseInt(cantStr) || 1;
        codigoBusqueda = cod.trim();
      }
      const res = await listarProductos(codigoBusqueda, undefined, 0, 10);
      const resultados = res.data.data.content;

      // Primero buscamos código exacto, si no tomamos el primero
      const encontrado = resultados.find(p => p.codigo === codigoBusqueda) ?? resultados[0];

      if (encontrado) {
        setResultadoCarga({ tipo: 'ok', producto: encontrado, cantidad });
      } else {
        setResultadoCarga({ tipo: 'nuevo', codigo: codigoBusqueda, cantidad });
      }
    } catch {
      setError('Error al buscar producto');
    } finally {
      setBuscandoCarga(false);
    }
  };

  const confirmarAjusteCarga = async () => {
    if (!resultadoCarga.producto || !resultadoCarga.cantidad) return;
    setSavingCarga(true);
    try {
      await ajustarStock(resultadoCarga.producto.id, {
        cantidad: resultadoCarga.cantidad,
        motivo: 'Carga rápida de stock',
      });
      setLogCarga(prev => [
        { nombre: resultadoCarga.producto!.nombre, cantidad: resultadoCarga.cantidad!, ok: true },
        ...prev,
      ]);
      setInputCarga('');
      setResultadoCarga({ tipo: null });
      cargar();
    } catch {
      setLogCarga(prev => [
        { nombre: resultadoCarga.producto!.nombre, cantidad: resultadoCarga.cantidad!, ok: false },
        ...prev,
      ]);
    } finally {
      setSavingCarga(false);
    }
  };

  const abrirNuevoDesdeRapida = () => {
    setForm({ ...emptyForm, codigo: resultadoCarga.codigo ?? '', stockInicial: resultadoCarga.cantidad ?? 1 });
    setProductoSeleccionado(null);
    setDialogProducto(true);
    setResultadoCarga({ tipo: null });
    setInputCarga('');
  };

  const stockBajoCount = productos.filter(p => p.stockBajo).length;

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#2C2C2A', letterSpacing: '-0.3px' }}>
            Productos
          </Typography>
          <Typography variant="body2" sx={{ color: '#888780', mt: 0.5 }}>
            Gestioná el catálogo y el stock
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<QrCodeScannerOutlinedIcon />}
            onClick={() => { setDialogCargaRapida(true); setLogCarga([]); setInputCarga(''); setResultadoCarga({ tipo: null }); }}
            sx={{ borderColor: '#E3E1DB', borderRadius: 2, color: '#3C3B38', fontWeight: 600, '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG } }}
          >
            Carga rápida
          </Button>
          <Button
            variant="contained" disableElevation
            startIcon={<AddIcon />}
            onClick={abrirCrear}
            sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 2.5, py: 1, '&:hover': { bgcolor: '#2E4A7A' } }}
          >
            Nuevo producto
          </Button>
        </Box>
      </Box>

      {/* Alerta stock bajo */}
      {stockBajoCount > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 2.5, px: 2, py: 1.5, mb: 2 }}>
          <WarningAmberOutlinedIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
          <Typography sx={{ fontSize: '0.9rem', color: '#92400E', fontWeight: 500 }}>
            {stockBajoCount} producto{stockBajoCount > 1 ? 's' : ''} con stock crítico — revisá el inventario
          </Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center' }}>
        <TextField
          size="small" placeholder="Buscar por nombre o código..."
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && cargar()}
          sx={{ flex: 1, ...fieldSx }}
          slotProps={{ input: { startAdornment: <SearchOutlinedIcon sx={{ fontSize: 18, color: '#B4B2A9', mr: 0.5 }} /> } }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Categoría</InputLabel>
          <Select label="Categoría" value={categoriaId ?? ''} onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : undefined)} sx={{ borderRadius: 2, bgcolor: '#FAFAF9' }}>
            <MenuItem value="">Todas</MenuItem>
            {categorias.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={cargar}
          sx={{ borderColor: '#E3E1DB', borderRadius: 2, color: '#3C3B38', fontWeight: 500, px: 2, '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG } }}>
          Buscar
        </Button>
        <Button
          variant={soloStockBajo ? 'contained' : 'outlined'} disableElevation
          onClick={() => setSoloStockBajo(!soloStockBajo)}
          startIcon={<WarningAmberOutlinedIcon />}
          sx={{
            borderRadius: 2, fontWeight: 500, px: 2,
            borderColor: soloStockBajo ? '#F59E0B' : '#E3E1DB',
            bgcolor: soloStockBajo ? '#FFF8E1' : 'transparent',
            color: soloStockBajo ? '#92400E' : '#3C3B38',
            '&:hover': { borderColor: '#F59E0B', bgcolor: '#FFF8E1', color: '#92400E' },
          }}
        >
          Stock bajo {soloStockBajo && `(${stockBajoCount})`}
        </Button>
      </Box>

      {/* Tabla */}
      <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
            <CircularProgress size={28} sx={{ color: ACCENT }} />
            <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>Cargando productos...</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F4F3F1' }}>
                {['Código', 'Nombre', 'Categoría', 'Precio venta', 'Stock', 'Estado', 'Acciones'].map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 700, color: '#888780', fontSize: '0.8rem', letterSpacing: '0.3px', py: 1.5 }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {productosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
                      <InventoryOutlinedIcon sx={{ fontSize: 40, color: '#D3D1C7' }} />
                      <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>
                        {soloStockBajo ? 'No hay productos con stock bajo' : 'No hay productos'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                productosFiltrados.map((p) => (
                  <TableRow key={p.id} sx={{ '&:hover': { bgcolor: '#FAFAF9' }, '& td': { borderBottom: '1px solid #F0EEE8' } }}>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: ACCENT, fontFamily: 'monospace' }}>{p.codigo}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#2C2C2A' }}>{p.nombre}</Typography>
                      {p.descripcion && <Typography sx={{ fontSize: '0.75rem', color: '#B4B2A9' }} noWrap>{p.descripcion}</Typography>}
                    </TableCell>
                    <TableCell>
                      {p.nombreCategoria
                        ? <Chip label={p.nombreCategoria} size="small" sx={{ bgcolor: ACCENT_BG, color: ACCENT, fontWeight: 500, fontSize: '0.75rem', height: 20, borderRadius: 1 }} />
                        : <Typography sx={{ color: '#D3D1C7', fontSize: '0.85rem' }}>—</Typography>
                      }
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#2C2C2A' }}>${p.precioVenta1?.toLocaleString('es-AR')}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: p.stockBajo ? '#C62828' : '#2C2C2A' }}>{p.stockActual}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={p.stockBajo ? 'Stock bajo' : 'OK'} size="small"
                        sx={{ bgcolor: p.stockBajo ? '#FFEBEE' : '#E8F5E9', color: p.stockBajo ? '#C62828' : '#2E7D32', fontWeight: 600, fontSize: '0.75rem', height: 22, borderRadius: 1.5, border: 'none' }} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => abrirEditar(p)} sx={{ color: '#888780', '&:hover': { color: ACCENT, bgcolor: ACCENT_BG } }}>
                            <EditOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ajustar stock">
                          <IconButton size="small" onClick={() => abrirStock(p)} sx={{ color: '#888780', '&:hover': { color: '#E65100', bgcolor: '#FFF3E0' } }}>
                            <TuneOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Desactivar">
                          <IconButton size="small" onClick={() => abrirEliminar(p)} sx={{ color: '#888780', '&:hover': { color: '#C62828', bgcolor: '#FFEBEE' } }}>
                            <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialog — Crear/Editar */}
      <Dialog open={dialogProducto} onClose={() => setDialogProducto(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
          {productoSeleccionado ? 'Editar producto' : 'Nuevo producto'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Código" value={form.codigo} sx={fieldSx} onChange={(e) => setForm(f => ({ ...f, codigo: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Categoría</InputLabel>
                <Select label="Categoría" value={form.categoriaId ?? ''} sx={{ borderRadius: 2 }} onChange={(e) => setForm(f => ({ ...f, categoriaId: e.target.value ? Number(e.target.value) : undefined }))}>
                  <MenuItem value="">Sin categoría</MenuItem>
                  {categorias.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Nombre *" value={form.nombre} sx={fieldSx} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Descripción" value={form.descripcion} sx={fieldSx} onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth size="small" label="Precio venta 1 *" type="number" value={form.precioVenta1} sx={fieldSx} onChange={(e) => setForm(f => ({ ...f, precioVenta1: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth size="small" label="Precio venta 2" type="number" value={form.precioVenta2} sx={fieldSx} onChange={(e) => setForm(f => ({ ...f, precioVenta2: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth size="small" label="Precio venta 3" type="number" value={form.precioVenta3} sx={fieldSx} onChange={(e) => setForm(f => ({ ...f, precioVenta3: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth size="small" label="Precio costo" type="number" value={form.precioCosto} sx={fieldSx} onChange={(e) => setForm(f => ({ ...f, precioCosto: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>IVA</InputLabel>
                <Select label="IVA" value={form.alicuotaIVA} sx={{ borderRadius: 2 }} onChange={(e) => setForm(f => ({ ...f, alicuotaIVA: e.target.value as AlicuotaIVA }))}>
                  {IVA_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth size="small" label="Stock mínimo" type="number" value={form.stockMinimo} sx={fieldSx} onChange={(e) => setForm(f => ({ ...f, stockMinimo: Number(e.target.value) }))} />
            </Grid>
            {!productoSeleccionado && (
              <Grid size={{ xs: 4 }}>
                <TextField fullWidth size="small" label="Stock inicial" type="number" value={form.stockInicial} sx={fieldSx} onChange={(e) => setForm(f => ({ ...f, stockInicial: Number(e.target.value) }))} />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogProducto(false)} sx={{ color: '#888780', borderRadius: 2 }}>Cancelar</Button>
          <Button variant="contained" disableElevation onClick={handleGuardar} disabled={saving}
            sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#2E4A7A' } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Ajuste stock */}
      <Dialog open={dialogStock} onClose={() => setDialogStock(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>Ajustar stock</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 1.5, bgcolor: ACCENT_BG, borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.85rem', color: ACCENT, fontWeight: 500 }}>{productoSeleccionado?.nombre}</Typography>
            <Typography sx={{ fontSize: '0.82rem', color: '#888780', mt: 0.25 }}>
              Stock actual: <strong style={{ color: '#2C2C2A' }}>{productoSeleccionado?.stockActual}</strong>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField size="small" label="Cantidad (+ ingreso / - egreso)" type="number" value={ajuste.cantidad} onChange={(e) => setAjuste(a => ({ ...a, cantidad: Number(e.target.value) }))} fullWidth sx={fieldSx} />
            <TextField size="small" label="Motivo" value={ajuste.motivo} onChange={(e) => setAjuste(a => ({ ...a, motivo: e.target.value }))} fullWidth sx={fieldSx} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogStock(false)} sx={{ color: '#888780', borderRadius: 2 }}>Cancelar</Button>
          <Button variant="contained" disableElevation onClick={handleAjusteStock} disabled={saving || !ajuste.motivo}
            sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#2E4A7A' } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Confirmar ajuste'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Eliminar */}
      <Dialog open={dialogEliminar} onClose={() => setDialogEliminar(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>Desactivar producto</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, bgcolor: '#FFEBEE', borderRadius: 2 }}>
            <DeleteOutlinedIcon sx={{ color: '#C62828', fontSize: 20, flexShrink: 0, mt: 0.2 }} />
            <Typography sx={{ fontSize: '0.9rem', color: '#C62828' }}>
              ¿Deseas desactivar <strong>"{productoAEliminar?.nombre}"</strong>? Esta acción no se puede deshacer.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogEliminar(false)} sx={{ color: '#888780', borderRadius: 2 }}>Cancelar</Button>
          <Button variant="contained" disableElevation onClick={handleDesactivar}
            sx={{ bgcolor: '#C62828', borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#B71C1C' } }}>
            Desactivar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Carga rápida */}
      <Dialog open={dialogCargaRapida} onClose={() => setDialogCargaRapida(false)} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ bgcolor: ACCENT_BG, borderRadius: 1.5, p: 0.75, display: 'flex' }}>
              <QrCodeScannerOutlinedIcon sx={{ fontSize: 18, color: ACCENT }} />
            </Box>
            Carga rápida de stock
          </Box>
          <Typography sx={{ fontSize: '0.82rem', color: '#888780', fontWeight: 400, mt: 0.5 }}>
            Escaneá o escribí el código. Formato: <strong>cantidad*código</strong> (ej: 10*7790001234) o solo el código para agregar 1 unidad.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            {/* Panel izquierdo — input */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth size="small" autoFocus
                  placeholder="Ej: 24*7790001234 o solo 7790001234"
                  value={inputCarga}
                  onChange={(e) => { setInputCarga(e.target.value); setResultadoCarga({ tipo: null }); }}
                  onKeyDown={(e) => e.key === 'Enter' && void procesarInputCarga()}
                  sx={fieldSx}
                  slotProps={{ input: { startAdornment: <QrCodeScannerOutlinedIcon sx={{ fontSize: 18, color: '#B4B2A9', mr: 0.5 }} /> } }}
                />
                <Button variant="contained" disableElevation onClick={() => void procesarInputCarga()} disabled={buscandoCarga}
                  sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 2.5, '&:hover': { bgcolor: '#2E4A7A' } }}>
                  {buscandoCarga ? <CircularProgress size={18} color="inherit" /> : 'Buscar'}
                </Button>
              </Box>

              {/* Resultado */}
              {resultadoCarga.tipo === 'ok' && resultadoCarga.producto && (
                <Box sx={{ border: '1px solid #E3E1DB', borderRadius: 2.5, overflow: 'hidden' }}>
                  <Box sx={{ p: 2, bgcolor: ACCENT_BG, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A' }}>
                        {resultadoCarga.producto.nombre}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: '#888780' }}>
                        Código: {resultadoCarga.producto.codigo} · Stock actual: {resultadoCarga.producto.stockActual}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontSize: '0.75rem', color: '#888780' }}>Agregar</Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: '1.5rem', color: ACCENT }}>
                        +{resultadoCarga.cantidad}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '0.85rem', color: '#888780' }}>
                      Stock nuevo: <strong style={{ color: '#2C2C2A' }}>
                        {(resultadoCarga.producto.stockActual ?? 0) + (resultadoCarga.cantidad ?? 0)}
                      </strong>
                    </Typography>
                    <Button variant="contained" disableElevation onClick={() => void confirmarAjusteCarga()} disabled={savingCarga}
                      sx={{ bgcolor: '#2E7D32', borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#1B5E20' } }}>
                      {savingCarga ? <CircularProgress size={18} color="inherit" /> : '✓ Confirmar — Enter'}
                    </Button>
                  </Box>
                </Box>
              )}

              {resultadoCarga.tipo === 'nuevo' && (
                <Box sx={{ border: '1px solid #FFE082', borderRadius: 2.5, p: 2, bgcolor: '#FFF8E1' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <WarningAmberOutlinedIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#92400E' }}>
                      Producto no encontrado — código: <strong>{resultadoCarga.codigo}</strong>
                    </Typography>
                  </Box>
                  <Button variant="contained" disableElevation onClick={abrirNuevoDesdeRapida}
                    startIcon={<AddIcon />}
                    sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#2E4A7A' } }}>
                    Cargar nuevo producto
                  </Button>
                </Box>
              )}
            </Grid>

            {/* Panel derecho — log */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#888780', mb: 1, letterSpacing: '0.3px' }}>
                HISTORIAL DE ESTA SESIÓN
              </Typography>
              {logCarga.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1 }}>
                  <InventoryOutlinedIcon sx={{ fontSize: 32, color: '#D3D1C7' }} />
                  <Typography sx={{ color: '#B4B2A9', fontSize: '0.85rem' }}>Aún no cargaste ningún producto</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {logCarga.map((item, i) => (
                    <Box key={i} sx={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      p: 1.25, borderRadius: 2,
                      bgcolor: item.ok ? '#E8F5E9' : '#FFEBEE',
                      border: `1px solid ${item.ok ? '#C8E6C9' : '#FFCDD2'}`,
                    }}>
                      <Typography sx={{ fontSize: '0.85rem', color: '#2C2C2A', fontWeight: 500 }}>{item.nombre}</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: item.ok ? '#2E7D32' : '#C62828' }}>
                        {item.ok ? `+${item.cantidad}` : 'Error'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogCargaRapida(false)} sx={{ color: '#888780', borderRadius: 2 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}