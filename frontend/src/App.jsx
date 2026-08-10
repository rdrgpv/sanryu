import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Sobre from './pages/Sobre.jsx';
import Aulas from './pages/Aulas.jsx';
import Horarios from './pages/Horarios.jsx';
import Contato from './pages/Contato.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Alunos from './pages/admin/Alunos.jsx';
import AlunoForm from './pages/admin/AlunoForm.jsx';
import Turmas from './pages/admin/Turmas.jsx';
import TurmaForm from './pages/admin/TurmaForm.jsx';
import Instrutores from './pages/admin/Instrutores.jsx';
import InstrutorForm from './pages/admin/InstrutorForm.jsx';
import Faixas from './pages/admin/Faixas.jsx';
import FaixaForm from './pages/admin/FaixaForm.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import PublicLayout from './components/PublicLayout.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/sobre" element={<PublicLayout><Sobre /></PublicLayout>} />
      <Route path="/aulas" element={<PublicLayout><Aulas /></PublicLayout>} />
      <Route path="/horarios" element={<PublicLayout><Horarios /></PublicLayout>} />
      <Route path="/contato" element={<PublicLayout><Contato /></PublicLayout>} />
      <Route path="/login" element={<Login />} />

      <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />

      <Route path="/admin/alunos" element={<AdminRoute><Alunos /></AdminRoute>} />
      <Route path="/admin/alunos/novo" element={<AdminRoute><AlunoForm /></AdminRoute>} />
      <Route path="/admin/alunos/:id/editar" element={<AdminRoute><AlunoForm /></AdminRoute>} />

      <Route path="/admin/turmas" element={<AdminRoute><Turmas /></AdminRoute>} />
      <Route path="/admin/turmas/novo" element={<AdminRoute><TurmaForm /></AdminRoute>} />
      <Route path="/admin/turmas/:id/editar" element={<AdminRoute><TurmaForm /></AdminRoute>} />

      <Route path="/admin/instrutores" element={<AdminRoute><Instrutores /></AdminRoute>} />
      <Route path="/admin/instrutores/novo" element={<AdminRoute><InstrutorForm /></AdminRoute>} />
      <Route path="/admin/instrutores/:id/editar" element={<AdminRoute><InstrutorForm /></AdminRoute>} />

      <Route path="/admin/faixas" element={<AdminRoute><Faixas /></AdminRoute>} />
      <Route path="/admin/faixas/novo" element={<AdminRoute><FaixaForm /></AdminRoute>} />
      <Route path="/admin/faixas/:id/editar" element={<AdminRoute><FaixaForm /></AdminRoute>} />
    </Routes>
  );
}
