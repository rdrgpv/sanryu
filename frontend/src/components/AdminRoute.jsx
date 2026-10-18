import { Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminLayout from './AdminLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { podeVer } from '../utils/permissoes.js';

// Admin e recepção entram no painel; telas fora do perfil voltam pro início (o servidor bloqueia
// de qualquer jeito — isto só evita abrir uma tela que só daria erro).
function TelaPermitida({ children }) {
  const { perfil } = useAuth();
  const { pathname } = useLocation();
  if (!podeVer(perfil, pathname)) return <Navigate to="/admin" replace />;
  return children;
}

export default function AdminRoute({ children }) {
  return (
    <ProtectedRoute perfis={['admin', 'recepcao']}>
      <TelaPermitida>
        <AdminLayout>{children}</AdminLayout>
      </TelaPermitida>
    </ProtectedRoute>
  );
}
