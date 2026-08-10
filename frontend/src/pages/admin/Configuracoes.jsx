import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal.jsx';
import { IconPlus } from '../../components/icons.jsx';

const estadoInicial = { sistema: 'SAN', parametro: '', valor: '', tipoParametro: 'S' };

export default function Configuracoes() {
  const [configuracoes, setConfiguracoes] = useState([]);
  const [form, setForm] = useState(estadoInicial);
  const [editandoId, setEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState(null);

  async function carregarConfiguracoes() {
    const res = await api.get('/admin/configuracoes');
    setConfiguracoes(res.data);
  }

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: name === 'sistema' ? value.toUpperCase() : value }));
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(estadoInicial);
    setModalAberto(true);
  }

  function iniciarEdicao(configuracao) {
    setEditandoId(configuracao.id);
    setForm({
      sistema: configuracao.sistema,
      parametro: configuracao.parametro,
      valor: configuracao.valor || '',
      tipoParametro: configuracao.tipoParametro,
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
        await api.put(`/admin/configuracoes/${editandoId}`, form);
      } else {
        await api.post('/admin/configuracoes', form);
      }
      fecharModal();
      carregarConfiguracoes();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar configuração.');
    }
  }

  async function handleRemover(id) {
    if (!window.confirm('Tem certeza que deseja excluir esta configuração?')) return;
    await api.delete(`/admin/configuracoes/${id}`);
    carregarConfiguracoes();
  }

  const campoSensivel = form.parametro.toUpperCase().includes('SENHA');

  return (
    <div>
      <div className="admin__header">
        <h1 className="admin__title">Configurações</h1>
        <button type="button" className="btn btn--primary" onClick={abrirNovo}>
          <IconPlus style={{ verticalAlign: '-3px', marginRight: '0.4rem' }} />
          Nova configuração
        </button>
      </div>

      <p className="tile__meta" style={{ marginBottom: '1.25rem' }}>
        Parâmetros gerais do sistema (ex.: credencial do Gatame — GATAME_URL, GATAME_EMAIL, GATAME_SENHA). As
        alterações valem imediatamente, sem precisar reiniciar o servidor.
      </p>

      {modalAberto && (
        <Modal title={editandoId ? 'Editar configuração' : 'Nova configuração'} onClose={fecharModal}>
          <form className="form form--inline" onSubmit={handleSubmit}>
            <label className="form__field">
              <span>Sistema</span>
              <input name="sistema" value={form.sistema} onChange={handleChange} maxLength={3} required />
            </label>
            <label className="form__field">
              <span>Parâmetro</span>
              <input name="parametro" value={form.parametro} onChange={handleChange} maxLength={50} required />
            </label>
            <label className="form__field">
              <span>Tipo</span>
              <input name="tipoParametro" value={form.tipoParametro} onChange={handleChange} maxLength={1} required />
            </label>
            <label className="form__field form__field--wide">
              <span>Valor</span>
              <input
                type={campoSensivel ? 'password' : 'text'}
                name="valor"
                value={form.valor}
                onChange={handleChange}
                maxLength={150}
              />
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
              <th>Sistema</th>
              <th>Parâmetro</th>
              <th>Valor</th>
              <th>Tipo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {configuracoes.map((configuracao) => (
              <tr key={configuracao.id}>
                <td>{configuracao.sistema}</td>
                <td>{configuracao.parametro}</td>
                <td>{configuracao.parametro.toUpperCase().includes('SENHA') ? '••••••••' : configuracao.valor || '-'}</td>
                <td>{configuracao.tipoParametro}</td>
                <td className="data-table__actions">
                  <button type="button" className="btn btn--small" onClick={() => iniciarEdicao(configuracao)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => handleRemover(configuracao.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {configuracoes.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhuma configuração cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
