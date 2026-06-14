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
import {
  listarProductos, crearProducto, editarProducto,
  desactivarProducto, ajustarStock, listarCategorias,
} from '../../api/productoApi';
import type { ProductoResponse, ProductoRequest, CategoriaResponse, AlicuotaIVA } from '../../types/producto';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

const IVA_OPTIONS = [
  { value: 'IVA_0', label: '0%' },
  { value: 'IVA_10_5', label: '10.5%' },
  { value: 'IVA_21', label: '21%' },
  { value: 'IVA_27', label: '27%' },
];

const emptyForm: ProductoRequest = {
  codigo: '', nombre: '', descripcion: '', categoriaId: undefined,
  precioCosto: 0, precioVenta1: 0, precioVenta2: 0, precioVenta3: 0,
  alicuotaIVA: 'IVA_21', stockInicial: 0, stockMinimo: 0,
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: '#FAFAF9',
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1 },
  },
};

export default function ProductosPage() {
  const [productos, setProductos] = useState<ProductoResponse[]>([]);
  const [categorias, setCategorias] = useState<CategoriaResponse[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogProducto, setDialogProducto] = useState(false);
  const [dialogStock, setDialogStock] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoResponse | null>(null);
  const [form, setForm] = useState<ProductoRequest>(emptyForm);
  const [ajuste, setAjuste] = useState({ cantidad: 0, motivo: '' });
  const [saving, setSaving] = useState(false);

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

  const abrirStock = (p: ProductoResponse) => {
    setProductoSeleccionado(p);
    setAjuste({ cantidad: 0, motivo: '' });
    setDialogStock(true);
  };

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

  const handleDesactivar = async (id: number) => {
    if (!confirm('¿Desactivar este producto?')) return;
    try {
      await desactivarProducto(id);
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
        <Button
          variant="contained" disableElevation
          startIcon={<AddIcon />}
          onClick={abrirCrear}
          sx={{
            bgcolor: ACCENT, borderRadius: 2,
            fontWeight: 600, px: 2.5, py: 1,
            '&:hover': { bgcolor: '#2E4A7A' },
          }}
        >
          Nuevo producto
        </Button>
      </Box>

      {/* Alerta stock bajo */}
      {stockBajoCount > 0 && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          bgcolor: '#FFF8E1', border: '1px solid #FFE082',
          borderRadius: 2.5, px: 2, py: 1.5, mb: 2,
        }}>
          <WarningAmberOutlinedIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
          <Typography sx={{ fontSize: '0.9rem', color: '#92400E', fontWeight: 500 }}>
            {stockBajoCount} producto{stockBajoCount > 1 ? 's' : ''} con stock crítico — revisá el inventario
          </Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Filtros */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <TextField
          size="small" placeholder="Buscar por nombre o código..."
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && cargar()}
          sx={{ flex: 1, ...fieldSx }}
          slotProps={{ input: { startAdornment: <SearchOutlinedIcon sx={{ fontSize: 18, color: '#B4B2A9', mr: 0.5 }} /> } }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Categoría</InputLabel>
          <Select
            label="Categoría"
            value={categoriaId ?? ''}
            onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : undefined)}
            sx={{ borderRadius: 2, bgcolor: '#FAFAF9' }}
          >
            <MenuItem value="">Todas</MenuItem>
            {categorias.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <Button
          variant="outlined" onClick={cargar}
          sx={{
            borderColor: '#E3E1DB', borderRadius: 2, color: '#3C3B38',
            fontWeight: 500, px: 2,
            '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG },
          }}
        >
          Buscar
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
              {productos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
                      <InventoryOutlinedIcon sx={{ fontSize: 40, color: '#D3D1C7' }} />
                      <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>No hay productos</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                productos.map((p) => (
                  <TableRow
                    key={p.id}
                    sx={{
                      '&:hover': { bgcolor: '#FAFAF9' },
                      '& td': { borderBottom: '1px solid #F0EEE8' },
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: ACCENT, fontFamily: 'monospace' }}>
                        {p.codigo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: '#2C2C2A' }}>{p.nombre}</Typography>
                      {p.descripcion && (
                        <Typography sx={{ fontSize: '0.75rem', color: '#B4B2A9' }} noWrap>{p.descripcion}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.nombreCategoria
                        ? <Chip label={p.nombreCategoria} size="small" sx={{ bgcolor: ACCENT_BG, color: ACCENT, fontWeight: 500, fontSize: '0.75rem', height: 20, borderRadius: 1 }} />
                        : <Typography sx={{ color: '#D3D1C7', fontSize: '0.85rem' }}>—</Typography>
                      }
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#2C2C2A' }}>
                        ${p.precioVenta1?.toLocaleString('es-AR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{
                        fontWeight: 700, fontSize: '0.9rem',
                        color: p.stockBajo ? '#C62828' : '#2C2C2A',
                      }}>
                        {p.stockActual}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={p.stockBajo ? 'Stock bajo' : 'OK'}
                        size="small"
                        sx={{
                          bgcolor: p.stockBajo ? '#FFEBEE' : '#E8F5E9',
                          color: p.stockBajo ? '#C62828' : '#2E7D32',
                          fontWeight: 600, fontSize: '0.75rem',
                          height: 22, borderRadius: 1.5,
                          border: 'none',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => abrirEditar(p)}
                            sx={{ color: '#888780', '&:hover': { color: ACCENT, bgcolor: ACCENT_BG } }}>
                            <EditOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ajustar stock">
                          <IconButton size="small" onClick={() => abrirStock(p)}
                            sx={{ color: '#888780', '&:hover': { color: '#E65100', bgcolor: '#FFF3E0' } }}>
                            <TuneOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Desactivar">
                          <IconButton size="small" onClick={() => handleDesactivar(p.id)}
                            sx={{ color: '#888780', '&:hover': { color: '#C62828', bgcolor: '#FFEBEE' } }}>
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
      <Dialog open={dialogProducto} onClose={() => setDialogProducto(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
          {productoSeleccionado ? 'Editar producto' : 'Nuevo producto'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Código" value={form.codigo} sx={fieldSx}
                onChange={(e) => setForm(f => ({ ...f, codigo: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Categoría</InputLabel>
                <Select label="Categoría" value={form.categoriaId ?? ''} sx={{ borderRadius: 2 }}
                  onChange={(e) => setForm(f => ({ ...f, categoriaId: e.target.value ? Number(e.target.value) : undefined }))}>
                  <MenuItem value="">Sin categoría</MenuItem>
                  {categorias.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Nombre" value={form.nombre} sx={fieldSx}
                onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Descripción" value={form.descripcion} sx={fieldSx}
                onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth size="small" label="Precio venta 1" type="number" value={form.precioVenta1} sx={fieldSx}
                onChange={(e) => setForm(f => ({ ...f, precioVenta1: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth size="small" label="Precio venta 2" type="number" value={form.precioVenta2} sx={fieldSx}
                onChange={(e) => setForm(f => ({ ...f, precioVenta2: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth size="small" label="Precio venta 3" type="number" value={form.precioVenta3} sx={fieldSx}
                onChange={(e) => setForm(f => ({ ...f, precioVenta3: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth size="small" label="Precio costo" type="number" value={form.precioCosto} sx={fieldSx}
                onChange={(e) => setForm(f => ({ ...f, precioCosto: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>IVA</InputLabel>
                <Select label="IVA" value={form.alicuotaIVA} sx={{ borderRadius: 2 }}
                  onChange={(e) => setForm(f => ({ ...f, alicuotaIVA: e.target.value as AlicuotaIVA }))}>
                  {IVA_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth size="small" label="Stock mínimo" type="number" value={form.stockMinimo} sx={fieldSx}
                onChange={(e) => setForm(f => ({ ...f, stockMinimo: Number(e.target.value) }))} />
            </Grid>
            {!productoSeleccionado && (
              <Grid size={{ xs: 4 }}>
                <TextField fullWidth size="small" label="Stock inicial" type="number" value={form.stockInicial} sx={fieldSx}
                  onChange={(e) => setForm(f => ({ ...f, stockInicial: Number(e.target.value) }))} />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogProducto(false)}
            sx={{ color: '#888780', borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button variant="contained" disableElevation onClick={handleGuardar} disabled={saving}
            sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#2E4A7A' } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Ajuste de stock */}
      <Dialog open={dialogStock} onClose={() => setDialogStock(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
          Ajustar stock
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, p: 1.5, bgcolor: ACCENT_BG, borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.85rem', color: ACCENT, fontWeight: 500 }}>
              {productoSeleccionado?.nombre}
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: '#888780', mt: 0.25 }}>
              Stock actual: <strong style={{ color: '#2C2C2A' }}>{productoSeleccionado?.stockActual}</strong>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              size="small" label="Cantidad (+ ingreso / - egreso)" type="number"
              value={ajuste.cantidad}
              onChange={(e) => setAjuste(a => ({ ...a, cantidad: Number(e.target.value) }))}
              fullWidth sx={fieldSx}
            />
            <TextField
              size="small" label="Motivo" value={ajuste.motivo}
              onChange={(e) => setAjuste(a => ({ ...a, motivo: e.target.value }))}
              fullWidth sx={fieldSx}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogStock(false)} sx={{ color: '#888780', borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button variant="contained" disableElevation onClick={handleAjusteStock}
            disabled={saving || !ajuste.motivo}
            sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#2E4A7A' } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Confirmar ajuste'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}