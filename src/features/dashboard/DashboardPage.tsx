import { Grid, Card, CardContent, Typography, Box, Button, Chip } from '@mui/material';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import { useNavigate } from 'react-router-dom';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';

const metrics = [
  {
    label: 'Ventas hoy',
    value: '$124.500',
    sub: '↑ 12% vs ayer',
    trend: 'up',
    icon: <TrendingUpOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  {
    label: 'Transacciones',
    value: '87',
    sub: 'Último cierre: 18:00',
    trend: 'up',
    icon: <TrendingUpOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  {
    label: 'Productos bajos',
    value: '5',
    sub: 'Requieren reposición',
    trend: 'down',
    icon: <TrendingDownOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  {
    label: 'Caja abierta',
    value: 'Turno 2',
    sub: 'Desde 14:00',
    trend: 'neutral',
    icon: <AccessTimeOutlinedIcon sx={{ fontSize: 18 }} />,
  },
];

const lastTransactions = [
  { id: '#1042', cajero: 'Cajero 1', hora: '14:32', monto: '$3.200' },
  { id: '#1041', cajero: 'Cajero 2', hora: '14:18', monto: '$8.750' },
  { id: '#1040', cajero: 'Cajero 1', hora: '13:55', monto: '$1.400' },
  { id: '#1039', cajero: 'Cajero 2', hora: '13:41', monto: '$5.600' },
];

const quickAccess = [
  { label: 'Abrir caja', path: '/caja', icon: <PointOfSaleOutlinedIcon /> },
  { label: 'Productos', path: '/productos', icon: <InventoryOutlinedIcon /> },
  { label: 'Facturar', path: '/facturacion', icon: <ReceiptOutlinedIcon /> },
  { label: 'Reportes', path: '/reportes', icon: <BarChartOutlinedIcon /> },
];

export default function DashboardPage() {
  const navigate = useNavigate();

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
              border: '1px solid #E3E1DB',
              bgcolor: 'background.paper',
              borderRadius: 3,
              transition: 'box-shadow 0.2s',
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
                    borderRadius: 2, p: 0.5,
                    display: 'flex', alignItems: 'center',
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

      <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
        {/* Accesos rápidos */}
        <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex' }}>
          <Card elevation={0} sx={{
            border: '1px solid #E3E1DB',
            bgcolor: 'background.paper',
            width: '100%',
            borderRadius: 3,
          }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', mb: 2, color: '#2C2C2A' }}>
                Accesos rápidos
              </Typography>
              <Grid container spacing={1.5} sx={{ flex: 1 }}>
                {quickAccess.map((q) => (
                  <Grid size={{ xs: 6 }} key={q.label} sx={{ display: 'flex' }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={q.icon}
                      onClick={() => navigate(q.path)}
                      sx={{
                        justifyContent: 'flex-start',
                        border: '1px solid #E3E1DB',
                        borderRadius: 2.5,
                        color: '#3C3B38',
                        py: 1.5,
                        px: 2,
                        flex: 1,
                        bgcolor: '#FAFAF9',
                        fontSize: '1.1rem',
                        fontWeight: 500,
                        transition: 'all 0.15s',
                        '&:hover': {
                          bgcolor: ACCENT_BG,
                          borderColor: ACCENT,
                          color: ACCENT,
                          '& .MuiButton-startIcon': { color: ACCENT },
                        },
                      }}
                    >
                      {q.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Últimas transacciones */}
        <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex' }}>
          <Card elevation={0} sx={{
            border: '1px solid #E3E1DB',
            bgcolor: 'background.paper',
            width: '100%',
            borderRadius: 3,
          }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.2srem', color: '#2C2C2A' }}>
                  Últimas transacciones
                </Typography>
                <Chip
                  label="En vivo"
                  size="small"
                  sx={{
                    bgcolor: '#E8F5E9', color: '#2E7D32',
                    fontWeight: 600, fontSize: '0.7rem',
                    height: 22, borderRadius: 1.5,
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                {lastTransactions.map((tx, i) => (
                  <Box
                    key={tx.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      px: 1.5,
                      borderRadius: 2,
                      mb: 0.5,
                      transition: 'bgcolor 0.15s',
                      borderBottom: i < lastTransactions.length - 1 ? '1px solid #F0EEE8' : 'none',
                      '&:hover': { bgcolor: '#FAFAF9' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 36, height: 36, borderRadius: 2,
                        bgcolor: ACCENT_BG,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <ReceiptOutlinedIcon sx={{ fontSize: 16, color: ACCENT }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.99rem', fontWeight: 600, color: '#2C2C2A' }}>
                          Venta {tx.id}
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: '#B4B2A9' }}>
                          {tx.hora} — {tx.cajero}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#2C2C2A' }}>
                      {tx.monto}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}