import { Outlet, useNavigate } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Tooltip } from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useAuthStore } from '../../store/authStore';

const ACCENT = '#3B5B8C';

export default function CajaVentaLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#F7F7F5' }}>
      <AppBar position="static" elevation={0} color="transparent"
        sx={{ bgcolor: 'background.paper', borderBottom: '1px solid #E3E1DB' }}>
        <Toolbar variant="dense" sx={{ gap: 1.5, minHeight: 56 }}>

          {/* Logo */}
          <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShoppingCartOutlinedIcon sx={{ fontSize: 16, color: '#fff' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#2C2C2A', letterSpacing: '-0.2px' }}>
            SuperMarket
          </Typography>
          <Box sx={{ width: '1px', height: 18, bgcolor: '#E3E1DB', mx: 0.5 }} />
          <Typography sx={{ fontSize: '0.85rem', color: '#888780', fontWeight: 400 }}>
            Punto de venta
          </Typography>

          <Box sx={{ flex: 1 }} />

          {/* Usuario */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: ACCENT }}>
                {user?.nombre?.[0] ?? 'C'}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#3C3B38' }}>
              {user?.nombre}
            </Typography>
          </Box>

          <Tooltip title="Cerrar sesión">
            <IconButton size="small" onClick={handleLogout}
              sx={{ color: '#B4B2A9', '&:hover': { color: '#C62828', bgcolor: '#FFEBEE' } }}>
              <LogoutOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
}