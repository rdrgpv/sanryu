import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal.jsx';
import { IconPlus } from '../../components/icons.jsx';

const estadoInicial = { nome: '', cobravel: false };

export default function TiposEvento() {
  const [tipos, setTipos] = useState([]);
  const [form, setForm] = useState(estadoInicial);
  const [editandoId, setEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState(null);

  async function carregarTipos() {
    const res = await api.get('/admin/tipos-evento');
    setTipos(res.data);
  }

  useEffect(() => {
    carregarTipos();
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(estadoInicial);
    setModalAberto(true);
  }

  function iniciarEdicao(tipo) {
    setEditandoId(tipo.id);
    setForm({ nome: tipo.nome, cobravel: tipo.cobravel });
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

    try {
      if (editandoId) {
        await api.put(`/admin/tipos-evento/${editandoId}`, form);
      } else {
        await api.post('/admin/tipos-evento', form);
      }
      fecharModal();
      carregarTipos();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar tipo de evento.');
    }
  }

  async function handleRemover(tipo) {
    if (!window.confirm('Tem certeza que deseja excluir este tipo de evento?')) return;

    try {
      await api.delete(`/admin/tipos-evento/${tipo.id}`);
      carregarTipos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Erro ao excluir tipo de evento.');
    }
  }

  return (
    <div>
      <div className="admin__header">
        <h1 className="admin__title">Tipos de Evento</h1>
        <button type="button" className="btn btn--primary" onClick={abrirNovo}>
          <IconPlus style={{ verticalAlign: '-3px', marginRight: '0.4rem' }} />
          Novo tipo de evento
        </button>
      </div>

      {modalAberto && (
        <Modal title={editandoId ? 'Editar tipo de evento' : 'Novo tipo de evento'} onClose={fecharModal}>
          <form className="form form--inline" onSubmit={handleSubmit}>
            <label className="form__field">
              <span>Nome</span>
              <input name="nome" value={form.nome} onChange={handleChange} required />
            </label>
            <label className="form__field form__field--checkbox">
              <input type="checkbox" name="cobravel" checked={form.cobravel} onChange={handleChange} />
              <span>Cobrável</span>
            </label>
            <div className="form__actions">
              <button type="submit" className="btn btn--primary">
                {editandoId ? 'Salvar alterações' : 'Adicionar tipo de evento'}
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
              <th>Cobrável</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {tipos.map((tipo) => (
              <tr key={tipo.id}>
                <td>{tipo.nome}</td>
                <td>{tipo.cobravel ? 'Sim' : 'Não'}</td>
                <td className="data-table__actions">
                  <button type="button" className="btn btn--small" onClick={() => iniciarEdicao(tipo)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => handleRemover(tipo)}
                    disabled={tipo.id === 1}
                    title={tipo.id === 1 ? 'O tipo padrão "Exame de Faixa" não pode ser excluído.' : undefined}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {tipos.length === 0 && (
              <tr>
                <td colSpan={3}>Nenhum tipo de evento cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
