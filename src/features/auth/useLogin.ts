import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        email: username,      // el back espera "email"
        password,
      });

      const data = res.data.data; // ApiResponse<LoginResponse>

      // El rol viene en el JWT como claim "roles" — lo decodificamos
      const payload = JSON.parse(atob(data.token.split('.')[1]));
      const roles: string[] = payload.roles ?? [];

      // Mapeamos CAJERO si tiene el permiso VENTA_CREAR, sino ADMIN
      const rol = roles.some((r: string) =>
        r.toUpperCase().includes('CAJERO')
      ) ? 'CAJERO' : 'ADMIN';

      setUser({
        token: data.token,
        rol,
        nombre: data.nombre,
      });

      // Guardamos el refreshToken para renovar sesión más adelante
      localStorage.setItem('refreshToken', data.refreshToken);

      navigate(rol === 'CAJERO' ? '/cobro' : '/dashboard');

    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message ?? err.response?.data?.error;
        setError(msg ?? 'Usuario o contraseña incorrectos');
      } else {
        setError('Error de conexión con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};