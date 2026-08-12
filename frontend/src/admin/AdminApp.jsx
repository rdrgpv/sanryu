import { useEffect } from 'react';
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
import TipoEventoForm from '../pages/admin/TipoEventoForm.jsx';
import EventosAdmin from '../pages/admin/Eventos.jsx';
import EventoForm from '../pages/admin/EventoForm.jsx';
import EventoInscricoes from '../pages/admin/EventoInscricoes.jsx';
import RelatorioExame from '../pages/admin/RelatorioExame.jsx';
import Bancos from '../pages/admin/Bancos.jsx';
import BancoForm from '../pages/admin/BancoForm.jsx';
import Configuracoes from '../pages/admin/Configuracoes.jsx';
import AdminRoute from '../components/AdminRoute.jsx';
import coreuiCssUrl from '@coreui/coreui/dist/css/coreui.min.css?url';
import adminCssUrl from './admin.css?url';

export default function AdminApp() {
  // O CSS do admin (CoreUI/Bootstrap) só pode existir enquanto o painel está montado — importado
  // estaticamente, o <link> injetado pelo Vite nunca sai do <head>, e um redirecionamento pra
  // /login (sessão expirada) herda os estilos do Bootstrap por cima dos da página pública.
  useEffect(() => {
    const links = [coreuiCssUrl, adminCssUrl].map((href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
      return link;
    });

    return () => links.forEach((link) => link.remove());
  }, []);

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
      <Route path="tipos-evento/novo" element={<AdminRoute><TipoEventoForm /></AdminRoute>} />
      <Route path="tipos-evento/:id/editar" element={<AdminRoute><TipoEventoForm /></AdminRoute>} />

      <Route path="eventos" element={<AdminRoute><EventosAdmin /></AdminRoute>} />
      <Route path="eventos/novo" element={<AdminRoute><EventoForm /></AdminRoute>} />
      <Route path="eventos/:id/editar" element={<AdminRoute><EventoForm /></AdminRoute>} />
      <Route path="eventos/:id/inscricoes" element={<AdminRoute><EventoInscricoes /></AdminRoute>} />
      <Route path="eventos/:id/relatorio-exame" element={<AdminRoute><RelatorioExame /></AdminRoute>} />

      <Route path="bancos" element={<AdminRoute><Bancos /></AdminRoute>} />
      <Route path="bancos/novo" element={<AdminRoute><BancoForm /></AdminRoute>} />
      <Route path="bancos/:id/editar" element={<AdminRoute><BancoForm /></AdminRoute>} />

      <Route path="configuracoes" element={<AdminRoute><Configuracoes /></AdminRoute>} />
    </Routes>
  );
}
