import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

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
        sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar variant="dense" sx={{ gap: 1.5 }}>
          <ShoppingCartOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ fontWeight: 500, flex: 1, color: 'text.primary' }}>
            SuperMarket — Punto de venta
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {user?.nombre}
          </Typography>
          <Button
            size="small"
            startIcon={<LogoutOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={handleLogout}
            sx={{ color: 'text.secondary', fontSize: 12 }}
          >
            Salir
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
}