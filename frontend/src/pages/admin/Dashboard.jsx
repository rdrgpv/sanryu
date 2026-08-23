import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CRow, CCol, CCard, CCardBody } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPeople, cilSchool, cilContact, cilCalendarCheck, cilPlus } from '@coreui/icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardStatCard from '../../admin/components/DashboardStatCard.jsx';
import DashboardSection from '../../admin/components/DashboardSection.jsx';
import BeltDistribution from '../../admin/components/BeltDistribution.jsx';
import UpcomingEvents from '../../admin/components/UpcomingEvents.jsx';

const quicklinks = [
  { to: '/admin/alunos/novo', label: 'Novo aluno' },
  { to: '/admin/turmas/novo', label: 'Nova turma' },
  { to: '/admin/instrutores/novo', label: 'Novo instrutor' },
  { to: '/admin/eventos/novo', label: 'Novo evento' },
];

export default function Dashboard() {
  const { admin } = useAuth();
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((res) => setResumo(res.data))
      .catch(() => setErro('Não foi possível carregar o resumo.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="h3 mb-1">Dashboard</h1>
      <p className="text-body-secondary mb-4">Bem-vindo de volta, {admin?.nome}.</p>

      {erro && <div className="alert alert-danger">{erro}</div>}

      <CRow className="g-3 mb-3">
        <CCol sm={6} lg={3}>
          <DashboardStatCard
            title="Alunos ativos"
            value={resumo?.alunosAtivos}
            icon={cilPeople}
            subtitle="Total cadastrado"
            loading={loading}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <DashboardStatCard title="Turmas" value={resumo?.totalTurmas} icon={cilSchool} loading={loading} />
        </CCol>
        <CCol sm={6} lg={3}>
          <DashboardStatCard title="Instrutores" value={resumo?.totalInstrutores} icon={cilContact} loading={loading} />
        </CCol>
        <CCol sm={6} lg={3}>
          <DashboardStatCard
            title="Matrículas no mês"
            value={resumo?.matriculasDoMes}
            icon={cilCalendarCheck}
            loading={loading}
          />
        </CCol>
      </CRow>

      <CRow className="g-3 mb-3">
        <CCol lg={6}>
          <DashboardSection title="Distribuição de Faixas">
            <BeltDistribution faixas={resumo?.distribuicaoFaixas} loading={loading} />
          </DashboardSection>
        </CCol>
        <CCol lg={6}>
          <DashboardSection title="Próximos Eventos">
            <UpcomingEvents eventos={resumo?.proximosEventos} loading={loading} />
          </DashboardSection>
        </CCol>
      </CRow>

      <CCard>
        <CCardBody>
          <h2 className="h6 mb-3">Ações rápidas</h2>
          <div className="d-flex gap-2 flex-wrap">
            {quicklinks.map((link) => (
              <Link key={link.to} to={link.to} className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1">
                <CIcon icon={cilPlus} size="sm" />
                {link.label}
              </Link>
            ))}
          </div>
        </CCardBody>
      </CCard>
    </div>
  );
}
