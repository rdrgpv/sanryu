import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Toolbar from '../../components/Toolbar.jsx';

export default function Alunos() {
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [matriculando, setMatriculando] = useState(false);
  const [turmaSelecionada, setTurmaSelecionada] = useState('');

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

  return (
    <div>
      <h1 className="admin__title">Alunos</h1>

      <Toolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/alunos/novo')}
        onEditar={() => navigate(`/admin/alunos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarAlunos}
        extra={
          <button
            type="button"
            className="toolbar__btn"
            disabled={!selecionadoId}
            onClick={() => setMatriculando((prev) => !prev)}
          >
            Matricular
          </button>
        }
      />

      {matriculando && (
        <div className="matricula-box">
          <select value={turmaSelecionada} onChange={(event) => setTurmaSelecionada(event.target.value)}>
            <option value="">Selecione a turma</option>
            {turmas.map((turma) => (
              <option key={turma.id} value={turma.id}>
                {turma.nome}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn--small btn--primary" onClick={handleMatricular}>
            Confirmar matrícula
          </button>
        </div>
      )}

      <input
        className="search-input"
        placeholder="Buscar por nome ou email..."
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
      />

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Faixa</th>
              <th>Status</th>
              <th>Turmas</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((aluno) => (
              <tr
                key={aluno.id}
                className={selecionadoId === aluno.id ? 'is-selected' : ''}
                onClick={() => selecionarLinha(aluno.id)}
              >
                <td>{aluno.nome}</td>
                <td>{aluno.email}</td>
                <td>{aluno.telefone || '-'}</td>
                <td>{aluno.faixa}</td>
                <td>{aluno.ativo ? 'Ativo' : 'Inativo'}</td>
                <td>{(aluno.turmas || []).map((t) => t.nome).join(', ') || '-'}</td>
              </tr>
            ))}
            {alunos.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum aluno encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
