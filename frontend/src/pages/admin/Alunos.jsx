import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CFormInput, CFormSelect, CButton, CInputGroup } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSchool, cilSearch, cilUserPlus, cilNotes } from '@coreui/icons';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const SITUACOES = {
  ativo: { label: 'Ativo', classe: 'text-bg-success' },
  trancado: { label: 'Trancado', classe: 'text-bg-warning' },
  cancelado: { label: 'Cancelado', classe: 'text-bg-secondary' },
};

export default function Alunos() {
  const navigate = useNavigate();
  const { perfil } = useAuth();
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [busca, setBusca] = useState('');
  const [turmaFiltro, setTurmaFiltro] = useState('');
  const [unidades, setUnidades] = useState([]);
  const [unidadeFiltro, setUnidadeFiltro] = useState('');
  const [situacaoFiltro, setSituacaoFiltro] = useState('ativo');
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [matriculando, setMatriculando] = useState(false);
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [verificandoGatame, setVerificandoGatame] = useState(false);
  const [cadastrandoGatame, setCadastrandoGatame] = useState(false);

  const alunoSelecionado = alunos.find((aluno) => aluno.id === selecionadoId) || null;
  const alunosFiltrados = turmaFiltro
    ? alunos.filter((aluno) => (aluno.turmas || []).some((turma) => String(turma.id) === turmaFiltro))
    : alunos;

  async function carregarAlunos() {
    // Só os alunos do dojo — os externos (Morganti de outras academias) têm tela própria.
    const params = { vinculo: 'academia' };
    if (busca) params.busca = busca;
    if (unidadeFiltro) params.unidadeId = unidadeFiltro;
    if (situacaoFiltro) params.situacao = situacaoFiltro;
    const res = await api.get('/admin/alunos', { params });
    setAlunos(res.data);
  }

  useEffect(() => {
    carregarAlunos();
    api.get('/admin/turmas').then((res) => setTurmas(res.data));
    api.get('/admin/unidades').then((res) => setUnidades(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      carregarAlunos();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, unidadeFiltro, situacaoFiltro]);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
    setMatriculando(false);
  }

  // Filtrar por turma esconde linhas sem trocar a lista carregada — se o aluno selecionado saía de
  // vista, os botões da toolbar continuavam habilitados apontando pra uma linha que já não aparece.
  useEffect(() => {
    setSelecionadoId(null);
  }, [turmaFiltro, unidadeFiltro, situacaoFiltro]);

  // Na matrícula, só oferece turmas da unidade do aluno (turmas sem unidade continuam aparecendo).
  const turmasParaMatricula = turmas.filter(
    (turma) => !alunoSelecionado?.unidadeId || !turma.unidadeId || turma.unidadeId === alunoSelecionado.unidadeId
  );
  const turmasDoFiltro = unidadeFiltro ? turmas.filter((turma) => String(turma.unidadeId) === unidadeFiltro) : turmas;

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este aluno?')) return;
    await api.delete(`/admin/alunos/${selecionadoId}`);
    setSelecionadoId(null);
    carregarAlunos();
  }

  async function handleMatricular() {
    if (!turmaSelecionada) return;
    await api.post(`/admin/alunos/${selecionadoId}/matricular`, { turmaId: turmaSelecionada });
    setMatriculando(false);
    setTurmaSelecionada('');
    carregarAlunos();
  }

  // Verifica se o aluno já existe no Gatame pelo email — independente de já ter passado pelo fluxo
  // de "cadastrar no Gatame" a partir de uma inscrição de evento.
  async function verificarGatame() {
    if (!selecionadoId) return;
    setVerificandoGatame(true);

    try {
      const res = await api.get(`/admin/alunos/${selecionadoId}/verificar-gatame`);
      if (res.data.apto) {
        const detalhes = res.data.candidatos
          .map((candidato) => `${candidato.nome} — Faixa ${candidato.faixa || '?'}${candidato.origem ? ` (${candidato.origem})` : ''}`)
          .join('\n');
        window.alert(`Encontrado no Gatame:\n${detalhes}`);
        carregarAlunos();
      } else {
        window.alert('Não encontrado no Gatame.');
      }
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível consultar o Gatame agora.');
    } finally {
      setVerificandoGatame(false);
    }
  }

  async function cadastrarNoGatame() {
    if (!selecionadoId) return;
    if (!window.confirm(`Cadastrar ${alunoSelecionado?.nome || 'este aluno'} como aluno novo no Gatame?`)) return;

    setCadastrandoGatame(true);

    try {
      await api.post(`/admin/alunos/${selecionadoId}/cadastrar-gatame`);
      carregarAlunos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível cadastrar o aluno no Gatame agora.');
    } finally {
      setCadastrandoGatame(false);
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Alunos</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/alunos/novo')}
        onEditar={() => navigate(`/admin/alunos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        podeExcluir={!!selecionadoId && perfil === 'admin'}
        onAtualizar={carregarAlunos}
        extra={
          <>
            <CButton
              color="secondary"
              variant="outline"
              disabled={!selecionadoId}
              onClick={() => setMatriculando((prev) => !prev)}
              title="Matricular"
            >
              <CIcon icon={cilSchool} />
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              disabled={!selecionadoId}
              onClick={() => navigate(`/admin/contratos/novo?alunoId=${selecionadoId}`)}
              title="Novo contrato (plano)"
            >
              <CIcon icon={cilNotes} />
            </CButton>
            <CButton
              color="info"
              variant="outline"
              disabled={!selecionadoId || verificandoGatame}
              onClick={verificarGatame}
              title={verificandoGatame ? 'Verificando...' : 'Verificar no Gatame'}
            >
              <CIcon icon={cilSearch} />
            </CButton>
            <CButton
              color="success"
              variant="outline"
              disabled={!selecionadoId || cadastrandoGatame || alunoSelecionado?.cadastradoNoGatame}
              onClick={cadastrarNoGatame}
              title={
                cadastrandoGatame
                  ? 'Cadastrando...'
                  : alunoSelecionado?.cadastradoNoGatame
                    ? 'Já cadastrado no Gatame'
                    : 'Cadastrar no Gatame'
              }
            >
              <CIcon icon={cilUserPlus} />
            </CButton>
          </>
        }
      />

      {matriculando && (
        <CInputGroup className="mb-3" style={{ maxWidth: 420 }}>
          <CFormSelect value={turmaSelecionada} onChange={(event) => setTurmaSelecionada(event.target.value)}>
            <option value="">Selecione a turma</option>
            {turmasParaMatricula.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </CFormSelect>
          <CButton color="primary" onClick={handleMatricular}>
            Confirmar
          </CButton>
        </CInputGroup>
      )}

      <div className="d-flex flex-wrap gap-2 mb-3">
        <CFormInput
          style={{ maxWidth: 360 }}
          placeholder="Buscar por nome, email ou CPF..."
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
        <CFormSelect
          style={{ maxWidth: 240 }}
          value={turmaFiltro}
          onChange={(event) => setTurmaFiltro(event.target.value)}
        >
          <option value="">Todas as turmas</option>
          {turmasDoFiltro.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome}
            </option>
          ))}
        </CFormSelect>
        {unidades.length > 1 && (
          <CFormSelect style={{ maxWidth: 220 }} value={unidadeFiltro} onChange={(event) => setUnidadeFiltro(event.target.value)}>
            <option value="">Todas as unidades</option>
            {unidades.map((unidade) => (
              <option key={unidade.id} value={unidade.id}>
                {unidade.nome}
              </option>
            ))}
          </CFormSelect>
        )}
        <CFormSelect style={{ maxWidth: 200 }} value={situacaoFiltro} onChange={(event) => setSituacaoFiltro(event.target.value)}>
          <option value="ativo">Ativos</option>
          <option value="trancado">Trancados</option>
          <option value="cancelado">Cancelados</option>
          <option value="">Todas as situações</option>
        </CFormSelect>
      </div>

      <AdminDataTable
        rows={alunosFiltrados}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage={turmaFiltro ? 'Nenhum aluno matriculado nessa turma.' : 'Nenhum aluno encontrado.'}
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'email', label: 'Email', sortable: true, render: (aluno) => aluno.email || '-' },
          { key: 'telefone', label: 'Telefone', render: (aluno) => aluno.telefone || '-' },
          {
            key: 'faixa',
            label: 'Faixa',
            sortable: true,
            sortValue: (aluno) => aluno.faixa?.nome || '',
            render: (aluno) =>
              aluno.faixa ? (
                <span className="d-flex align-items-center gap-2">
                  <span
                    style={{
                      display: 'inline-block',
                      width: '1rem',
                      height: '1rem',
                      borderRadius: '50%',
                      background: aluno.faixa.cor,
                      border: '1px solid rgba(0,0,0,0.15)',
                      flexShrink: 0,
                    }}
                  />
                  {aluno.faixa.nome}
                </span>
              ) : (
                '-'
              ),
          },
          {
            key: 'responsavel',
            label: 'Responsável',
            sortable: true,
            sortValue: (aluno) => aluno.responsavel?.nome || '',
            render: (aluno) => aluno.responsavel?.nome || '-',
          },
          ...(unidades.length > 1
            ? [
                {
                  key: 'unidade',
                  label: 'Unidade',
                  sortable: true,
                  sortValue: (aluno) => aluno.unidade?.nome || '',
                  render: (aluno) => aluno.unidade?.nome || '-',
                },
              ]
            : []),
          {
            key: 'situacao',
            label: 'Situação',
            sortable: true,
            render: (aluno) => (
              <span className={`badge ${SITUACOES[aluno.situacao]?.classe || 'text-bg-secondary'}`}>
                {SITUACOES[aluno.situacao]?.label || aluno.situacao}
              </span>
            ),
          },
          {
            key: 'turmas',
            label: 'Turmas',
            sortable: true,
            sortValue: (aluno) => (aluno.turmas || []).map((t) => t.nome).join(', '),
            render: (aluno) => (aluno.turmas || []).map((t) => t.nome).join(', ') || '-',
          },
          {
            key: 'cadastradoNoGatame',
            label: 'Gatame',
            sortable: true,
            render: (aluno) =>
              aluno.cadastradoNoGatame ? (
                <span className="text-success small">Cadastrado</span>
              ) : (
                <span className="text-body-secondary small">Não cadastrado</span>
              ),
          },
        ]}
      />
    </div>
  );
}
