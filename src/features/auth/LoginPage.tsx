import { useState } from 'react';
import {
  Box, TextField, Button, Typography,
  CircularProgress, Alert, IconButton, InputAdornment,
} from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { useLogin } from './useLogin';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error } = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(username, password);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F7F7F5', p: 2 }}>
      <Box sx={{
        width: '100%', maxWidth: 900,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        borderRadius: 3, overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
        border: '1px solid', borderColor: 'divider',
      }}>

        {/* Panel izquierdo — marca */}
        <Box sx={{
          bgcolor: '#2C2C2A',
          p: { xs: 4, md: 5 },
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 520,
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 48, height: 48,
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 2.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShoppingCartOutlinedIcon sx={{ fontSize: 24, color: '#fff' }} />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 600, color: '#fff', lineHeight: 1, letterSpacing: '-0.3px' }}>
                SuperMarket
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '1.5px', mt: 0.5 }}>
                SISTEMA DE GESTIÓN
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 30, fontWeight: 500, color: '#fff', lineHeight: 1.3, mb: 2 }}>
              Controlá tu negocio<br />en tiempo real.
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
              Sistema integral de punto de venta,<br />
              inventario y facturación electrónica.
            </Typography>
          </Box>

          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
            © 2026 SuperMarket · Todos los derechos reservados
          </Typography>
        </Box>

        {/* Panel derecho — formulario */}
        <Box sx={{
          bgcolor: '#F7F7F5',
          p: { xs: 4, md: 5 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, mb: 4 }}>
            <ShoppingCartOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>SuperMarket</Typography>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 500, mb: 0.75, color: 'text.primary' }}>
            Bienvenido
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
            Ingresá tus credenciales para continuar
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.5px', color: 'text.secondary', display: 'block', mb: 0.75 }}>
                USUARIO
              </Typography>
              <TextField
                type="text"
                fullWidth
                size="small"
                placeholder="usuario@empresa.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    '&:hover fieldset': { borderColor: 'text.primary' },
                    '&.Mui-focused fieldset': { borderColor: 'text.primary', borderWidth: 1 },
                  },
                }}
              />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.5px', color: 'text.secondary', display: 'block', mb: 0.75 }}>
                CONTRASEÑA
              </Typography>
              <TextField
                type={showPassword ? 'text' : 'password'}
                fullWidth
                size="small"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword
                            ? <VisibilityOffOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            : <VisibilityOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                          }
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    '&:hover fieldset': { borderColor: 'text.primary' },
                    '&.Mui-focused fieldset': { borderColor: 'text.primary', borderWidth: 1 },
                  },
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              disableElevation
              sx={{ py: 1.4, borderRadius: 2, fontSize: 14, fontWeight: 500, mt: 1, letterSpacing: '0.3px' }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Ingresar'}
            </Button>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 4 }}>
            <LockOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Acceso restringido al personal autorizado
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}