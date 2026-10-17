import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// "perfis": quem pode ver a rota. Sensei que cai numa tela do admin vai pra chamada, e vice-versa
// não precisa (admin pode usar a chamada). A proteção de verdade é no backend (403); isto só evita
// mostrar uma tela que ia falhar.
export default function ProtectedRoute({ children, perfis = ['admin'] }) {
  const { isAuthenticated, loading, perfil } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!perfis.includes(perfil)) {
    return <Navigate to={perfil === 'instrutor' ? '/sensei' : '/admin'} replace />;
  }

  return children;
}
