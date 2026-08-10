import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Sobre from './pages/Sobre.jsx';
import Aulas from './pages/Aulas.jsx';
import Horarios from './pages/Horarios.jsx';
import Contato from './pages/Contato.jsx';
import Eventos from './pages/Eventos.jsx';
import InscricaoEvento from './pages/InscricaoEvento.jsx';
import Login from './pages/Login.jsx';
import PublicLayout from './components/PublicLayout.jsx';

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/sobre" element={<PublicLayout><Sobre /></PublicLayout>} />
      <Route path="/aulas" element={<PublicLayout><Aulas /></PublicLayout>} />
      <Route path="/horarios" element={<PublicLayout><Horarios /></PublicLayout>} />
      <Route path="/contato" element={<PublicLayout><Contato /></PublicLayout>} />
      <Route path="/eventos" element={<PublicLayout><Eventos /></PublicLayout>} />
      <Route path="/eventos/:id" element={<PublicLayout><InscricaoEvento /></PublicLayout>} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<div className="admin-loading">Carregando…</div>}>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  );
}
