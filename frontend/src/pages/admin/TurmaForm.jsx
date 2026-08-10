import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { IconBack } from '../../components/icons.jsx';

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

export default function TurmaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [instrutores, setInstrutores] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api.get('/admin/instrutores').then((res) => setInstrutores(res.data));
  }, []);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/turmas/${id}`).then((res) => {
      const turma = res.data;
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
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    const payload = { ...form, vagas: Number(form.vagas), instrutorId: form.instrutorId || null };

    try {
      if (editando) {
        await api.put(`/admin/turmas/${id}`, payload);
      } else {
        await api.post('/admin/turmas', payload);
      }
      navigate('/admin/turmas');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar turma.');
    }
  }

  return (
    <div>
      <Link to="/admin/turmas" className="form-page__back">
        <IconBack /> Voltar
      </Link>
      <h1 className="admin__title">{editando ? 'Editar turma' : 'Nova turma'}</h1>

      <div className="form-page">
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
              {editando ? 'Salvar alterações' : 'Adicionar turma'}
            </button>
            <Link to="/admin/turmas" className="btn btn--ghost">
              Cancelar
            </Link>
          </div>
          {erro && <p className="alert alert--error">{erro}</p>}
        </form>
      </div>
    </div>
  );
}
