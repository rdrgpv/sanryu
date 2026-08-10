import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  valorComCarteirinha: '',
  valorSemCarteirinha: '',
};

export default function Faixas() {
  const navigate = useNavigate();
  const [faixas, setFaixas] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

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
      valorComCarteirinha: faixa.valorComCarteirinha ?? '',
      valorSemCarteirinha: faixa.valorSemCarteirinha ?? '',
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
      valorComCarteirinha: form.valorComCarteirinha !== '' ? Number(form.valorComCarteirinha) : null,
      valorSemCarteirinha: form.valorSemCarteirinha !== '' ? Number(form.valorSemCarteirinha) : null,
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
    await api.delete(`/admin/faixas/${selecionadoId}`);
    setSelecionadoId(null);
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
            <label className="form__field">
              <span>Valor do exame (com carteirinha)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="valorComCarteirinha"
                value={form.valorComCarteirinha}
                onChange={handleChange}
              />
            </label>
            <label className="form__field">
              <span>Valor do exame (sem carteirinha)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="valorSemCarteirinha"
                value={form.valorSemCarteirinha}
                onChange={handleChange}
              />
            </label>

      <Toolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/faixas/novo')}
        onEditar={() => navigate(`/admin/faixas/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarFaixas}
      />

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cor</th>
              <th>Nome</th>
              <th>Grau</th>
              <th>Ordem</th>
              <th>Valor c/ carteirinha</th>
              <th>Valor s/ carteirinha</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((faixa) => (
              <tr
                key={faixa.id}
                className={selecionadoId === faixa.id ? 'is-selected' : ''}
                onClick={() => selecionarLinha(faixa.id)}
              >
                <td>
                  <span className="cor-swatch cor-swatch--sm" style={{ background: faixa.cor }} />
                </td>
                <td>{faixa.nome}</td>
                <td>{faixa.grau ?? '-'}</td>
                <td>{faixa.ordem}</td>
                <td>{faixa.valorComCarteirinha != null ? `R$ ${Number(faixa.valorComCarteirinha).toFixed(2)}` : '-'}</td>
                <td>{faixa.valorSemCarteirinha != null ? `R$ ${Number(faixa.valorSemCarteirinha).toFixed(2)}` : '-'}</td>
                <td>{faixa.ativo ? 'Ativa' : 'Inativa'}</td>
              </tr>
            ))}
            {faixas.length === 0 && (
              <tr>
                <td colSpan={8}>Nenhuma faixa cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
