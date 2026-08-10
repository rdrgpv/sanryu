import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/Modal.jsx';
import { IconPlus } from '../../components/icons.jsx';

const STATUS = ['agendado', 'realizado', 'cancelado'];

const BANNER_TAMANHO_MAXIMO = 4 * 1024 * 1024;

const estadoInicial = {
  nome: '',
  descricao: '',
  tipoEventoId: '',
  data: '',
  local: '',
  status: STATUS[0],
  valor: '',
  publicado: false,
  banner: '',
};

function paraInputDatetime(iso) {
  if (!iso) return '';
  const data = new Date(iso);
  const offsetMs = data.getTimezoneOffset() * 60000;
  return new Date(data.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatarData(valor) {
  if (!valor) return '-';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString('pt-BR');
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
      banner: evento.banner || '',
    });
    setModalAberto(true);
  }

  function handleBannerChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > BANNER_TAMANHO_MAXIMO) {
      setErro('A imagem do banner deve ter no máximo 4MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, banner: reader.result }));
    reader.readAsDataURL(file);
  }

  function removerBanner() {
    setForm((prev) => ({ ...prev, banner: '' }));
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

  async function copiarPix(texto) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch (err) {
      window.alert('Não foi possível copiar o código Pix.');
    }
  }

  async function verificarPagamento(id) {
    try {
      const res = await api.post(`/admin/inscricoes/${id}/verificar-pagamento`);
      setInscricoes((prev) => prev.map((inscricao) => (inscricao.id === id ? res.data : inscricao)));
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível verificar o pagamento agora.');
    }
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
            <div className="form__field form__field--wide">
              <span>Banner do evento</span>
              <input type="file" accept="image/*" onChange={handleBannerChange} />
              {form.banner && (
                <div style={{ marginTop: '0.5rem' }}>
                  <img
                    src={form.banner}
                    alt="Prévia do banner"
                    style={{ maxWidth: '100%', maxHeight: 160, display: 'block', marginBottom: '0.5rem' }}
                  />
                  <button type="button" className="btn btn--ghost btn--small" onClick={removerBanner}>
                    Remover banner
                  </button>
                </div>
              )}
            </div>
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
                  <th>Nascimento</th>
                  <th>Nº Carteirinha</th>
                  <th>Validade Carteirinha</th>
                  <th>Origem</th>
                  <th>Apto</th>
                  <th>Valor</th>
                  <th>Pagamento</th>
                  <th>QR Pix</th>
                  <th>Inscrito em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {inscricoes.map((inscricao) => (
                  <tr key={inscricao.id}>
                    <td>{inscricao.nome || '-'}</td>
                    <td>{inscricao.email}</td>
                    <td>{inscricao.faixa || '-'}</td>
                    <td>{formatarData(inscricao.dataNascimento)}</td>
                    <td>{inscricao.numeroCarteirinha || '-'}</td>
                    <td>{formatarData(inscricao.validadeCarteirinha)}</td>
                    <td>{inscricao.origemDados || '-'}</td>
                    <td>{inscricao.apto ? 'Sim' : 'Não'}</td>
                    <td>{inscricao.valorCobrado != null ? `R$ ${Number(inscricao.valorCobrado).toFixed(2)}` : '-'}</td>
                    <td>{inscricao.statusPagamento}</td>
                    <td>
                      {inscricao.qrcodePix ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <img src={inscricao.qrcodePix} alt="QR Pix" style={{ width: 40, height: 40 }} />
                          {inscricao.pixCopiaCola && (
                            <button
                              type="button"
                              className="btn btn--small"
                              onClick={() => copiarPix(inscricao.pixCopiaCola)}
                            >
                              Copiar
                            </button>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{new Date(inscricao.createdAt).toLocaleString('pt-BR')}</td>
                    <td>
                      {inscricao.mpPaymentId ? (
                        <button
                          type="button"
                          className="btn btn--small"
                          onClick={() => verificarPagamento(inscricao.id)}
                        >
                          Verificar pagamento
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
                {inscricoes.length === 0 && (
                  <tr>
                    <td colSpan={13}>Nenhuma inscrição registrada.</td>
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
              <th>Banner</th>
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
                <td>
                  {evento.banner ? (
                    <img src={evento.banner} alt="" style={{ width: 60, height: 40, objectFit: 'cover' }} />
                  ) : (
                    '-'
                  )}
                </td>
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
                <td colSpan={9}>Nenhum evento cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
