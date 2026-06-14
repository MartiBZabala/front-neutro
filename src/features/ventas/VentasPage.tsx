import { useState } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Button,
    Grid, IconButton, Divider, Alert, Chip, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { useVenta } from './useVenta';
import { buscarProductos, agregarItem } from '../../api/ventaApi';
import type { ProductoResponse } from '../../types/producto';
import type { MedioPago } from '../../types/medioPago';
import { MEDIOS_PAGO } from '../../types/medioPago';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

export default function VentasPage() {
    const { venta, loading, error, iniciar, cobrar, reset } = useVenta();
    const [busqueda, setBusqueda] = useState('');
    const [productos, setProductos] = useState<ProductoResponse[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [medioSeleccionado, setMedioSeleccionado] = useState<MedioPago>('EFECTIVO');

    const handleBuscar = async () => {
        if (!busqueda.trim()) return;
        setBuscando(true);
        try {
            const res = await buscarProductos(busqueda);
            setProductos(res.data.data);
        } finally {
            setBuscando(false);
        }
    };

    const handleAgregarProducto = async (producto: ProductoResponse) => {
        let ventaActual = venta;
        if (!ventaActual) {
            ventaActual = await iniciar();
            if (!ventaActual) return;
        }
        await agregarItem(ventaActual.id, { productoId: producto.id, cantidad: 1 });
    };

    const handleCobrar = async () => {
        await cobrar(medioSeleccionado, true);
    };

    const totalItems = venta?.items.reduce((acc, i) => acc + i.cantidad, 0) ?? 0;

    return (
        <Box>
            {/* Encabezado */}
            <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#2C2C2A', letterSpacing: '-0.3px' }}>
                    Nueva venta
                </Typography>
                <Typography variant="body2" sx={{ color: '#888780', mt: 0.5 }}>
                    Buscá productos y seleccioná el medio de pago
                </Typography>
            </Box>

            <Grid container spacing={2} sx={{ height: '100%' }}>
                {/* Panel izquierdo */}
                <Grid size={{ xs: 12, md: 7 }}>
                    <Card elevation={0} sx={{
                        border: '1px solid #E3E1DB',
                        borderRadius: 3,
                        height: '100%',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
                    }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                                <Box sx={{ bgcolor: ACCENT_BG, borderRadius: 1.5, p: 0.75, display: 'flex' }}>
                                    <ShoppingCartOutlinedIcon sx={{ fontSize: 18, color: ACCENT }} />
                                </Box>
                                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A' }}>
                                    Buscar producto
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Nombre o código de barras..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            bgcolor: '#FAFAF9',
                                            '&:hover fieldset': { borderColor: ACCENT },
                                            '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1 },
                                        },
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    disableElevation
                                    onClick={handleBuscar}
                                    disabled={buscando}
                                    sx={{
                                        px: 2, minWidth: 48, borderRadius: 2,
                                        bgcolor: ACCENT, '&:hover': { bgcolor: '#2E4A7A' },
                                    }}
                                >
                                    {buscando ? <CircularProgress size={18} color="inherit" /> : <SearchIcon fontSize="small" />}
                                </Button>
                            </Box>

                            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                            {productos.length === 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
                                    <ShoppingCartOutlinedIcon sx={{ fontSize: 36, color: '#D3D1C7' }} />
                                    <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>
                                        Buscá un producto para agregarlo
                                    </Typography>
                                </Box>
                            ) : (
                                productos.map((p) => (
                                    <Box
                                        key={p.id}
                                        sx={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            py: 1.5, px: 1, borderRadius: 2, mb: 0.5,
                                            borderBottom: '1px solid #F0EEE8',
                                            transition: 'bgcolor 0.15s',
                                            '&:hover': { bgcolor: '#FAFAF9' },
                                        }}
                                    >
                                        <Box>
                                            <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#2C2C2A' }}>
                                                {p.nombre}
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.82rem', color: '#888780', mt: 0.25 }}>
                                                ${p.precioLista1?.toLocaleString('es-AR')} · Stock: {p.stockActual}
                                            </Typography>
                                        </Box>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleAgregarProducto(p)}
                                            disabled={loading || p.stockActual === 0}
                                            sx={{
                                                borderColor: ACCENT, color: ACCENT, borderRadius: 2,
                                                fontWeight: 600, fontSize: '0.82rem',
                                                '&:hover': { bgcolor: ACCENT_BG, borderColor: ACCENT },
                                            }}
                                        >
                                            + Agregar
                                        </Button>
                                    </Box>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Panel derecho */}
                <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Cliente */}
                    <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <Box sx={{ bgcolor: ACCENT_BG, borderRadius: 1.5, p: 0.75, display: 'flex' }}>
                                    <PersonOutlinedIcon sx={{ fontSize: 18, color: ACCENT }} />
                                </Box>
                                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A' }}>
                                    Cliente{' '}
                                    <Typography component="span" sx={{ fontWeight: 400, fontSize: '0.85rem', color: '#B4B2A9' }}>
                                        (opcional)
                                    </Typography>
                                </Typography>
                            </Box>
                            <TextField
                                fullWidth size="small"
                                placeholder="Buscar por nombre o DNI..."
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2, bgcolor: '#FAFAF9',
                                        '&:hover fieldset': { borderColor: ACCENT },
                                        '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1 },
                                    },
                                }}
                            />
                        </CardContent>
                    </Card>

                    {/* Carrito */}
                    <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, flex: 1 }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ bgcolor: ACCENT_BG, borderRadius: 1.5, p: 0.75, display: 'flex' }}>
                                        <ReceiptOutlinedIcon sx={{ fontSize: 18, color: ACCENT }} />
                                    </Box>
                                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A' }}>
                                        Carrito
                                    </Typography>
                                </Box>
                                {totalItems > 0 && (
                                    <Chip
                                        label={`${totalItems} ítem${totalItems > 1 ? 's' : ''}`}
                                        size="small"
                                        sx={{
                                            bgcolor: ACCENT_BG, color: ACCENT,
                                            fontWeight: 600, fontSize: '0.75rem',
                                            height: 22, borderRadius: 1.5,
                                        }}
                                    />
                                )}
                            </Box>

                            {!venta || venta.items.length === 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1 }}>
                                    <ReceiptOutlinedIcon sx={{ fontSize: 32, color: '#D3D1C7' }} />
                                    <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>
                                        Sin productos aún
                                    </Typography>
                                </Box>
                            ) : (
                                <>
                                    {venta.items.map((item) => (
                                        <Box key={item.id} sx={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            py: 1.2, px: 1, borderRadius: 2, mb: 0.5,
                                            borderBottom: '1px solid #F0EEE8',
                                            '&:hover': { bgcolor: '#FAFAF9' },
                                        }}>
                                            <Typography sx={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: '#2C2C2A' }}>
                                                {item.nombreProducto}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <IconButton size="small" sx={{
                                                    border: '1px solid #E3E1DB', borderRadius: 1.5, p: 0.3,
                                                    '&:hover': { bgcolor: ACCENT_BG, borderColor: ACCENT },
                                                }}>
                                                    <RemoveIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                                <Typography sx={{ mx: 0.75, minWidth: 20, textAlign: 'center', fontWeight: 600, fontSize: '0.9rem' }}>
                                                    {item.cantidad}
                                                </Typography>
                                                <IconButton size="small" sx={{
                                                    border: '1px solid #E3E1DB', borderRadius: 1.5, p: 0.3,
                                                    '&:hover': { bgcolor: ACCENT_BG, borderColor: ACCENT },
                                                }}>
                                                    <AddIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                                <Typography sx={{ fontWeight: 700, ml: 1, minWidth: 64, textAlign: 'right', fontSize: '0.9rem', color: '#2C2C2A' }}>
                                                    ${item.subtotal.toLocaleString('es-AR')}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ))}

                                    <Box sx={{ mt: 2, px: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography sx={{ fontSize: '0.875rem', color: '#888780' }}>Subtotal</Typography>
                                            <Typography sx={{ fontSize: '0.875rem', color: '#2C2C2A' }}>${venta.subtotal?.toLocaleString('es-AR')}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography sx={{ fontSize: '0.875rem', color: '#888780' }}>IVA</Typography>
                                            <Typography sx={{ fontSize: '0.875rem', color: '#2C2C2A' }}>${venta.totalIva?.toLocaleString('es-AR')}</Typography>
                                        </Box>
                                        <Divider sx={{ my: 1.5, borderColor: '#E3E1DB' }} />
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#2C2C2A' }}>Total</Typography>
                                            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: ACCENT }}>
                                                ${venta.total?.toLocaleString('es-AR')}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Medio de pago */}
                    <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3 }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A', mb: 1.5 }}>
                                Medio de pago
                            </Typography>
                            <Grid container spacing={1} sx={{ mb: 2 }}>
                                {MEDIOS_PAGO.map((m) => (
                                    <Grid size={{ xs: 6 }} key={m.value}>
                                        <Button
                                            fullWidth
                                            variant={medioSeleccionado === m.value ? 'contained' : 'outlined'}
                                            disableElevation
                                            onClick={() => setMedioSeleccionado(m.value)}
                                            sx={{
                                                borderRadius: 2,
                                                borderColor: medioSeleccionado === m.value ? ACCENT : '#E3E1DB',
                                                bgcolor: medioSeleccionado === m.value ? ACCENT : '#FAFAF9',
                                                color: medioSeleccionado === m.value ? '#fff' : '#3C3B38',
                                                fontWeight: medioSeleccionado === m.value ? 600 : 400,
                                                py: 1,
                                                fontSize: '0.85rem',
                                                transition: 'all 0.15s',
                                                '&:hover': {
                                                    bgcolor: medioSeleccionado === m.value ? '#2E4A7A' : ACCENT_BG,
                                                    borderColor: ACCENT,
                                                    color: medioSeleccionado === m.value ? '#fff' : ACCENT,
                                                },
                                            }}
                                        >
                                            {m.label}
                                        </Button>
                                    </Grid>
                                ))}
                            </Grid>

                            <Button
                                fullWidth variant="contained" disableElevation
                                disabled={loading || !venta || venta.items.length === 0}
                                onClick={handleCobrar}
                                sx={{
                                    py: 1.5, borderRadius: 2,
                                    bgcolor: ACCENT, fontSize: '1rem', fontWeight: 700,
                                    letterSpacing: '0.2px',
                                    '&:hover': { bgcolor: '#2E4A7A' },
                                    '&.Mui-disabled': { bgcolor: '#E3E1DB', color: '#B4B2A9' },
                                }}
                            >
                                {loading
                                    ? <CircularProgress size={20} color="inherit" />
                                    : `Cobrar $${venta?.total?.toLocaleString('es-AR') ?? '0'}`
                                }
                            </Button>

                            {venta && venta.estado !== 'EN_CURSO' && (
                                <Button
                                    fullWidth variant="outlined"
                                    onClick={reset}
                                    sx={{
                                        mt: 1, borderRadius: 2,
                                        borderColor: '#E3E1DB', color: '#888780',
                                        '&:hover': { borderColor: ACCENT, color: ACCENT, bgcolor: ACCENT_BG },
                                    }}
                                >
                                    Nueva venta
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}