import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CFormInput, CFormSelect, CButton, CInputGroup } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilSchool, cilSearch, cilUserPlus } from '@coreui/icons';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

export default function Alunos() {
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [busca, setBusca] = useState('');
  const [turmaFiltro, setTurmaFiltro] = useState('');
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
    const res = await api.get('/admin/alunos', { params: busca ? { busca } : {} });
    setAlunos(res.data);
  }

  useEffect(() => {
    carregarAlunos();
    api.get('/admin/turmas').then((res) => setTurmas(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      carregarAlunos();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
    setMatriculando(false);
  }

  // Filtrar por turma esconde linhas sem trocar a lista carregada — se o aluno selecionado saía de
  // vista, os botões da toolbar continuavam habilitados apontando pra uma linha que já não aparece.
  useEffect(() => {
    setSelecionadoId(null);
  }, [turmaFiltro]);

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
            {turmas.map((turma) => (
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
          placeholder="Buscar por nome ou email..."
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
        />
        <CFormSelect
          style={{ maxWidth: 240 }}
          value={turmaFiltro}
          onChange={(event) => setTurmaFiltro(event.target.value)}
        >
          <option value="">Todas as turmas</option>
          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome}
            </option>
          ))}
        </CFormSelect>
      </div>

      <AdminDataTable
        rows={alunosFiltrados}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage={turmaFiltro ? 'Nenhum aluno matriculado nessa turma.' : 'Nenhum aluno encontrado.'}
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'email', label: 'Email', sortable: true },
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
            key: 'ativo',
            label: 'Status',
            sortable: true,
            render: (aluno) => (
              <span className={`badge ${aluno.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                {aluno.ativo ? 'Ativo' : 'Inativo'}
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
