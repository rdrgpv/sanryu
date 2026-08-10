import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/admin/Dashboard.jsx';
import Alunos from '../pages/admin/Alunos.jsx';
import AlunoForm from '../pages/admin/AlunoForm.jsx';
import Turmas from '../pages/admin/Turmas.jsx';
import TurmaForm from '../pages/admin/TurmaForm.jsx';
import Instrutores from '../pages/admin/Instrutores.jsx';
import InstrutorForm from '../pages/admin/InstrutorForm.jsx';
import Faixas from '../pages/admin/Faixas.jsx';
import FaixaForm from '../pages/admin/FaixaForm.jsx';
import TiposEvento from '../pages/admin/TiposEvento.jsx';
import EventosAdmin from '../pages/admin/Eventos.jsx';
import Bancos from '../pages/admin/Bancos.jsx';
import Configuracoes from '../pages/admin/Configuracoes.jsx';
import AdminRoute from '../components/AdminRoute.jsx';
import '@coreui/coreui/dist/css/coreui.min.css';
import './admin.css';

export default function AdminApp() {
  return (
    <Routes>
      <Route index element={<AdminRoute><Dashboard /></AdminRoute>} />

      <Route path="alunos" element={<AdminRoute><Alunos /></AdminRoute>} />
      <Route path="alunos/novo" element={<AdminRoute><AlunoForm /></AdminRoute>} />
      <Route path="alunos/:id/editar" element={<AdminRoute><AlunoForm /></AdminRoute>} />

      <Route path="turmas" element={<AdminRoute><Turmas /></AdminRoute>} />
      <Route path="turmas/novo" element={<AdminRoute><TurmaForm /></AdminRoute>} />
      <Route path="turmas/:id/editar" element={<AdminRoute><TurmaForm /></AdminRoute>} />

      <Route path="instrutores" element={<AdminRoute><Instrutores /></AdminRoute>} />
      <Route path="instrutores/novo" element={<AdminRoute><InstrutorForm /></AdminRoute>} />
      <Route path="instrutores/:id/editar" element={<AdminRoute><InstrutorForm /></AdminRoute>} />

      <Route path="faixas" element={<AdminRoute><Faixas /></AdminRoute>} />
      <Route path="faixas/novo" element={<AdminRoute><FaixaForm /></AdminRoute>} />
      <Route path="faixas/:id/editar" element={<AdminRoute><FaixaForm /></AdminRoute>} />

      <Route path="tipos-evento" element={<AdminRoute><TiposEvento /></AdminRoute>} />
      <Route path="eventos" element={<AdminRoute><EventosAdmin /></AdminRoute>} />
      <Route path="bancos" element={<AdminRoute><Bancos /></AdminRoute>} />
      <Route path="configuracoes" element={<AdminRoute><Configuracoes /></AdminRoute>} />
    </Routes>
  );
}
