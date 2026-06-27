import React, { useState, useEffect } from 'react';
import {
    Box, Card, Typography, Button, Grid, Chip, CircularProgress,
    Table, TableHead, TableRow, TableCell, TableBody, Alert,
    TextField, Collapse, TablePagination,
} from '@mui/material';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import type { VentaResponse } from '../../types/venta';
import { listarVentas } from '../../api/ventaApi';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

const MEDIO_LABEL: Record<string, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA_DEBITO: 'Débito',
    TARJETA_CREDITO: 'Crédito',
    TRANSFERENCIA: 'Transferencia',
    CUENTA_CORRIENTE: 'Cta. Corriente',
};

const MEDIO_COLOR: Record<string, { color: string; bg: string }> = {
    EFECTIVO:         { color: '#2E7D32', bg: '#E8F5E9' },
    TARJETA_DEBITO:   { color: ACCENT,    bg: ACCENT_BG },
    TARJETA_CREDITO:  { color: '#6A1B9A', bg: '#F3E5F5' },
    TRANSFERENCIA:    { color: '#E65100', bg: '#FFF3E0' },
    CUENTA_CORRIENTE: { color: '#888780', bg: '#F5F5F5' },
};

const ESTADO_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    EN_CURSO:       { label: 'En curso',  color: '#E65100', bg: '#FFF3E0' },
    PENDIENTE_PAGO: { label: 'Pendiente', color: '#F59E0B', bg: '#FFF8E1' },
    PAGADA:         { label: 'Pagada',    color: '#2E7D32', bg: '#E8F5E9' },
    CC_CARGADA:     { label: 'Cta. Cte.', color: ACCENT,    bg: ACCENT_BG },
    ANULADA:        { label: 'Anulada',   color: '#C62828', bg: '#FFEBEE' },
    CANCELADA:      { label: 'Cancelada', color: '#888780', bg: '#F5F5F5' },
};

const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2, bgcolor: '#FAFAF9',
        '&:hover fieldset': { borderColor: ACCENT },
        '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1 },
    },
};

export default function VentasPage() {
    const [ventas, setVentas] = useState<VentaResponse[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandida, setExpandida] = useState<number | null>(null);
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');

    // Paginación
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // Filtros aplicados (los que están en el back)
    const [filtrosAplicados, setFiltrosAplicados] = useState({ desde: '', hasta: '' });

    const cargar = async (desdeVal: string, hastaVal: string, pag: number, size: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = await listarVentas(
                desdeVal ? desdeVal + 'T00:00:00' : undefined,
                hastaVal ? hastaVal + 'T23:59:59' : undefined,
                pag,
                size,
            );
            setVentas(res.data.data.content);
            setTotalElements(res.data.data.totalElements);
        } catch {
            setError('Error al cargar ventas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await listarVentas(undefined, undefined, 0, 50);
                setVentas(res.data.data.content);
                setTotalElements(res.data.data.totalElements);
            } catch {
                setError('Error al cargar ventas');
            } finally {
                setLoading(false);
            }
        };
        void init();
    }, []);

    const handleBuscar = () => {
        setPage(0);
        setExpandida(null);
        setFiltrosAplicados({ desde, hasta });
        void cargar(desde, hasta, 0, rowsPerPage);
    };

    const handleLimpiar = () => {
        setDesde('');
        setHasta('');
        setPage(0);
        setExpandida(null);
        setFiltrosAplicados({ desde: '', hasta: '' });
        void cargar('', '', 0, rowsPerPage);
    };

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
        setExpandida(null);
        void cargar(filtrosAplicados.desde, filtrosAplicados.hasta, newPage, rowsPerPage);
    };

    const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const size = parseInt(e.target.value, 10);
        setRowsPerPage(size);
        setPage(0);
        void cargar(filtrosAplicados.desde, filtrosAplicados.hasta, 0, size);
    };

    const ventasCobradas = ventas.filter(v => v.estado === 'PAGADA');
    const totalMonto = ventasCobradas.reduce((acc, v) => acc + (v.total ?? 0), 0);

    return (
        <Box>
            {/* Encabezado */}
            <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#2C2C2A', letterSpacing: '-0.3px' }}>
                    Ventas
                </Typography>
                <Typography variant="body2" sx={{ color: '#888780', mt: 0.5 }}>
                    Historial de transacciones
                </Typography>
            </Box>

            {/* Métricas — sobre la página actual */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Cobradas (esta página)', value: loading ? '...' : ventasCobradas.length, color: '#2E7D32', bg: '#E8F5E9' },
                    { label: 'Total (esta página)', value: loading ? '...' : `$${Number(totalMonto).toLocaleString('es-AR')}`, color: ACCENT, bg: ACCENT_BG },
                    { label: 'Total en período', value: loading ? '...' : totalElements.toLocaleString('es-AR'), color: '#5F5E5A', bg: '#F4F3F1' },
                ].map((m) => (
                    <Grid size={{ xs: 12, sm: 4 }} key={m.label}>
                        <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' } }}>
                            <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography sx={{ fontSize: '0.82rem', color: '#888780', fontWeight: 500 }}>{m.label}</Typography>
                                    <Typography sx={{ fontSize: '1.8rem', fontWeight: 700, color: '#2C2C2A', lineHeight: 1.2, mt: 0.5 }}>
                                        {m.value}
                                    </Typography>
                                </Box>
                                <Box sx={{ bgcolor: m.bg, color: m.color, borderRadius: 2, p: 1, display: 'flex' }}>
                                    <ReceiptOutlinedIcon sx={{ fontSize: 18 }} />
                                </Box>
                            </Box>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Filtros */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField size="small" type="date" label="Desde" value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                    slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
                <TextField size="small" type="date" label="Hasta" value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                    slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
                <Button variant="contained" disableElevation onClick={handleBuscar}
                    startIcon={<SearchOutlinedIcon />}
                    sx={{ bgcolor: ACCENT, borderRadius: 2, fontWeight: 600, px: 2.5, '&:hover': { bgcolor: '#2E4A7A' } }}>
                    Buscar
                </Button>
                {(desde || hasta) && (
                    <Button onClick={handleLimpiar} sx={{ color: '#888780', borderRadius: 2 }}>
                        Limpiar
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {/* Tabla */}
            <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, overflow: 'hidden' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
                        <CircularProgress size={28} sx={{ color: ACCENT }} />
                        <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>Cargando ventas...</Typography>
                    </Box>
                ) : (
                    <>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#F4F3F1' }}>
                                    {['#', 'Fecha y hora', 'Cliente', 'Productos', 'Medio de pago', 'Total', 'Estado', ''].map((col) => (
                                        <TableCell key={col} sx={{ fontWeight: 700, color: '#888780', fontSize: '0.8rem', letterSpacing: '0.3px', py: 1.5 }}>
                                            {col}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ventas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 1 }}>
                                                <ReceiptOutlinedIcon sx={{ fontSize: 40, color: '#D3D1C7' }} />
                                                <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>No hay ventas en el período</Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : ventas.map((v) => (
                                    <React.Fragment key={v.id}>
                                        <TableRow
                                            onClick={() => setExpandida(expandida === v.id ? null : v.id)}
                                            sx={{
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: '#FAFAF9' },
                                                '& td': { borderBottom: expandida === v.id ? 'none' : '1px solid #F0EEE8' },
                                                bgcolor: expandida === v.id ? '#FAFAF9' : 'transparent',
                                            }}>
                                            <TableCell>
                                                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: ACCENT, fontFamily: 'monospace' }}>
                                                    #{v.id}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontSize: '0.82rem', color: '#888780' }}>
                                                    {new Date(v.fechaHora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontSize: '0.85rem', color: v.nombrePersona ? '#2C2C2A' : '#B4B2A9', fontWeight: v.nombrePersona ? 500 : 400 }}>
                                                    {v.nombrePersona ?? 'Consumidor final'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontSize: '0.85rem', color: '#5F5E5A' }}>
                                                    {v.items?.reduce((acc, i) => acc + i.cantidad, 0) ?? 0} unid. · {v.items?.length ?? 0} ítem{(v.items?.length ?? 0) !== 1 ? 's' : ''}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                    {v.pagos?.map((p, i) => {
                                                        const style = MEDIO_COLOR[p.medio] ?? { color: '#888780', bg: '#F5F5F5' };
                                                        return (
                                                            <Chip key={i} label={MEDIO_LABEL[p.medio] ?? p.medio} size="small"
                                                                sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600, fontSize: '0.72rem', height: 20, borderRadius: 1, border: 'none' }} />
                                                        );
                                                    })}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#2C2C2A' }}>
                                                    ${Number(v.total).toLocaleString('es-AR')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={ESTADO_STYLE[v.estado]?.label ?? v.estado} size="small"
                                                    sx={{
                                                        bgcolor: ESTADO_STYLE[v.estado]?.bg ?? '#F5F5F5',
                                                        color: ESTADO_STYLE[v.estado]?.color ?? '#888780',
                                                        fontWeight: 600, fontSize: '0.72rem',
                                                        height: 22, borderRadius: 1.5, border: 'none',
                                                    }} />
                                            </TableCell>
                                            <TableCell>
                                                {expandida === v.id
                                                    ? <ExpandLessOutlinedIcon sx={{ fontSize: 18, color: '#B4B2A9' }} />
                                                    : <ExpandMoreOutlinedIcon sx={{ fontSize: 18, color: '#B4B2A9' }} />
                                                }
                                            </TableCell>
                                        </TableRow>

                                        {expandida === v.id && (
                                            <TableRow>
                                                <TableCell colSpan={8} sx={{ p: 0, borderBottom: '1px solid #F0EEE8' }}>
                                                    <Collapse in={true}>
                                                        <Box sx={{ p: 2, bgcolor: '#F9F9F8', borderTop: '1px solid #F0EEE8' }}>
                                                            <Grid container spacing={2}>
                                                                <Grid size={{ xs: 12, md: 7 }}>
                                                                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#888780', mb: 1, letterSpacing: '0.3px' }}>
                                                                        PRODUCTOS
                                                                    </Typography>
                                                                    {v.items?.map((item) => (
                                                                        <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #F0EEE8' }}>
                                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                                <Chip label={item.cantidad} size="small"
                                                                                    sx={{ bgcolor: ACCENT_BG, color: ACCENT, fontWeight: 700, fontSize: '0.72rem', height: 18, borderRadius: 1, border: 'none', minWidth: 24 }} />
                                                                                <Typography sx={{ fontSize: '0.85rem', color: '#2C2C2A' }}>{item.nombreProducto}</Typography>
                                                                            </Box>
                                                                            <Box sx={{ textAlign: 'right' }}>
                                                                                <Typography sx={{ fontSize: '0.82rem', color: '#888780' }}>
                                                                                    ${Number(item.precioUnitario).toLocaleString('es-AR')} c/u
                                                                                </Typography>
                                                                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#2C2C2A' }}>
                                                                                    ${Number(item.subtotal).toLocaleString('es-AR')}
                                                                                </Typography>
                                                                            </Box>
                                                                        </Box>
                                                                    ))}
                                                                </Grid>
                                                                <Grid size={{ xs: 12, md: 5 }}>
                                                                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#888780', mb: 1, letterSpacing: '0.3px' }}>
                                                                        RESUMEN
                                                                    </Typography>
                                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                            <Typography sx={{ fontSize: '0.85rem', color: '#888780' }}>Subtotal</Typography>
                                                                            <Typography sx={{ fontSize: '0.85rem', color: '#2C2C2A' }}>${Number(v.subtotal).toLocaleString('es-AR')}</Typography>
                                                                        </Box>
                                                                        {v.descuentoMonto > 0 && (
                                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                <Typography sx={{ fontSize: '0.85rem', color: '#2E7D32' }}>Descuento</Typography>
                                                                                <Typography sx={{ fontSize: '0.85rem', color: '#2E7D32' }}>-${Number(v.descuentoMonto).toLocaleString('es-AR')}</Typography>
                                                                            </Box>
                                                                        )}
                                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                            <Typography sx={{ fontSize: '0.85rem', color: '#888780' }}>IVA</Typography>
                                                                            <Typography sx={{ fontSize: '0.85rem', color: '#2C2C2A' }}>${Number(v.totalIva).toLocaleString('es-AR')}</Typography>
                                                                        </Box>
                                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5, borderTop: '1px solid #E3E1DB', mt: 0.5 }}>
                                                                            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#2C2C2A' }}>Total</Typography>
                                                                            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: ACCENT }}>${Number(v.total).toLocaleString('es-AR')}</Typography>
                                                                        </Box>
                                                                    </Box>
                                                                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#888780', mt: 2, mb: 1, letterSpacing: '0.3px' }}>
                                                                        PAGOS
                                                                    </Typography>
                                                                    {v.pagos?.map((p, i) => {
                                                                        const style = MEDIO_COLOR[p.medio] ?? { color: '#888780', bg: '#F5F5F5' };
                                                                        return (
                                                                            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                                                                                <Chip label={MEDIO_LABEL[p.medio] ?? p.medio} size="small"
                                                                                    sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600, fontSize: '0.72rem', height: 20, borderRadius: 1, border: 'none' }} />
                                                                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#2C2C2A' }}>
                                                                                    ${Number(p.monto).toLocaleString('es-AR')}
                                                                                </Typography>
                                                                            </Box>
                                                                        );
                                                                    })}
                                                                </Grid>
                                                            </Grid>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
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
        </Box>
    );
}
