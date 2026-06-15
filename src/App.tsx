import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import AppRouter from './routes/AppRouter';

export default function App() {
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    logout();
  }, [logout]);

  return <AppRouter />;
}