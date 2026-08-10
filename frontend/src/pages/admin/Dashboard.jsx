import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CRow, CCol, CCard, CCardBody, CWidgetStatsA } from '@coreui/react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';

const quicklinks = [
  { to: '/admin/alunos/novo', label: 'Novo aluno' },
  { to: '/admin/turmas/novo', label: 'Nova turma' },
  { to: '/admin/instrutores/novo', label: 'Novo instrutor' },
  { to: '/admin/faixas/novo', label: 'Nova faixa' },
];

export default function Dashboard() {
  const { admin } = useAuth();
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((res) => setResumo(res.data))
      .catch(() => setErro('Não foi possível carregar o resumo.'));
  }, []);

  return (
    <div>
      <h1 className="h3 mb-1">Dashboard</h1>
      <p className="text-body-secondary mb-4">Bem-vindo de volta, {admin?.nome}.</p>

      {erro && <div className="alert alert-danger">{erro}</div>}

      {resumo && (
        <CRow className="g-3 mb-4">
          <CCol sm={6} lg={3}>
            <CWidgetStatsA
              color="primary"
              value={resumo.alunosAtivos}
              title="Alunos ativos"
            />
          </CCol>
          <CCol sm={6} lg={3}>
            <CWidgetStatsA
              color="info"
              value={resumo.totalTurmas}
              title="Turmas"
            />
          </CCol>
          <CCol sm={6} lg={3}>
            <CWidgetStatsA
              color="warning"
              value={resumo.totalInstrutores}
              title="Instrutores"
            />
          </CCol>
          <CCol sm={6} lg={3}>
            <CWidgetStatsA
              color="success"
              value={resumo.matriculasDoMes}
              title="Matrículas no mês"
            />
          </CCol>
        </CRow>
      )}

      <CCard>
        <CCardBody>
          <h2 className="h5 mb-3">Ações rápidas</h2>
          <div className="d-flex gap-2 flex-wrap">
            {quicklinks.map((link) => (
              <Link key={link.to} to={link.to} className="btn btn-outline-secondary">
                {link.label}
              </Link>
            ))}
          </div>
        </CCardBody>
      </CCard>
    </div>
  );
}
