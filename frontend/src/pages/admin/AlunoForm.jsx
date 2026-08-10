import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { IconBack } from '../../components/icons.jsx';

const estadoInicial = {
  nome: '',
  email: '',
  telefone: '',
  dataNascimento: '',
  faixa: 'Branca',
  ativo: true,
};

export default function AlunoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/alunos/${id}`).then((res) => {
      const aluno = res.data;
      setForm({
        nome: aluno.nome,
        email: aluno.email,
        telefone: aluno.telefone || '',
        dataNascimento: aluno.dataNascimento || '',
        faixa: aluno.faixa,
        ativo: aluno.ativo,
      });
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    try {
      if (editando) {
        await api.put(`/admin/alunos/${id}`, form);
      } else {
        await api.post('/admin/alunos', form);
      }
      navigate('/admin/alunos');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar aluno.');
    }
  }

  return (
    <div>
      <Link to="/admin/alunos" className="form-page__back">
        <IconBack /> Voltar
      </Link>
      <h1 className="admin__title">{editando ? 'Editar aluno' : 'Novo aluno'}</h1>

      <div className="form-page">
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
              {editando ? 'Salvar alterações' : 'Adicionar aluno'}
            </button>
            <Link to="/admin/alunos" className="btn btn--ghost">
              Cancelar
            </Link>
          </div>
          {erro && <p className="alert alert--error">{erro}</p>}
        </form>
      </div>
    </div>
  );
}
