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

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        email: username,
        password,
      });

      const data = res.data.data;

      const payload = JSON.parse(atob(data.token.split('.')[1]));
      const roles: string[] = payload.roles ?? [];

      const rol = roles.some((r: string) =>
        r.toUpperCase().includes('CAJERO')
      ) ? 'CAJERO' : 'ADMIN';

      setUser({
        token: data.token,
        rol,
        nombre: data.nombre,
      });

      localStorage.setItem('refreshToken', data.refreshToken);
      navigate(rol === 'CAJERO' ? '/caja' : '/dashboard');
      return true;

    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data?.error;
        const msg = typeof errorData === 'string'
          ? errorData
          : errorData?.message ?? err.response?.data?.message ?? 'Usuario o contraseña incorrectos';
        setError(msg);
      } else {
        setError('Error de conexión con el servidor');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};