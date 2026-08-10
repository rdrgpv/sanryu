import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { IconBack } from '../../components/icons.jsx';

const estadoInicial = {
  nome: '',
  faixa: 'Preta',
  especialidade: '',
  bio: '',
  fotoUrl: '',
};

export default function InstrutorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/instrutores/${id}`).then((res) => {
      const instrutor = res.data;
      setForm({
        nome: instrutor.nome,
        faixa: instrutor.faixa,
        especialidade: instrutor.especialidade || '',
        bio: instrutor.bio || '',
        fotoUrl: instrutor.fotoUrl || '',
      });
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    try {
      if (editando) {
        await api.put(`/admin/instrutores/${id}`, form);
      } else {
        await api.post('/admin/instrutores', form);
      }
      navigate('/admin/instrutores');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar instrutor.');
    }
  }

  return (
    <div>
      <Link to="/admin/instrutores" className="form-page__back">
        <IconBack /> Voltar
      </Link>
      <h1 className="admin__title">{editando ? 'Editar instrutor' : 'Novo instrutor'}</h1>

      <div className="form-page">
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
              {editando ? 'Salvar alterações' : 'Adicionar instrutor'}
            </button>
            <Link to="/admin/instrutores" className="btn btn--ghost">
              Cancelar
            </Link>
          </div>
          {erro && <p className="alert alert--error">{erro}</p>}
        </form>
      </div>
    </div>
  );
}
