import { useEffect, useState } from 'react';
import api from '../../services/api';

const estadoInicial = {
  nome: '',
  faixa: 'Preta',
  especialidade: '',
  bio: '',
  fotoUrl: '',
};

export default function Instrutores() {
  const [instrutores, setInstrutores] = useState([]);
  const [form, setForm] = useState(estadoInicial);
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState(null);

  async function carregarInstrutores() {
    const res = await api.get('/admin/instrutores');
    setInstrutores(res.data);
  }

  useEffect(() => {
    carregarInstrutores();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function iniciarEdicao(instrutor) {
    setEditandoId(instrutor.id);
    setForm({
      nome: instrutor.nome,
      faixa: instrutor.faixa,
      especialidade: instrutor.especialidade || '',
      bio: instrutor.bio || '',
      fotoUrl: instrutor.fotoUrl || '',
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
        await api.put(`/admin/instrutores/${editandoId}`, form);
      } else {
        await api.post('/admin/instrutores', form);
      }
      cancelarEdicao();
      carregarInstrutores();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar instrutor.');
    }
  }

  async function handleRemover(id) {
    if (!window.confirm('Tem certeza que deseja excluir este instrutor?')) return;
    await api.delete(`/admin/instrutores/${id}`);
    carregarInstrutores();
  }

  return (
    <div>
      <h1 className="admin__title">Instrutores</h1>

      <form className="form form--inline" onSubmit={handleSubmit}>
        <label className="form__field">
          <span>Nome</span>
          <input name="nome" value={form.nome} onChange={handleChange} required />
        </label>
        <label className="form__field">
          <span>Faixa</span>
          <input name="faixa" value={form.faixa} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Especialidade</span>
          <input name="especialidade" value={form.especialidade} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Foto (URL)</span>
          <input name="fotoUrl" value={form.fotoUrl} onChange={handleChange} />
        </label>
        <label className="form__field form__field--wide">
          <span>Bio</span>
          <textarea name="bio" rows={2} value={form.bio} onChange={handleChange} />
        </label>
        <div className="form__actions">
          <button type="submit" className="btn btn--primary">
            {editandoId ? 'Salvar alterações' : 'Adicionar instrutor'}
          </button>
          {editandoId && (
            <button type="button" className="btn btn--ghost" onClick={cancelarEdicao}>
              Cancelar
            </button>
          )}
        </div>
        {erro && <p className="alert alert--error">{erro}</p>}
      </form>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Faixa</th>
              <th>Especialidade</th>
              <th>Bio</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {instrutores.map((instrutor) => (
              <tr key={instrutor.id}>
                <td>{instrutor.nome}</td>
                <td>{instrutor.faixa}</td>
                <td>{instrutor.especialidade || '-'}</td>
                <td className="data-table__bio">{instrutor.bio || '-'}</td>
                <td className="data-table__actions">
                  <button type="button" className="btn btn--small" onClick={() => iniciarEdicao(instrutor)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => handleRemover(instrutor.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {instrutores.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum instrutor cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
