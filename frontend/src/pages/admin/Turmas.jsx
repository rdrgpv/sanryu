import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal.jsx';
import { IconPlus } from '../../components/icons.jsx';

const estadoInicial = {
  nome: '',
  modalidade: '',
  nivel: 'Todos os níveis',
  instrutorId: '',
  diaSemana: '',
  horaInicio: '',
  horaFim: '',
  vagas: 20,
};

export default function Turmas() {
  const [turmas, setTurmas] = useState([]);
  const [instrutores, setInstrutores] = useState([]);
  const [form, setForm] = useState(estadoInicial);
  const [editandoId, setEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState(null);

  async function carregarTurmas() {
    const res = await api.get('/admin/turmas');
    setTurmas(res.data);
  }

  useEffect(() => {
    carregarTurmas();
    api.get('/admin/instrutores').then((res) => setInstrutores(res.data));
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(estadoInicial);
    setModalAberto(true);
  }

  function iniciarEdicao(turma) {
    setEditandoId(turma.id);
    setForm({
      nome: turma.nome,
      modalidade: turma.modalidade,
      nivel: turma.nivel,
      instrutorId: turma.instrutorId || '',
      diaSemana: turma.diaSemana,
      horaInicio: turma.horaInicio,
      horaFim: turma.horaFim,
      vagas: turma.vagas,
    });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEditandoId(null);
    setForm(estadoInicial);
    setErro(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    const payload = { ...form, vagas: Number(form.vagas), instrutorId: form.instrutorId || null };

    try {
      if (editandoId) {
        await api.put(`/admin/turmas/${editandoId}`, payload);
      } else {
        await api.post('/admin/turmas', payload);
      }
      fecharModal();
      carregarTurmas();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar turma.');
    }
  }

  async function handleRemover(id) {
    if (!window.confirm('Tem certeza que deseja excluir esta turma?')) return;
    await api.delete(`/admin/turmas/${id}`);
    carregarTurmas();
  }

  return (
    <div>
      <div className="admin__header">
        <h1 className="admin__title">Turmas</h1>
        <button type="button" className="btn btn--primary" onClick={abrirNovo}>
          <IconPlus style={{ verticalAlign: '-3px', marginRight: '0.4rem' }} />
          Nova turma
        </button>
      </div>

      {modalAberto && (
        <Modal title={editandoId ? 'Editar turma' : 'Nova turma'} onClose={fecharModal}>
          <form className="form form--inline" onSubmit={handleSubmit}>
            <label className="form__field">
              <span>Nome</span>
              <input name="nome" value={form.nome} onChange={handleChange} required />
            </label>
            <label className="form__field">
              <span>Modalidade</span>
              <input name="modalidade" value={form.modalidade} onChange={handleChange} required />
            </label>
            <label className="form__field">
              <span>Nível</span>
              <input name="nivel" value={form.nivel} onChange={handleChange} />
            </label>
            <label className="form__field">
              <span>Instrutor</span>
              <select name="instrutorId" value={form.instrutorId} onChange={handleChange}>
                <option value="">Selecione</option>
                {instrutores.map((instrutor) => (
                  <option key={instrutor.id} value={instrutor.id}>
                    {instrutor.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="form__field">
              <span>Dias (ex: Segunda,Quarta)</span>
              <input name="diaSemana" value={form.diaSemana} onChange={handleChange} required />
            </label>
            <label className="form__field">
              <span>Início</span>
              <input type="time" name="horaInicio" value={form.horaInicio} onChange={handleChange} required />
            </label>
            <label className="form__field">
              <span>Fim</span>
              <input type="time" name="horaFim" value={form.horaFim} onChange={handleChange} required />
            </label>
            <label className="form__field">
              <span>Vagas</span>
              <input type="number" name="vagas" min="1" value={form.vagas} onChange={handleChange} />
            </label>
            <div className="form__actions">
              <button type="submit" className="btn btn--primary">
                {editandoId ? 'Salvar alterações' : 'Adicionar turma'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={fecharModal}>
                Cancelar
              </button>
            </div>
            {erro && <p className="alert alert--error">{erro}</p>}
          </form>
        </Modal>
      )}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Modalidade</th>
              <th>Nível</th>
              <th>Instrutor</th>
              <th>Dias</th>
              <th>Horário</th>
              <th>Vagas</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {turmas.map((turma) => (
              <tr key={turma.id}>
                <td>{turma.nome}</td>
                <td>{turma.modalidade}</td>
                <td>{turma.nivel}</td>
                <td>{turma.instrutor?.nome || '-'}</td>
                <td>{turma.diaSemana}</td>
                <td>
                  {turma.horaInicio} — {turma.horaFim}
                </td>
                <td>{turma.vagas}</td>
                <td className="data-table__actions">
                  <button type="button" className="btn btn--small" onClick={() => iniciarEdicao(turma)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => handleRemover(turma.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {turmas.length === 0 && (
              <tr>
                <td colSpan={8}>Nenhuma turma cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
