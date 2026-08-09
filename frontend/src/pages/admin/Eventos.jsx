import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal.jsx';
import { IconPlus } from '../../components/icons.jsx';

const STATUS = ['agendado', 'realizado', 'cancelado'];

const estadoInicial = {
  nome: '',
  descricao: '',
  tipoEventoId: '',
  data: '',
  local: '',
  status: STATUS[0],
  valor: '',
  publicado: false,
};

function paraInputDatetime(iso) {
  if (!iso) return '';
  const data = new Date(iso);
  const offsetMs = data.getTimezoneOffset() * 60000;
  return new Date(data.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [form, setForm] = useState(estadoInicial);
  const [editandoId, setEditandoId] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState(null);

  const [eventoInscricoes, setEventoInscricoes] = useState(null);
  const [inscricoes, setInscricoes] = useState([]);

  async function carregarEventos() {
    const res = await api.get('/admin/eventos');
    setEventos(res.data);
  }

  useEffect(() => {
    carregarEventos();
    api.get('/admin/tipos-evento').then((res) => setTiposEvento(res.data));
  }, []);

  const tipoSelecionado = tiposEvento.find((tipo) => String(tipo.id) === String(form.tipoEventoId));
  const mostrarValor = Boolean(tipoSelecionado?.cobravel) && Number(form.tipoEventoId) !== 1;

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function abrirNovo() {
    setEditandoId(null);
    setForm(estadoInicial);
    setModalAberto(true);
  }

  function iniciarEdicao(evento) {
    setEditandoId(evento.id);
    setForm({
      nome: evento.nome,
      descricao: evento.descricao || '',
      tipoEventoId: evento.tipoEventoId,
      data: paraInputDatetime(evento.data),
      local: evento.local || '',
      status: evento.status,
      valor: evento.valor ?? '',
      publicado: evento.publicado,
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
      tipoEventoId: Number(form.tipoEventoId),
      valor: mostrarValor && form.valor !== '' ? Number(form.valor) : null,
    };

    try {
      if (editandoId) {
        await api.put(`/admin/eventos/${editandoId}`, payload);
      } else {
        await api.post('/admin/eventos', payload);
      }
      fecharModal();
      carregarEventos();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar evento.');
    }
  }

  async function handleRemover(id) {
    if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;
    await api.delete(`/admin/eventos/${id}`);
    carregarEventos();
  }

  async function abrirInscricoes(evento) {
    setEventoInscricoes(evento);
    const res = await api.get(`/admin/eventos/${evento.id}/inscricoes`);
    setInscricoes(res.data);
  }

  function fecharInscricoes() {
    setEventoInscricoes(null);
    setInscricoes([]);
  }

  return (
    <div>
      <div className="admin__header">
        <h1 className="admin__title">Eventos</h1>
        <button type="button" className="btn btn--primary" onClick={abrirNovo}>
          <IconPlus style={{ verticalAlign: '-3px', marginRight: '0.4rem' }} />
          Novo evento
        </button>
      </div>

      {modalAberto && (
        <Modal title={editandoId ? 'Editar evento' : 'Novo evento'} onClose={fecharModal}>
          <form className="form form--inline" onSubmit={handleSubmit}>
            <label className="form__field">
              <span>Nome</span>
              <input name="nome" value={form.nome} onChange={handleChange} required />
            </label>
            <label className="form__field">
              <span>Tipo de evento</span>
              <select name="tipoEventoId" value={form.tipoEventoId} onChange={handleChange} required>
                <option value="">Selecione</option>
                {tiposEvento.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="form__field">
              <span>Data e hora</span>
              <input type="datetime-local" name="data" value={form.data} onChange={handleChange} required />
            </label>
            <label className="form__field">
              <span>Local</span>
              <input name="local" value={form.local} onChange={handleChange} />
            </label>
            <label className="form__field">
              <span>Status</span>
              <select name="status" value={form.status} onChange={handleChange}>
                {STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            {mostrarValor && (
              <label className="form__field">
                <span>Valor</span>
                <input type="number" step="0.01" min="0" name="valor" value={form.valor} onChange={handleChange} />
              </label>
            )}
            <label className="form__field form__field--checkbox">
              <input type="checkbox" name="publicado" checked={form.publicado} onChange={handleChange} />
              <span>Publicado</span>
            </label>
            <label className="form__field form__field--wide">
              <span>Descrição</span>
              <textarea name="descricao" rows={3} value={form.descricao} onChange={handleChange} />
            </label>
            <div className="form__actions">
              <button type="submit" className="btn btn--primary">
                {editandoId ? 'Salvar alterações' : 'Adicionar evento'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={fecharModal}>
                Cancelar
              </button>
            </div>
            {erro && <p className="alert alert--error">{erro}</p>}
          </form>
        </Modal>
      )}

      {eventoInscricoes && (
        <Modal title={`Inscrições — ${eventoInscricoes.nome}`} onClose={fecharInscricoes}>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Faixa</th>
                  <th>Valor</th>
                  <th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {inscricoes.map((inscricao) => (
                  <tr key={inscricao.id}>
                    <td>{inscricao.nome || '-'}</td>
                    <td>{inscricao.email}</td>
                    <td>{inscricao.faixa || '-'}</td>
                    <td>{inscricao.valorCobrado != null ? `R$ ${Number(inscricao.valorCobrado).toFixed(2)}` : '-'}</td>
                    <td>{inscricao.statusPagamento}</td>
                  </tr>
                ))}
                {inscricoes.length === 0 && (
                  <tr>
                    <td colSpan={5}>Nenhuma inscrição registrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Data</th>
              <th>Local</th>
              <th>Status</th>
              <th>Valor</th>
              <th>Publicado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((evento) => (
              <tr key={evento.id}>
                <td>{evento.nome}</td>
                <td>{evento.tipoEvento?.nome || '-'}</td>
                <td>{new Date(evento.data).toLocaleString('pt-BR')}</td>
                <td>{evento.local || '-'}</td>
                <td>{evento.status}</td>
                <td>{evento.valor != null ? `R$ ${Number(evento.valor).toFixed(2)}` : '-'}</td>
                <td>{evento.publicado ? 'Sim' : 'Não'}</td>
                <td className="data-table__actions">
                  <button type="button" className="btn btn--small" onClick={() => iniciarEdicao(evento)}>
                    Editar
                  </button>
                  <button type="button" className="btn btn--small" onClick={() => abrirInscricoes(evento)}>
                    Inscrições
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => handleRemover(evento.id)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {eventos.length === 0 && (
              <tr>
                <td colSpan={8}>Nenhum evento cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
