import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      // 🔧 MOCK temporal — reemplazar por loginApi cuando el backend esté listo
      await new Promise((r) => setTimeout(r, 500)); // simula delay de red
      if (username === 'admin' && password === '1234') {
        setUser({ token: 'mock-token', rol: 'ADMIN', nombre: 'Admin' });
        navigate('/dashboard');
      } else if (username === 'cajero' && password === '1234') {
        setUser({ token: 'mock-token', rol: 'CAJERO', nombre: 'Cajero' });
        navigate('/cobro'); // ← antes era '/caja'
      }
      else {
        setError('Usuario o contraseña incorrectos');
      }
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};