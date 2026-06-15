import { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box, Chip, CircularProgress } from '@mui/material';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import { useNavigate } from 'react-router-dom';
import { listarVentas } from '../../api/ventaApi';
import { listarProductos } from '../../api/productoApi';
import type { VentaResponse } from '../../types/venta';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

const quickAccess = [
  { label: 'Productos', path: '/productos', icon: <InventoryOutlinedIcon sx={{ fontSize: 20 }} /> },
  { label: 'Personas',  path: '/personas',  icon: <PeopleOutlinedIcon sx={{ fontSize: 20 }} /> },
  { label: 'Ventas',    path: '/ventas',    icon: <ReceiptOutlinedIcon sx={{ fontSize: 20 }} /> },
  { label: 'Reportes',  path: '/reportes',  icon: <BarChartOutlinedIcon sx={{ fontSize: 20 }} /> },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ventasHoy, setVentasHoy] = useState<VentaResponse[]>([]);
  const [stockBajo, setStockBajo] = useState(0);

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    void Promise.all([
      listarVentas(`${hoy}T00:00:00`, `${hoy}T23:59:59`, 0, 100),
      listarProductos(undefined, undefined, 0, 200),
    ]).then(([ventasRes, prodRes]) => {
      setVentasHoy(ventasRes.data.data.content);
      setStockBajo(prodRes.data.data.content.filter((p) => p.stockBajo).length);
    }).finally(() => setLoading(false));
  }, []);

  const ventasCobradas = ventasHoy.filter(v => v.estado === 'PAGADA');
  const totalHoy = ventasCobradas.reduce((acc, v) => acc + Number(v.total ?? 0), 0);
  const ultimasVentas = [...ventasHoy]
    .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
    .slice(0, 5);

  const metrics = [
    {
      label: 'Recaudado hoy',
      value: loading ? '...' : `$${totalHoy.toLocaleString('es-AR')}`,
      sub: `${ventasCobradas.length} venta${ventasCobradas.length !== 1 ? 's' : ''} cobrada${ventasCobradas.length !== 1 ? 's' : ''}`,
      trend: 'up',
      icon: <TrendingUpOutlinedIcon sx={{ fontSize: 18 }} />,
    },
    {
      label: 'Transacciones hoy',
      value: loading ? '...' : ventasHoy.length,
      sub: 'Total del día',
      trend: 'up',
      icon: <TrendingUpOutlinedIcon sx={{ fontSize: 18 }} />,
    },
    {
      label: 'Productos con stock bajo',
      value: loading ? '...' : stockBajo,
      sub: stockBajo > 0 ? 'Requieren reposición' : 'Stock OK',
      trend: stockBajo > 0 ? 'down' : 'up',
      icon: stockBajo > 0
        ? <WarningAmberOutlinedIcon sx={{ fontSize: 18 }} />
        : <TrendingUpOutlinedIcon sx={{ fontSize: 18 }} />,
    },
    {
      label: 'Anuladas hoy',
      value: loading ? '...' : ventasHoy.filter(v => v.estado === 'ANULADA').length,
      sub: 'Del día actual',
      trend: ventasHoy.filter(v => v.estado === 'ANULADA').length > 0 ? 'down' : 'neutral',
      icon: <TrendingDownOutlinedIcon sx={{ fontSize: 18 }} />,
    },
  ];

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#2C2C2A', letterSpacing: '-0.3px' }}>
          Resumen del día
        </Typography>
        <Typography variant="body2" sx={{ color: '#888780', mt: 0.5 }}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Typography>
      </Box>

      {/* Métricas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {metrics.map((m) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={m.label}>
            <Card elevation={0} sx={{
              border: '1px solid #E3E1DB', bgcolor: 'background.paper',
              borderRadius: 3, transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.07)' },
            }}>
              <CardContent sx={{ pb: '20px !important', pt: 2.5, px: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#888780', letterSpacing: '0.2px' }}>
                    {m.label}
                  </Typography>
                  <Box sx={{
                    color: m.trend === 'up' ? '#2E7D32' : m.trend === 'down' ? '#C62828' : ACCENT,
                    bgcolor: m.trend === 'up' ? '#E8F5E9' : m.trend === 'down' ? '#FFEBEE' : ACCENT_BG,
                    borderRadius: 2, p: 0.5, display: 'flex', alignItems: 'center',
                  }}>
                    {m.icon}
                  </Box>
                </Box>
                <Typography sx={{ fontSize: '1.8rem', fontWeight: 700, color: '#2C2C2A', lineHeight: 1, mb: 1 }}>
                  {m.value}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: m.trend === 'up' ? '#2E7D32' : m.trend === 'down' ? '#C62828' : '#888780' }}>
                  {m.sub}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Fila inferior */}
      <Grid container spacing={2}>

        {/* Accesos rápidos */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: '#2C2C2A' }}>
                Accesos rápidos
              </Typography>
              <Grid container spacing={1.5}>
                {quickAccess.map((q) => (
                  <Grid size={{ xs: 6 }} key={q.label}>
                    <Box
                      onClick={() => navigate(q.path)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        border: '1px solid #E3E1DB', borderRadius: 2.5,
                        py: 1.5, px: 2, cursor: 'pointer',
                        bgcolor: '#FAFAF9', transition: 'all 0.15s',
                        '&:hover': {
                          bgcolor: ACCENT_BG, borderColor: ACCENT,
                          '& .acceso-label': { color: ACCENT },
                          '& .acceso-icon': { color: ACCENT },
                        },
                      }}
                    >
                      <Box className="acceso-icon" sx={{ color: '#888780', display: 'flex', transition: 'color 0.15s' }}>
                        {q.icon}
                      </Box>
                      <Typography className="acceso-label" sx={{ fontWeight: 500, fontSize: '0.95rem', color: '#3C3B38', transition: 'color 0.15s' }}>
                        {q.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Últimas ventas */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card elevation={0} sx={{ border: '1px solid #E3E1DB', borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#2C2C2A' }}>
                  Últimas ventas del día
                </Typography>
                <Chip label="Hoy" size="small"
                  sx={{ bgcolor: ACCENT_BG, color: ACCENT, fontWeight: 600, fontSize: '0.7rem', height: 22, borderRadius: 1.5 }} />
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} sx={{ color: ACCENT }} />
                </Box>
              ) : ultimasVentas.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 1 }}>
                  <ReceiptOutlinedIcon sx={{ fontSize: 36, color: '#D3D1C7' }} />
                  <Typography sx={{ color: '#B4B2A9', fontSize: '0.9rem' }}>Sin ventas hoy</Typography>
                </Box>
              ) : (
                ultimasVentas.map((v, i) => (
                  <Box key={v.id} sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    py: 1.5, px: 1, borderRadius: 2,
                    borderBottom: i < ultimasVentas.length - 1 ? '1px solid #F0EEE8' : 'none',
                    '&:hover': { bgcolor: '#FAFAF9' },
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: ACCENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ReceiptOutlinedIcon sx={{ fontSize: 16, color: ACCENT }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#2C2C2A' }}>
                          Venta #{v.id}
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: '#B4B2A9' }}>
                          {new Date(v.fechaHora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          {v.nombrePersona ? ` — ${v.nombrePersona}` : ' — Consumidor final'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#2C2C2A' }}>
                        ${Number(v.total).toLocaleString('es-AR')}
                      </Typography>
                      <Chip
                        label={v.estado === 'PAGADA' ? 'Pagada' : v.estado === 'ANULADA' ? 'Anulada' : v.estado}
                        size="small"
                        sx={{
                          bgcolor: v.estado === 'PAGADA' ? '#E8F5E9' : v.estado === 'ANULADA' ? '#FFEBEE' : '#FFF3E0',
                          color: v.estado === 'PAGADA' ? '#2E7D32' : v.estado === 'ANULADA' ? '#C62828' : '#E65100',
                          fontWeight: 600, fontSize: '0.65rem', height: 18, borderRadius: 1, border: 'none',
                        }}
                      />
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}