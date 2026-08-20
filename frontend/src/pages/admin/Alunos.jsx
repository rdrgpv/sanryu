import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CFormInput,
  CFormSelect,
  CButton,
  CInputGroup,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPeople } from '@coreui/icons';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';

export default function Alunos() {
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [matriculando, setMatriculando] = useState(false);
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [verificandoGatame, setVerificandoGatame] = useState(false);
  const [cadastrandoGatame, setCadastrandoGatame] = useState(false);

  const alunoSelecionado = alunos.find((aluno) => aluno.id === selecionadoId) || null;

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
            >
              <CIcon icon={cilPeople} className="me-1" />
              Matricular
            </CButton>
            <CButton color="info" variant="outline" disabled={!selecionadoId || verificandoGatame} onClick={verificarGatame}>
              {verificandoGatame ? 'Verificando...' : 'Verificar no Gatame'}
            </CButton>
            <CButton
              color="success"
              variant="outline"
              disabled={!selecionadoId || cadastrandoGatame || alunoSelecionado?.cadastradoNoGatame}
              onClick={cadastrarNoGatame}
            >
              {cadastrandoGatame
                ? 'Cadastrando...'
                : alunoSelecionado?.cadastradoNoGatame
                  ? 'Já cadastrado no Gatame'
                  : 'Cadastrar no Gatame'}
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

      <CFormInput
        className="mb-3"
        style={{ maxWidth: 360 }}
        placeholder="Buscar por nome ou email..."
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
      />

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Nome</CTableHeaderCell>
            <CTableHeaderCell>Email</CTableHeaderCell>
            <CTableHeaderCell>Telefone</CTableHeaderCell>
            <CTableHeaderCell>Faixa</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
            <CTableHeaderCell>Turmas</CTableHeaderCell>
            <CTableHeaderCell>Gatame</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {alunos.map((aluno) => (
            <CTableRow key={aluno.id} active={selecionadoId === aluno.id} onClick={() => selecionarLinha(aluno.id)}>
              <CTableDataCell>{aluno.nome}</CTableDataCell>
              <CTableDataCell>{aluno.email}</CTableDataCell>
              <CTableDataCell>{aluno.telefone || '-'}</CTableDataCell>
              <CTableDataCell>
                {aluno.faixa ? (
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
                )}
              </CTableDataCell>
              <CTableDataCell>{aluno.ativo ? 'Ativo' : 'Inativo'}</CTableDataCell>
              <CTableDataCell>{(aluno.turmas || []).map((t) => t.nome).join(', ') || '-'}</CTableDataCell>
              <CTableDataCell>
                {aluno.cadastradoNoGatame ? (
                  <span className="text-success small">Cadastrado</span>
                ) : (
                  <span className="text-body-secondary small">Não cadastrado</span>
                )}
              </CTableDataCell>
            </CTableRow>
          ))}
          {alunos.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={7} className="text-body-secondary">
                Nenhum aluno encontrado.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
