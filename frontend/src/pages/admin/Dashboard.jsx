import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CRow, CCol, CCard, CCardBody } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPeople, cilDollar, cilWarning, cilChartLine, cilPlus } from '@coreui/icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';
import DashboardStatCard from '../../admin/components/DashboardStatCard.jsx';
import DashboardSection from '../../admin/components/DashboardSection.jsx';
import BeltDistribution from '../../admin/components/BeltDistribution.jsx';
import UpcomingEvents from '../../admin/components/UpcomingEvents.jsx';
import { GraficoColunas, GraficoLinha, TabelaDados } from '../../admin/components/GraficosDashboard.jsx';
import { formatarMoeda } from '../../utils/formato.js';

const quicklinks = [
  { to: '/admin/alunos/novo', label: 'Novo aluno' },
  { to: '/admin/contratos/novo', label: 'Novo contrato' },
  { to: '/admin/financeiro/pagar', label: 'Conta a pagar' },
  { to: '/admin/eventos/novo', label: 'Novo evento' },
];

function moedaCompacta(valor) {
  if (Math.abs(valor) >= 1000) return `R$ ${(valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return `R$ ${valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

function variacao(atual, anterior) {
  if (!anterior) return null;
  const percentual = Math.round(((atual - anterior) / anterior) * 100);
  return `${percentual >= 0 ? '+' : ''}${percentual}% vs mês anterior`;
}

function formatarData(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return match ? `${match[3]}/${match[2]}` : '-';
}

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

  const engajamento = resumo?.engajamento;
  const percentualTreinando = engajamento?.matriculados ? Math.round((engajamento.treinaram30Dias / engajamento.matriculados) * 100) : null;
  const percentualInadimplentes = resumo?.alunosAtivos ? Math.round((resumo.inadimplencia.alunos / resumo.alunosAtivos) * 100) : 0;

  return (
    <div className="viz-raiz">
      <h1 className="h3 mb-1">Dashboard</h1>
      <p className="text-body-secondary mb-4">Bem-vindo de volta, {admin?.nome}.</p>

      {erro && <div className="alert alert-danger">{erro}</div>}

      <CRow className="g-3 mb-4">
        <CCol sm={6} lg={3}>
          <DashboardStatCard
            title="Alunos ativos"
            value={resumo?.alunosAtivos}
            icon={cilPeople}
            subtitle={resumo ? `+${resumo.novosNoMes} novos · −${resumo.saidasNoMes} saídas no mês` : null}
            loading={loading}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <DashboardStatCard
            title="Recebido no mês"
            value={resumo ? formatarMoeda(resumo.recebidoNoMes) : null}
            icon={cilDollar}
            subtitle={resumo ? variacao(resumo.recebidoNoMes, resumo.recebidoMesAnterior) || `resultado ${formatarMoeda(resumo.resultadoNoMes)}` : null}
            loading={loading}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <Link to="/admin/mensalidades" className="text-decoration-none">
            <DashboardStatCard
              title="Mensalidades em atraso"
              value={resumo ? formatarMoeda(resumo.inadimplencia.total) : null}
              icon={cilWarning}
              subtitle={resumo ? `${resumo.inadimplencia.alunos} aluno(s) · ${percentualInadimplentes}% dos ativos` : null}
              loading={loading}
            />
          </Link>
        </CCol>
        <CCol sm={6} lg={3}>
          <Link to="/admin/frequencia" className="text-decoration-none">
            <DashboardStatCard
              title="Treinaram em 30 dias"
              value={percentualTreinando === null ? '-' : `${percentualTreinando}%`}
              icon={cilChartLine}
              subtitle={engajamento ? `${engajamento.treinaram30Dias} de ${engajamento.matriculados} matriculados` : null}
              loading={loading}
            />
          </Link>
        </CCol>
      </CRow>

      {resumo && (
        <CRow className="g-3 mb-4">
          <CCol lg={6}>
            <DashboardSection title="Alunos com contrato ativo">
              <GraficoLinha dados={resumo.evolucao} chave="ativos" cor="var(--viz-serie-1)" />
              <TabelaDados dados={resumo.evolucao} colunas={[{ chave: 'ativos', nome: 'Ativos' }]} />
            </DashboardSection>
          </CCol>
          <CCol lg={6}>
            <DashboardSection title="Matrículas e saídas por mês">
              <GraficoColunas
                dados={resumo.evolucao}
                opostas
                formatarValor={(valor) => Math.abs(valor).toLocaleString('pt-BR')}
                series={[
                  { chave: 'novos', nome: 'Matrículas', cor: 'var(--viz-serie-1)' },
                  { chave: 'saidas', nome: 'Saídas', cor: 'var(--viz-negativo)', negativo: true },
                ]}
                rotuloTooltip={(linha) => `Saldo: ${linha.novos - linha.saidas >= 0 ? '+' : ''}${linha.novos - linha.saidas}`}
              />
              <TabelaDados
                dados={resumo.evolucao}
                colunas={[
                  { chave: 'novos', nome: 'Matrículas' },
                  { chave: 'saidas', nome: 'Saídas' },
                ]}
              />
            </DashboardSection>
          </CCol>
          <CCol lg={12}>
            <DashboardSection title="Entradas e saídas de dinheiro (pago de fato)">
              <GraficoColunas
                dados={resumo.financeiro}
                formatarValor={moedaCompacta}
                series={[
                  { chave: 'entradas', nome: 'Entradas', cor: 'var(--viz-serie-1)', formatar: formatarMoeda },
                  { chave: 'saidas', nome: 'Saídas', cor: 'var(--viz-serie-2)', formatar: formatarMoeda },
                ]}
                rotuloTooltip={(linha) => `Resultado: ${formatarMoeda(linha.resultado)}`}
              />
              <TabelaDados
                dados={resumo.financeiro}
                colunas={[
                  { chave: 'entradas', nome: 'Entradas', formatar: formatarMoeda },
                  { chave: 'saidas', nome: 'Saídas', formatar: formatarMoeda },
                  { chave: 'resultado', nome: 'Resultado', formatar: formatarMoeda },
                ]}
              />
            </DashboardSection>
          </CCol>
        </CRow>
      )}

      {resumo && (
        <CRow className="g-3 mb-4">
          <CCol lg={4}>
            <DashboardSection title="Mensalidades mais atrasadas">
              {resumo.inadimplencia.maisAtrasadas.length === 0 ? (
                <p className="small text-body-secondary mb-0">Nenhuma mensalidade em atraso.</p>
              ) : (
                <>
                  {resumo.inadimplencia.maisAtrasadas.map((item) => (
                    <div key={item.id} className="d-flex justify-content-between small border-bottom py-1">
                      <span className="text-truncate me-2">
                        {item.aluno}
                        {item.responsavel && <span className="text-body-secondary"> · {item.responsavel}</span>}
                      </span>
                      <span className="text-nowrap">
                        {formatarMoeda(item.valor)} <span className="text-danger">{item.diasAtraso}d</span>
                      </span>
                    </div>
                  ))}
                  <Link to="/admin/mensalidades" className="small d-inline-block mt-2">
                    Cobrar na tela de Mensalidades →
                  </Link>
                </>
              )}
            </DashboardSection>
          </CCol>
          <CCol lg={4}>
            <DashboardSection title={`Sem treinar há 14+ dias${engajamento?.totalSumidos ? ` (${engajamento.totalSumidos})` : ''}`}>
              {!engajamento?.sumidos?.length ? (
                <p className="small text-body-secondary mb-0">Todos os matriculados treinaram nas últimas duas semanas.</p>
              ) : (
                <>
                  {engajamento.sumidos.map((aluno) => (
                    <div key={aluno.id} className="d-flex justify-content-between small border-bottom py-1">
                      <Link to={`/admin/alunos/${aluno.id}/editar`} className="text-truncate me-2">
                        {aluno.nome}
                      </Link>
                      <span className="text-body-secondary text-nowrap">{aluno.ultimaPresenca ? `últ. ${formatarData(aluno.ultimaPresenca)}` : 'nunca veio'}</span>
                    </div>
                  ))}
                  <Link to="/admin/frequencia" className="small d-inline-block mt-2">
                    Ver frequência →
                  </Link>
                </>
              )}
            </DashboardSection>
          </CCol>
          <CCol lg={4}>
            <DashboardSection title="Aniversariantes do mês">
              {resumo.aniversariantes.length === 0 ? (
                <p className="small text-body-secondary mb-0">Nenhum aniversariante este mês.</p>
              ) : (
                resumo.aniversariantes.map((aluno) => (
                  <div key={aluno.id} className="d-flex justify-content-between small border-bottom py-1">
                    <span>
                      {aluno.nome}
                      {aluno.hoje && <span className="badge text-bg-warning ms-2">hoje</span>}
                    </span>
                    <span className="text-body-secondary">
                      dia {aluno.dia} · {aluno.idade} anos
                    </span>
                  </div>
                ))
              )}
            </DashboardSection>
          </CCol>
        </CRow>
      )}

      <CRow className="g-3 mb-4">
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
