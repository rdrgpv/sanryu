import { useEffect, useState } from 'react';
import api from '../../services/api';

const estadoInicial = {
  nome: '',
  email: '',
  telefone: '',
  dataNascimento: '',
  faixa: 'Branca',
  ativo: true,
};

export default function Alunos() {
  const [alunos, setAlunos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(estadoInicial);
  const [editandoId, setEditandoId] = useState(null);
  const [matriculandoId, setMatriculandoId] = useState(null);
  const [turmaSelecionada, setTurmaSelecionada] = useState('');
  const [erro, setErro] = useState(null);

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

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function iniciarEdicao(aluno) {
    setEditandoId(aluno.id);
    setForm({
      nome: aluno.nome,
      email: aluno.email,
      telefone: aluno.telefone || '',
      dataNascimento: aluno.dataNascimento || '',
      faixa: aluno.faixa,
      ativo: aluno.ativo,
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setForm(estadoInicial);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    try {
      if (editandoId) {
        await api.put(`/admin/alunos/${editandoId}`, form);
      } else {
        await api.post('/admin/alunos', form);
      }
      cancelarEdicao();
      carregarAlunos();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar aluno.');
    }
  }

  async function handleRemover(id) {
    if (!window.confirm('Tem certeza que deseja excluir este aluno?')) return;
    await api.delete(`/admin/alunos/${id}`);
    carregarAlunos();
  }

  async function handleMatricular(alunoId) {
    if (!turmaSelecionada) return;
    await api.post(`/admin/alunos/${alunoId}/matricular`, { turmaId: turmaSelecionada });
    setMatriculandoId(null);
    setTurmaSelecionada('');
    carregarAlunos();
  }

  return (
    <div>
      <h1 className="admin__title">Alunos</h1>

      <form className="form form--inline" onSubmit={handleSubmit}>
        <label className="form__field">
          <span>Nome</span>
          <input name="nome" value={form.nome} onChange={handleChange} required />
        </label>
        <label className="form__field">
          <span>Email</span>
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </label>
        <label className="form__field">
          <span>Telefone</span>
          <input name="telefone" value={form.telefone} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Nascimento</span>
          <input type="date" name="dataNascimento" value={form.dataNascimento} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Faixa</span>
          <input name="faixa" value={form.faixa} onChange={handleChange} />
        </label>
        <label className="form__field form__field--checkbox">
          <input type="checkbox" name="ativo" checked={form.ativo} onChange={handleChange} />
          <span>Ativo</span>
        </label>
        <div className="form__actions">
          <button type="submit" className="btn btn--primary">
            {editandoId ? 'Salvar alterações' : 'Adicionar aluno'}
          </button>
          {editandoId && (
            <button type="button" className="btn btn--ghost" onClick={cancelarEdicao}>
              Cancelar
            </button>
          )}
        </div>
        {erro && <p className="alert alert--error">{erro}</p>}
      </form>

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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((aluno) => (
              <tr key={aluno.id}>
                <td>{aluno.nome}</td>
                <td>{aluno.email}</td>
                <td>{aluno.telefone || '-'}</td>
                <td>{aluno.faixa}</td>
                <td>{aluno.ativo ? 'Ativo' : 'Inativo'}</td>
                <td>{(aluno.turmas || []).map((t) => t.nome).join(', ') || '-'}</td>
                <td className="data-table__actions">
                  <button type="button" className="btn btn--small" onClick={() => iniciarEdicao(aluno)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={() => setMatriculandoId(matriculandoId === aluno.id ? null : aluno.id)}
                  >
                    Matricular
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => handleRemover(aluno.id)}
                  >
                    Excluir
                  </button>

                  {matriculandoId === aluno.id && (
                    <div className="matricula-box">
                      <select
                        value={turmaSelecionada}
                        onChange={(event) => setTurmaSelecionada(event.target.value)}
                      >
                        <option value="">Selecione a turma</option>
                        {turmas.map((turma) => (
                          <option key={turma.id} value={turma.id}>
                            {turma.nome}
                          </option>
                        ))}
                      </select>
                      <button type="button" className="btn btn--small btn--primary" onClick={() => handleMatricular(aluno.id)}>
                        Confirmar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {alunos.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhum aluno encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
