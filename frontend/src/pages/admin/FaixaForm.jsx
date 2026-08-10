import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { IconBack } from '../../components/icons.jsx';

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

export default function FaixaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [erro, setErro] = useState(null);

  const grauObrigatorio = CORES_QUE_EXIGEM_GRAU.includes(form.cor);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/faixas/${id}`).then((res) => {
      const faixa = res.data;
      setForm({
        nome: faixa.nome,
        cor: faixa.cor,
        grau: faixa.grau ?? '',
        ordem: faixa.ordem,
        ativo: faixa.ativo,
      });
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function selecionarCor(hex) {
    setForm((prev) => ({ ...prev, cor: hex }));
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
      if (editando) {
        await api.put(`/admin/faixas/${id}`, payload);
      } else {
        await api.post('/admin/faixas', payload);
      }
      navigate('/admin/faixas');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar faixa.');
    }
  }

  return (
    <div>
      <Link to="/admin/faixas" className="form-page__back">
        <IconBack /> Voltar
      </Link>
      <h1 className="admin__title">{editando ? 'Editar faixa' : 'Nova faixa'}</h1>

      <div className="form-page">
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
              {editando ? 'Salvar alterações' : 'Adicionar faixa'}
            </button>
            <Link to="/admin/faixas" className="btn btn--ghost">
              Cancelar
            </Link>
          </div>
          {erro && <p className="alert alert--error">{erro}</p>}
        </form>
      </div>
    </div>
  );
}
