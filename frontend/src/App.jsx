import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Sobre from './pages/Sobre.jsx';
import Aulas from './pages/Aulas.jsx';
import Horarios from './pages/Horarios.jsx';
import Contato from './pages/Contato.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Alunos from './pages/admin/Alunos.jsx';
import Turmas from './pages/admin/Turmas.jsx';
import Instrutores from './pages/admin/Instrutores.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicLayout from './components/PublicLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/sobre" element={<PublicLayout><Sobre /></PublicLayout>} />
      <Route path="/aulas" element={<PublicLayout><Aulas /></PublicLayout>} />
      <Route path="/horarios" element={<PublicLayout><Horarios /></PublicLayout>} />
      <Route path="/contato" element={<PublicLayout><Contato /></PublicLayout>} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout><Dashboard /></AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/alunos"
        element={
          <ProtectedRoute>
            <AdminLayout><Alunos /></AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/turmas"
        element={
          <ProtectedRoute>
            <AdminLayout><Turmas /></AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/instrutores"
        element={
          <ProtectedRoute>
            <AdminLayout><Instrutores /></AdminLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
