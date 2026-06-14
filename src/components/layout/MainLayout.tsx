import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText,
  Tooltip
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import { useAuthStore } from '../../store/authStore';

const ACCENT = '#3B5B8C';
const ACCENT_BG = '#EEF2F8';
const SIDEBAR_BG = '#F4F3F1';
const DRAWER_WIDTH = 230;
const DRAWER_COLLAPSED = 64;

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardOutlinedIcon fontSize="small" />, section: 'GENERAL' },
  { label: 'Caja', path: '/caja', icon: <PointOfSaleOutlinedIcon fontSize="small" />, section: 'GENERAL' },
  { label: 'Ventas', path: '/ventas', icon: <ShoppingBagOutlinedIcon fontSize="small" />, section: 'GENERAL' },
  { label: 'Productos', path: '/productos', icon: <InventoryOutlinedIcon fontSize="small" />, section: 'GENERAL' },
  { label: 'Personas', path: '/personas', icon: <PeopleOutlinedIcon fontSize="small" />, section: 'GENERAL' },
  { label: 'Facturación', path: '/facturacion', icon: <ReceiptOutlinedIcon fontSize="small" />, section: 'GENERAL' },
  { label: 'Cta. Corriente', path: '/cta-corriente', icon: <AccountBalanceOutlinedIcon fontSize="small" />, section: 'GENERAL' },
  { label: 'Reportes', path: '/reportes', icon: <BarChartOutlinedIcon fontSize="small" />, section: 'REPORTES' },
  { label: 'Auditoría', path: '/auditoria', icon: <VerifiedUserOutlinedIcon fontSize="small" />, section: 'REPORTES' },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sections = ['GENERAL', 'REPORTES'];

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#F7F7F5' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 'none',
            borderRight: '1px solid #E3E1DB',
            overflowX: 'hidden',
            transition: 'width 0.2s ease',
            bgcolor: SIDEBAR_BG,
          },
        }}
      >
        {/* Logo */}
        <Box sx={{
          px: 2, py: 2,
          display: 'flex', alignItems: 'center', gap: 1.5,
          borderBottom: '1px solid #E3E1DB',
          minHeight: 56,
        }}>
          <Box sx={{
            width: 32, height: 32,
            bgcolor: ACCENT,
            borderRadius: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ShoppingCartOutlinedIcon sx={{ fontSize: 17, color: '#fff' }} />
          </Box>
          {!collapsed && (
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#2C2C2A', letterSpacing: '-0.3px', lineHeight: 1 }}>
                SuperMarket
              </Typography>
              <Typography sx={{ fontSize: '0.8rem', color: '#888780', letterSpacing: '1px' }}>
                GESTIÓN
              </Typography>
            </Box>
          )}
        </Box>

        {/* Nav */}
        <Box sx={{ flex: 1, overflowY: 'auto', py: 1.5 }}>
          {sections.map((section) => (
            <Box key={section} sx={{ mb: 1 }}>
              {!collapsed && (
                <Typography sx={{
                  px: 2.5, pb: 0.5,
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#B4B2A9',
                  letterSpacing: '1px',
                }}>
                  {section}
                </Typography>
              )}
              <List dense disablePadding sx={{ px: 1 }}>
                {navItems.filter(i => i.section === section).map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right">
                      <ListItemButton
                        selected={isActive}
                        onClick={() => navigate(item.path)}
                        sx={{
                          borderRadius: 1.5,
                          mb: 0.25,
                          minHeight: 38,
                          px: collapsed ? 1.5 : 1.5,
                          justifyContent: collapsed ? 'center' : 'flex-start',
                          color: isActive ? ACCENT : '#5F5E5A',
                          bgcolor: isActive ? ACCENT_BG : 'transparent',
                          '&:hover': {
                            bgcolor: isActive ? ACCENT_BG : 'rgba(0,0,0,0.04)',
                          },
                          '&.Mui-selected': {
                            bgcolor: ACCENT_BG,
                            '&:hover': { bgcolor: ACCENT_BG },
                          },
                        }}
                      >
                        <ListItemIcon sx={{
                          minWidth: collapsed ? 0 : 34,
                          color: isActive ? ACCENT : '#888780',
                        }}>
                          {item.icon}
                        </ListItemIcon>
                        {!collapsed && (
                          <ListItemText
                            primary={item.label}
                            slotProps={{
                              primary: {
                                sx: {
                                  fontSize: '1rem',
                                  fontWeight: isActive ? 600 : 400,
                                  color: isActive ? ACCENT : '#3C3B38',
                                },
                              },
                            }}
                          />
                        )}
                        {/* Indicador activo */}
                        {isActive && !collapsed && (
                          <Box sx={{
                            width: 3, height: 18,
                            bgcolor: ACCENT,
                            borderRadius: 2,
                            ml: 1,
                          }} />
                        )}
                      </ListItemButton>
                    </Tooltip>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>

        {/* Footer usuario */}
        <Box sx={{ borderTop: '1px solid #E3E1DB', p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 0.5, py: 0.5 }}>
            <Box sx={{
              width: 40, height: 40,
              borderRadius: '50%',
              bgcolor: ACCENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>
                {user?.nombre?.[0] ?? 'U'}
              </Typography>
            </Box>
            {!collapsed && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: '#2C2C2A', lineHeight: 1.2 }} noWrap>
                  {user?.nombre}
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: '#888780' }} noWrap>
                  {user?.rol === 'ADMIN' ? 'Administrador' : 'Cajero'}
                </Typography>
              </Box>
            )}
            {!collapsed && (
              <Tooltip title="Cerrar sesión">
                <IconButton size="small" onClick={handleLogout} sx={{ color: '#B4B2A9', '&:hover': { color: '#C62828' } }}>
                  <LogoutOutlinedIcon sx={{ fontSize: '1.5rem' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Drawer>

      {/* Contenido principal */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <AppBar
          position="static"
          elevation={0}
          color="transparent"
          sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid #E3E1DB',
          }}
        >
          <Toolbar variant="dense" sx={{ gap: 1.5, minHeight: 56 }}>
            <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ color: '#888780' }}>
              <MenuIcon fontSize="small" />
            </IconButton>
            <Typography sx={{ fontWeight: 600, fontSize: '1rem', flex: 1, color: '#335c8bfe', letterSpacing: '-0.2px' }}>
              {navItems.find(i => i.path === location.pathname)?.label ?? 'SuperMarket'}
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', color: '#70a9cdaf' }}>
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Página */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: '#F7F7F5' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}