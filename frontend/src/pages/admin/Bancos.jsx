import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal.jsx';
import { IconPlus } from '../../components/icons.jsx';

const TIPOS_CHAVE = ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'];

const estadoInicial = { nome: '', chavePix: '', tipoChave: TIPOS_CHAVE[2], titular: '' };

export default function Bancos() {
  const [bancos, setBancos] = useState([]);
  const [form, setForm] = useState(estadoInicial);
  const [editandoId, setEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState(null);

  async function carregarBancos() {
    const res = await api.get('/admin/bancos');
    setBancos(res.data);
  }

  useEffect(() => {
    carregarBancos();
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

  function iniciarEdicao(banco) {
    setEditandoId(banco.id);
    setForm({
      nome: banco.nome,
      chavePix: banco.chavePix,
      tipoChave: banco.tipoChave,
      titular: banco.titular,
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

    try {
      if (editandoId) {
        await api.put(`/admin/bancos/${editandoId}`, form);
      } else {
        await api.post('/admin/bancos', form);
      }
      fecharModal();
      carregarBancos();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar configuração Pix.');
    }
  }

  async function handleRemover(id) {
    if (!window.confirm('Tem certeza que deseja excluir esta configuração Pix?')) return;
    await api.delete(`/admin/bancos/${id}`);
    carregarBancos();
  }

  return (
    <div>
      <div className="admin__header">
        <h1 className="admin__title">Configuração Pix</h1>
        <button type="button" className="btn btn--primary" onClick={abrirNovo}>
          <IconPlus style={{ verticalAlign: '-3px', marginRight: '0.4rem' }} />
          Nova configuração
        </button>
      </div>

      <p className="tile__meta" style={{ marginBottom: '1.25rem' }}>
        A conta Pix usada para gerar o QR code de pagamento dos eventos é a primeira desta lista.
      </p>

      {modalAberto && (
        <Modal title={editandoId ? 'Editar configuração Pix' : 'Nova configuração Pix'} onClose={fecharModal}>
          <form className="form form--inline" onSubmit={handleSubmit}>
            <label className="form__field">
              <span>Nome</span>
              <input name="nome" value={form.nome} onChange={handleChange} required />
            </label>
            <label className="form__field">
              <span>Titular</span>
              <input name="titular" value={form.titular} onChange={handleChange} required />
            </label>
            <label className="form__field">
              <span>Tipo de chave</span>
              <select name="tipoChave" value={form.tipoChave} onChange={handleChange} required>
                {TIPOS_CHAVE.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </label>
            <label className="form__field">
              <span>Chave Pix</span>
              <input name="chavePix" value={form.chavePix} onChange={handleChange} required />
            </label>
            <div className="form__actions">
              <button type="submit" className="btn btn--primary">
                {editandoId ? 'Salvar alterações' : 'Adicionar configuração'}
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
              <th>Titular</th>
              <th>Tipo de chave</th>
              <th>Chave Pix</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {bancos.map((banco) => (
              <tr key={banco.id}>
                <td>{banco.nome}</td>
                <td>{banco.titular}</td>
                <td>{banco.tipoChave}</td>
                <td>{banco.chavePix}</td>
                <td className="data-table__actions">
                  <button type="button" className="btn btn--small" onClick={() => iniciarEdicao(banco)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => handleRemover(banco.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {bancos.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhuma configuração Pix cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
