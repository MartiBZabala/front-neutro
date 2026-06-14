import { useState, useEffect } from 'react';
import {
  Box, Card, TextField, Button, Typography, Chip,
  Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, MenuItem, Select, FormControl, InputLabel,
  Switch, FormControlLabel, Tabs, Tab,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import AddIcon from '@mui/icons-material/Add';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import type { ClienteRequest, CondicionIVA, EmpleadoRequest, PersonaRequest, PersonaResponse } from '../../types/personas';
import { buscarPersonas, crearCliente, crearEmpleado, darBajaEmpleado, editarCliente } from '../../api/personasApi';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    bgcolor: '#FAFAF9',
    '&:hover fieldset': { borderColor: ACCENT },
    '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1 },
  },
};

const CONDICION_IVA_OPTIONS: { value: CondicionIVA; label: string }[] = [
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTO', label: 'Monotributo' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
  { value: 'NO_RESPONSABLE', label: 'No Responsable' },
];

const emptyPersona: PersonaRequest = {
  nombre: '', razonSocial: '', cuit: '', dni: '',
  condicionIVA: 'CONSUMIDOR_FINAL', domicilio: '', email: '', telefono: '',
};

const emptyCliente: ClienteRequest = {
  persona: emptyPersona, listaPrecios: 1,
  descuentoHabitual: 0, crearCuentaCorriente: false, limiteCredito: 0,
};

const emptyEmpleado: EmpleadoRequest = {
  persona: emptyPersona, legajo: '', cargo: '',
  fechaIngreso: new Date().toISOString().split('T')[0],
  crearCuentaCorriente: false, limiteCredito: 0,
};

type TabFiltro = 'todos' | 'clientes' | 'empleados';

export default function PersonasPage() {
  const [personas, setPersonas] = useState<PersonaResponse[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [tab, setTab] = useState<TabFiltro>('todos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dialogCliente, setDialogCliente] = useState(false);
  const [dialogEmpleado, setDialogEmpleado] = useState(false);
  const [personaSeleccionada, setPersonaSeleccionada] = useState<PersonaResponse | null>(null);
  const [formCliente, setFormCliente] = useState<ClienteRequest>(emptyCliente);
  const [formEmpleado, setFormEmpleado] = useState<EmpleadoRequest>(emptyEmpleado);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const res = await buscarPersonas();
        setPersonas(res.data.data.content);
      } catch {
        setError('Error al cargar personas');
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
      const res = await buscarPersonas(busqueda || undefined);
      setPersonas(res.data.data.content);
    } catch {
      setError('Error al buscar');
    } finally {
      setLoading(false);
    }
  };

  const personasFiltradas = personas.filter((p) => {
    if (tab === 'clientes') return p.esCliente;
    if (tab === 'empleados') return p.esEmpleado;
    return true;
  });

  const abrirCrearCliente = () => { setPersonaSeleccionada(null); setFormCliente(emptyCliente); setDialogCliente(true); };

  const abrirEditarCliente = (p: PersonaResponse) => {
    setPersonaSeleccionada(p);
    setFormCliente({
      persona: {
        nombre: p.nombre, razonSocial: p.razonSocial ?? '',
        cuit: p.cuit ?? '', dni: p.dni ?? '',
        condicionIVA: p.condicionIVA, domicilio: p.domicilio ?? '',
        email: p.email ?? '', telefono: p.telefono ?? '',
      },
      listaPrecios: 1, descuentoHabitual: 0,
      crearCuentaCorriente: false, limiteCredito: 0,
    });
    setDialogCliente(true);
  };

  const abrirCrearEmpleado = () => { setPersonaSeleccionada(null); setFormEmpleado(emptyEmpleado); setDialogEmpleado(true); };

  const handleGuardarCliente = async () => {
    setSaving(true);
    try {
      if (personaSeleccionada) {
        await editarCliente(personaSeleccionada.id, formCliente);
      } else {
        await crearCliente(formCliente);
      }
      setDialogCliente(false);
      cargar();
    } catch {
      setError('Error al guardar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarEmpleado = async () => {
    setSaving(true);
    try {
      await crearEmpleado(formEmpleado);
      setDialogEmpleado(false);
      cargar();
    } catch {
      setError('Error al guardar empleado');
    } finally {
      setSaving(false);
    }
  };

  const handleBajaEmpleado = async (id: number) => {
    if (!confirm('¿Dar de baja a este empleado?')) return;
    try {
      await darBajaEmpleado(id);
      cargar();
    } catch {
      setError('Error al dar de baja');
    }
  };

  const updatePersonaCliente = (field: keyof PersonaRequest, value: string) => {
    setFormCliente((f: ClienteRequest) => ({ ...f, persona: { ...f.persona, [field]: value } }));
  };

  const updatePersonaEmpleado = (field: keyof PersonaRequest, value: string) => {
    setFormEmpleado((f: EmpleadoRequest) => ({ ...f, persona: { ...f.persona, [field]: value } }));
  };

  const totalClientes = personas.filter(p => p.esCliente).length;
  const totalEmpleados = personas.filter(p => p.esEmpleado).length;

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#2C2C2A', letterSpacing: '-0.3px' }}>
            Personas
          </Typography>
          <Typography variant="body2" sx={{ color: '#888780', mt: 0.5 }}>
            Clientes y empleados del negocio
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<BadgeOutlinedIcon />}
            onClick={abrirCrearEmpleado}
            sx={{
              borderColor: '#E3E1DB', borderRadius: 2,
              color: '#3C3B38', fontWeight: 600,
              '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG },
            }}
          >
            Nuevo empleado
          </Button>
          <Button
            variant="contained" disableElevation
            startIcon={<AddIcon />}
            onClick={abrirCrearCliente}
            sx={{
              bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 2.5,
              '&:hover': { bgcolor: '#2E4A7A' },
            }}
          >
            Nuevo cliente
          </Button>
        </Box>
      </Box>

      {/* Métricas rápidas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total personas', value: personas.length, icon: <PeopleOutlinedIcon sx={{ fontSize: 18 }} />, color: ACCENT, bg: ACCENT_BG },
          { label: 'Clientes', value: totalClientes, icon: <PeopleOutlinedIcon sx={{ fontSize: 18 }} />, color: '#2E7D32', bg: '#E8F5E9' },
          { label: 'Empleados', value: totalEmpleados, icon: <BadgeOutlinedIcon sx={{ fontSize: 18 }} />, color: '#6A1B9A', bg: '#F3E5F5' },
        ].map((m) => (
          <Grid size={{ xs: 12, sm: 4 }} key={m.label}>
            <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' } }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', color: '#888780', fontWeight: 500 }}>{m.label}</Typography>
                  <Typography sx={{ fontSize: '1.8rem', fontWeight: 700, color: '#2C2C2A', lineHeight: 1.2, mt: 0.5 }}>
                    {loading ? '...' : m.value}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: m.bg, color: m.color, borderRadius: 2, p: 1, display: 'flex' }}>
                  {m.icon}
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Búsqueda */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <TextField
          size="small" placeholder="Buscar por nombre, CUIT o DNI..."
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && cargar()}
          sx={{ flex: 1, ...fieldSx }}
          slotProps={{ input: { startAdornment: <SearchOutlinedIcon sx={{ fontSize: 18, color: '#B4B2A9', mr: 0.5 }} /> } }}
        />
        <Button
          variant="outlined" onClick={cargar}
          sx={{
            borderColor: '#E3E1DB', borderRadius: 2, color: '#3C3B38', fontWeight: 500, px: 2,
            '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG },
          }}
        >
          Buscar
        </Button>
      </Box>

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
        <Tab value="todos" label={`Todos (${personas.length})`} />
        <Tab value="clientes" label={`Clientes (${totalClientes})`} />
        <Tab value="empleados" label={`Empleados (${totalEmpleados})`} />
      </Tabs>

      {/* Tabla */}
      <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
            <CircularProgress size={28} sx={{ color: ACCENT }} />
            <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>Cargando personas...</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F4F3F1' }}>
                {['Nombre', 'CUIT / DNI', 'Contacto', 'Roles', 'Acciones'].map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 700, color: '#888780', fontSize: '0.8rem', letterSpacing: '0.3px', py: 1.5 }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {personasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
                      <PeopleOutlinedIcon sx={{ fontSize: 40, color: '#D3D1C7' }} />
                      <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>No hay personas</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                personasFiltradas.map((p) => (
                  <TableRow key={p.id} sx={{
                    '&:hover': { bgcolor: '#FAFAF9' },
                    '& td': { borderBottom: '1px solid #F0EEE8' },
                  }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                          width: 34, height: 34, borderRadius: '50%',
                          bgcolor: p.esEmpleado ? '#F3E5F5' : ACCENT_BG,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: p.esEmpleado ? '#6A1B9A' : ACCENT }}>
                            {p.nombre?.[0]?.toUpperCase()}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#2C2C2A' }}>{p.nombre}</Typography>
                          {p.razonSocial && (
                            <Typography sx={{ fontSize: '0.75rem', color: '#B4B2A9' }}>{p.razonSocial}</Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', color: '#5F5E5A', fontFamily: 'monospace' }}>
                        {p.cuit ? `CUIT ${p.cuit}` : p.dni ? `DNI ${p.dni}` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.85rem', color: '#888780' }}>
                        {p.email ?? p.telefono ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {p.esCliente && (
                          <Chip label="Cliente" size="small" sx={{ bgcolor: ACCENT_BG, color: ACCENT, fontWeight: 600, fontSize: '0.72rem', height: 20, borderRadius: 1, border: 'none' }} />
                        )}
                        {p.esEmpleado && (
                          <Chip label="Empleado" size="small" sx={{ bgcolor: '#F3E5F5', color: '#6A1B9A', fontWeight: 600, fontSize: '0.72rem', height: 20, borderRadius: 1, border: 'none' }} />
                        )}
                        {p.tieneCuentaCorriente && (
                          <Chip label="CC" size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600, fontSize: '0.72rem', height: 20, borderRadius: 1, border: 'none' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {p.esCliente && (
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => abrirEditarCliente(p)}
                              sx={{ color: '#888780', '&:hover': { color: ACCENT, bgcolor: ACCENT_BG } }}>
                              <EditOutlinedIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {p.esEmpleado && (
                          <Tooltip title="Dar de baja">
                            <IconButton size="small" onClick={() => handleBajaEmpleado(p.id)}
                              sx={{ color: '#888780', '&:hover': { color: '#C62828', bgcolor: '#FFEBEE' } }}>
                              <PersonOffOutlinedIcon sx={{ fontSize: 16 }} />
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

      {/* Dialog — Cliente */}
      <Dialog open={dialogCliente} onClose={() => setDialogCliente(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
          {personaSeleccionada ? 'Editar cliente' : 'Nuevo cliente'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Nombre *" value={formCliente.persona.nombre} sx={fieldSx}
                onChange={(e) => updatePersonaCliente('nombre', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Razón social" value={formCliente.persona.razonSocial} sx={fieldSx}
                onChange={(e) => updatePersonaCliente('razonSocial', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="CUIT" value={formCliente.persona.cuit} sx={fieldSx}
                onChange={(e) => updatePersonaCliente('cuit', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="DNI" value={formCliente.persona.dni} sx={fieldSx}
                onChange={(e) => updatePersonaCliente('dni', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Condición IVA *</InputLabel>
                <Select label="Condición IVA *" value={formCliente.persona.condicionIVA}
                  sx={{ borderRadius: 2 }}
                  onChange={(e) => updatePersonaCliente('condicionIVA', e.target.value)}>
                  {CONDICION_IVA_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Email" value={formCliente.persona.email} sx={fieldSx}
                onChange={(e) => updatePersonaCliente('email', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Teléfono" value={formCliente.persona.telefono} sx={fieldSx}
                onChange={(e) => updatePersonaCliente('telefono', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Domicilio" value={formCliente.persona.domicilio} sx={fieldSx}
                onChange={(e) => updatePersonaCliente('domicilio', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Lista de precios" type="number" sx={fieldSx}
                value={formCliente.listaPrecios}
                onChange={(e) => setFormCliente((f: ClienteRequest) => ({ ...f, listaPrecios: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Descuento habitual (%)" type="number" sx={fieldSx}
                value={formCliente.descuentoHabitual}
                onChange={(e) => setFormCliente((f: ClienteRequest) => ({ ...f, descuentoHabitual: Number(e.target.value) }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formCliente.crearCuentaCorriente}
                    onChange={(e) => setFormCliente((f: ClienteRequest) => ({ ...f, crearCuentaCorriente: e.target.checked }))}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: ACCENT }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT } }}
                  />
                }
                label="Crear cuenta corriente"
              />
            </Grid>
            {formCliente.crearCuentaCorriente && (
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth size="small" label="Límite de crédito" type="number" sx={fieldSx}
                  value={formCliente.limiteCredito}
                  onChange={(e) => setFormCliente((f: ClienteRequest) => ({ ...f, limiteCredito: Number(e.target.value) }))} />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogCliente(false)} sx={{ color: '#888780', borderRadius: 2 }}>Cancelar</Button>
          <Button variant="contained" disableElevation onClick={handleGuardarCliente} disabled={saving}
            sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#2E4A7A' } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Empleado */}
      <Dialog open={dialogEmpleado} onClose={() => setDialogEmpleado(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>Nuevo empleado</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Nombre *" value={formEmpleado.persona.nombre} sx={fieldSx}
                onChange={(e) => updatePersonaEmpleado('nombre', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="CUIT" value={formEmpleado.persona.cuit} sx={fieldSx}
                onChange={(e) => updatePersonaEmpleado('cuit', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="DNI" value={formEmpleado.persona.dni} sx={fieldSx}
                onChange={(e) => updatePersonaEmpleado('dni', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Condición IVA *</InputLabel>
                <Select label="Condición IVA *" value={formEmpleado.persona.condicionIVA}
                  sx={{ borderRadius: 2 }}
                  onChange={(e) => updatePersonaEmpleado('condicionIVA', e.target.value)}>
                  {CONDICION_IVA_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Legajo" value={formEmpleado.legajo} sx={fieldSx}
                onChange={(e) => setFormEmpleado((f: EmpleadoRequest) => ({ ...f, legajo: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Cargo" value={formEmpleado.cargo} sx={fieldSx}
                onChange={(e) => setFormEmpleado((f: EmpleadoRequest) => ({ ...f, cargo: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Fecha de ingreso *" type="date" sx={fieldSx}
                value={formEmpleado.fechaIngreso}
                onChange={(e) => setFormEmpleado((f: EmpleadoRequest) => ({ ...f, fechaIngreso: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Email" value={formEmpleado.persona.email} sx={fieldSx}
                onChange={(e) => updatePersonaEmpleado('email', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth size="small" label="Teléfono" value={formEmpleado.persona.telefono} sx={fieldSx}
                onChange={(e) => updatePersonaEmpleado('telefono', e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formEmpleado.crearCuentaCorriente}
                    onChange={(e) => setFormEmpleado((f: EmpleadoRequest) => ({ ...f, crearCuentaCorriente: e.target.checked }))}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: ACCENT }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ACCENT } }}
                  />
                }
                label="Crear cuenta corriente"
              />
            </Grid>
            {formEmpleado.crearCuentaCorriente && (
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth size="small" label="Límite de crédito" type="number" sx={fieldSx}
                  value={formEmpleado.limiteCredito}
                  onChange={(e) => setFormEmpleado((f: EmpleadoRequest) => ({ ...f, limiteCredito: Number(e.target.value) }))} />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogEmpleado(false)} sx={{ color: '#888780', borderRadius: 2 }}>Cancelar</Button>
          <Button variant="contained" disableElevation onClick={handleGuardarEmpleado} disabled={saving}
            sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 3, '&:hover': { bgcolor: '#2E4A7A' } }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}