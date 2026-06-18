import { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Grid, Alert, CircularProgress,
  TextField, MenuItem, Select, FormControl, InputLabel,
  Button, Chip, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { listarAuditoria, type AuditoriaResponse } from '../../api/auditoriaApi';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

const ACCION_STYLE: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  ANULAR_VENTA:           { color: '#C62828', bg: '#FFEBEE', icon: <CancelOutlinedIcon sx={{ fontSize: 13 }} /> },
  AJUSTE_STOCK:           { color: ACCENT,    bg: ACCENT_BG, icon: <TuneOutlinedIcon sx={{ fontSize: 13 }} /> },
  BAJA_PRODUCTO:          { color: '#C62828', bg: '#FFEBEE', icon: <CancelOutlinedIcon sx={{ fontSize: 13 }} /> },
  CREAR_EMPLEADO:         { color: '#2E7D32', bg: '#E8F5E9', icon: <PersonOffOutlinedIcon sx={{ fontSize: 13 }} /> },
  BAJA_EMPLEADO:          { color: '#E65100', bg: '#FFF3E0', icon: <PersonOffOutlinedIcon sx={{ fontSize: 13 }} /> },
  FIJAR_LIMITE_CC:        { color: '#6A1B9A', bg: '#F3E5F5', icon: <TuneOutlinedIcon sx={{ fontSize: 13 }} /> },
  LIQUIDAR_CC_EMPLEADO:   { color: '#6A1B9A', bg: '#F3E5F5', icon: <HistoryOutlinedIcon sx={{ fontSize: 13 }} /> },
  AJUSTE_CC:              { color: '#E65100', bg: '#FFF3E0', icon: <TuneOutlinedIcon sx={{ fontSize: 13 }} /> },
  REINTENTAR_COMPROBANTE: { color: '#C62828', bg: '#FFEBEE', icon: <WarningAmberOutlinedIcon sx={{ fontSize: 13 }} /> },
};

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

const formatDetalle = (e: AuditoriaResponse): string => {
  const raw = e.datosNuevos ?? e.datosAnteriores ?? e.error ?? '';
  if (!raw) return '—';

  const matchNombre = raw.match(/nombre=([^,\]]+)/);
  const matchCodigo = raw.match(/codigo=([^,\]]+)/);
  const matchId = raw.match(/id=(\d+)/);
  const matchMonto = raw.match(/monto=([^,\]]+)/);
  const matchLegajo = raw.match(/legajo=([^,\]]+)/);
  const matchCargo = raw.match(/cargo=([^,\]]+)/);
  const matchStock = raw.match(/stockActual=([^,\]]+)/);

  if (matchNombre ?? matchCodigo) {
    const partes: string[] = [];
    if (matchNombre) partes.push(matchNombre[1].trim());
    if (matchCodigo) partes.push(`Cód: ${matchCodigo[1].trim()}`);
    if (matchStock) partes.push(`Stock: ${matchStock[1].trim()}`);
    if (matchMonto) partes.push(`$${matchMonto[1].trim()}`);
    if (matchLegajo) partes.push(`Legajo: ${matchLegajo[1].trim()}`);
    if (matchCargo) partes.push(`Cargo: ${matchCargo[1].trim()}`);
    if (matchId) partes.push(`#${matchId[1]}`);
    return partes.join(' · ');
  }

  try {
    const obj = JSON.parse(raw);
    const partes: string[] = [];
    if (obj.nombre) partes.push(obj.nombre);
    if (obj.codigo) partes.push(`Cód: ${obj.codigo}`);
    if (obj.monto) partes.push(`$${obj.monto}`);
    if (obj.id) partes.push(`#${obj.id}`);
    return partes.length > 0 ? partes.join(' · ') : raw.substring(0, 80);
  } catch {
    return raw.length > 80 ? raw.substring(0, 80) + '...' : raw;
  }
};

export default function AuditoriaPage() {
  const [eventos, setEventos] = useState<AuditoriaResponse[]>([]);
  const [filtrados, setFiltrados] = useState<AuditoriaResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [accionFiltro, setAccionFiltro] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const res = await listarAuditoria(0, 200);
        const data = res.data.data.content;
        setEventos(data);
        setFiltrados(data);
      } catch {
        setError('Error al cargar datos de auditoría');
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, []);

  const aplicarFiltros = () => {
    let result = [...eventos];
    if (busqueda) {
      const q = busqueda.toLowerCase();
      result = result.filter(e =>
        e.accion.toLowerCase().includes(q) ||
        (e.tabla ?? '').toLowerCase().includes(q) ||
        formatDetalle(e).toLowerCase().includes(q)
      );
    }
    if (accionFiltro) result = result.filter(e => e.accion === accionFiltro);
    if (desde) result = result.filter(e => new Date(e.fecha) >= new Date(desde));
    if (hasta) result = result.filter(e => new Date(e.fecha) <= new Date(hasta + 'T23:59:59'));
    setFiltrados(result);
  };

  const limpiarFiltros = () => {
    setBusqueda(''); setAccionFiltro(''); setDesde(''); setHasta('');
    setFiltrados(eventos);
  };

  const contarPor = (accion: string) => eventos.filter(e => e.accion === accion).length;
  const accionesUnicas = [...new Set(eventos.map(e => e.accion))].sort();

  const formatFecha = (f: string) =>
    new Date(f).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const tieneFilros = busqueda || accionFiltro || desde || hasta;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#2C2C2A', letterSpacing: '-0.3px' }}>
          Auditoría
        </Typography>
        <Typography variant="body2" sx={{ color: '#888780', mt: 0.5 }}>
          Registro de acciones y cambios en el sistema
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Métricas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total eventos', value: eventos.length, icon: <HistoryOutlinedIcon sx={{ fontSize: 18 }} />, color: ACCENT, bg: ACCENT_BG },
          { label: 'Ventas anuladas', value: contarPor('ANULAR_VENTA'), icon: <CancelOutlinedIcon sx={{ fontSize: 18 }} />, color: '#C62828', bg: '#FFEBEE' },
          { label: 'Ajustes stock', value: contarPor('AJUSTE_STOCK'), icon: <TuneOutlinedIcon sx={{ fontSize: 18 }} />, color: ACCENT, bg: ACCENT_BG },
          { label: 'Bajas empleados', value: contarPor('BAJA_EMPLEADO'), icon: <PersonOffOutlinedIcon sx={{ fontSize: 18 }} />, color: '#E65100', bg: '#FFF3E0' },
        ].map((m) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={m.label}>
            <Card elevation={0} sx={{
              border: '1px solid #E3E1DB', borderRadius: 3,
              transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' },
            }}>
              <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 500, color: '#888780', mb: 1 }}>{m.label}</Typography>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 700, color: '#2C2C2A', lineHeight: 1 }}>
                    {loading ? '...' : m.value}
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
          <TextField size="small" placeholder="Buscar por acción, módulo o detalle..."
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
            sx={{ flex: 1, minWidth: 200, ...fieldSx }}
            slotProps={{ input: { startAdornment: <SearchOutlinedIcon sx={{ fontSize: 17, color: '#B4B2A9', mr: 0.5 }} /> } }}
          />
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>Acción</InputLabel>
            <Select label="Acción" value={accionFiltro} onChange={(e) => setAccionFiltro(e.target.value)}
              sx={{ borderRadius: 2, bgcolor: '#FAFAF9' }}>
              <MenuItem value="">Todas las acciones</MenuItem>
              {accionesUnicas.map(a => (
                <MenuItem key={a} value={a}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: ACCION_STYLE[a]?.color ?? '#888780' }}>{ACCION_STYLE[a]?.icon}</Box>
                    <Typography sx={{ fontSize: '0.85rem' }}>{a.replace(/_/g, ' ')}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" type="date" label="Desde" value={desde}
            onChange={(e) => setDesde(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
          <TextField size="small" type="date" label="Hasta" value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
          <Button variant="contained" disableElevation onClick={aplicarFiltros}
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
              Mostrando {filtrados.length} de {eventos.length} eventos
            </Typography>
          </Box>
        )}
      </Card>

      {/* Tabla */}
      <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
            <CircularProgress size={28} sx={{ color: ACCENT }} />
            <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>Cargando eventos...</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F4F3F1' }}>
                {['Fecha y hora', 'Acción', 'Módulo', 'Registro', 'Detalle'].map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 700, color: '#888780', fontSize: '0.8rem', letterSpacing: '0.3px', py: 1.5 }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
                      <ShieldOutlinedIcon sx={{ fontSize: 40, color: '#D3D1C7' }} />
                      <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>No hay eventos que coincidan</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : filtrados.map((e) => {
                const style = ACCION_STYLE[e.accion] ?? { color: '#888780', bg: '#F5F5F5', icon: null };
                const detalle = formatDetalle(e);
                const esError = !e.datosNuevos && !e.datosAnteriores && !!e.error;
                return (
                  <TableRow key={e.id} sx={{ '&:hover': { bgcolor: '#FAFAF9' }, '& td': { borderBottom: '1px solid #F0EEE8' } }}>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: '#888780', fontFamily: 'monospace' }}>
                        {formatFecha(e.fecha)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<Box sx={{ color: `${style.color} !important`, display: 'flex', pl: 0.5 }}>{style.icon}</Box>}
                        label={e.accion.replace(/_/g, ' ')}
                        size="small"
                        sx={{
                          bgcolor: style.bg, color: style.color,
                          fontWeight: 700, fontSize: '0.72rem',
                          height: 24, borderRadius: 1.5, border: 'none',
                          '& .MuiChip-label': { px: 1 },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ACCENT, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.82rem', color: '#5F5E5A', fontWeight: 500 }}>
                          {TABLA_LABEL[e.tabla] ?? e.tabla ?? '—'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.82rem', color: '#888780', fontFamily: 'monospace' }}>
                        {e.registroId ? `#${e.registroId}` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography sx={{
                        fontSize: '0.82rem',
                        color: esError ? '#C62828' : '#5F5E5A',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {detalle}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </Box>
  );
}