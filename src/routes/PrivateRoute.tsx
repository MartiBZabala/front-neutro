import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}