import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal.jsx';
import { IconPlus } from '../../components/icons.jsx';

const CORES = [
  { nome: 'Branca', hex: '#FFFFFF' },
  { nome: 'Cinza', hex: '#808080' },
  { nome: 'Amarela', hex: '#FFFF00' },
  { nome: 'Laranja', hex: '#FFA500' },
  { nome: 'Vermelha', hex: '#FF2C2C' },
  { nome: 'Azul', hex: '#0000FF' },
  { nome: 'Verde', hex: '#008000' },
  { nome: 'Roxa', hex: '#800080' },
  { nome: 'Marrom', hex: '#8B4513' },
  { nome: 'Preta', hex: '#000000' },
  { nome: 'Branca/Vermelha', hex: 'linear-gradient(135deg, #FFFFFF 50%, #FF2C2C 50%)' },
];

const CORES_QUE_EXIGEM_GRAU = ['#000000', 'linear-gradient(135deg, #FFFFFF 50%, #FF2C2C 50%)'];

const estadoInicial = {
  nome: '',
  cor: CORES[0].hex,
  grau: '',
  ordem: 0,
  ativo: true,
};

export default function Faixas() {
  const [faixas, setFaixas] = useState([]);
  const [form, setForm] = useState(estadoInicial);
  const [editandoId, setEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState(null);

  async function carregarFaixas() {
    const res = await api.get('/admin/faixas');
    setFaixas(res.data);
  }

  useEffect(() => {
    carregarFaixas();
  }, []);

  const grauObrigatorio = CORES_QUE_EXIGEM_GRAU.includes(form.cor);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function selecionarCor(hex) {
    setForm((prev) => ({ ...prev, cor: hex }));
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(estadoInicial);
    setModalAberto(true);
  }

  function iniciarEdicao(faixa) {
    setEditandoId(faixa.id);
    setForm({
      nome: faixa.nome,
      cor: faixa.cor,
      grau: faixa.grau ?? '',
      ordem: faixa.ordem,
      ativo: faixa.ativo,
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

    const payload = {
      ...form,
      ordem: Number(form.ordem),
      grau: grauObrigatorio && form.grau !== '' ? Number(form.grau) : null,
    };

    try {
      if (editandoId) {
        await api.put(`/admin/faixas/${editandoId}`, payload);
      } else {
        await api.post('/admin/faixas', payload);
      }
      fecharModal();
      carregarFaixas();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar faixa.');
    }
  }

  async function handleRemover(id) {
    if (!window.confirm('Tem certeza que deseja excluir esta faixa?')) return;
    await api.delete(`/admin/faixas/${id}`);
    carregarFaixas();
  }

  return (
    <div>
      <div className="admin__header">
        <h1 className="admin__title">Faixas</h1>
        <button type="button" className="btn btn--primary" onClick={abrirNovo}>
          <IconPlus style={{ verticalAlign: '-3px', marginRight: '0.4rem' }} />
          Nova faixa
        </button>
      </div>

      {modalAberto && (
        <Modal title={editandoId ? 'Editar faixa' : 'Nova faixa'} onClose={fecharModal}>
          <form className="form form--inline" onSubmit={handleSubmit}>
            <label className="form__field">
              <span>Nome</span>
              <input name="nome" value={form.nome} onChange={handleChange} required />
            </label>
            <label className="form__field">
              <span>Grau {grauObrigatorio ? '' : '(opcional)'}</span>
              <input
                type="number"
                name="grau"
                min="0"
                value={form.grau}
                onChange={handleChange}
                required={grauObrigatorio}
              />
            </label>
            <label className="form__field">
              <span>Ordem</span>
              <input type="number" name="ordem" value={form.ordem} onChange={handleChange} required />
            </label>
            <label className="form__field form__field--checkbox">
              <input type="checkbox" name="ativo" checked={form.ativo} onChange={handleChange} />
              <span>Ativa</span>
            </label>

            <div className="form__field form__field--wide">
              <span>Cor da faixa</span>
              <div className="cor-picker">
                {CORES.map((cor) => (
                  <button
                    key={cor.nome}
                    type="button"
                    className={`cor-swatch ${form.cor === cor.hex ? 'is-selected' : ''}`}
                    style={{ background: cor.hex }}
                    title={cor.nome}
                    aria-label={cor.nome}
                    onClick={() => selecionarCor(cor.hex)}
                  />
                ))}
              </div>
            </div>

            <div className="form__actions">
              <button type="submit" className="btn btn--primary">
                {editandoId ? 'Salvar alterações' : 'Adicionar faixa'}
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
              <th>Cor</th>
              <th>Nome</th>
              <th>Grau</th>
              <th>Ordem</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((faixa) => (
              <tr key={faixa.id}>
                <td>
                  <span className="cor-swatch cor-swatch--sm" style={{ background: faixa.cor }} />
                </td>
                <td>{faixa.nome}</td>
                <td>{faixa.grau ?? '-'}</td>
                <td>{faixa.ordem}</td>
                <td>{faixa.ativo ? 'Ativa' : 'Inativa'}</td>
                <td className="data-table__actions">
                  <button type="button" className="btn btn--small" onClick={() => iniciarEdicao(faixa)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => handleRemover(faixa.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {faixas.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhuma faixa cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
