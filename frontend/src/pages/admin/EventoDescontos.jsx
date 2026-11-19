import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CBadge, CButton, CCard, CCardBody, CCol, CFormCheck, CFormInput, CFormLabel, CFormTextarea, CInputGroup, CInputGroupText, CRow } from '@coreui/react';
import api from '../../services/api';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { formatarMoeda } from '../../utils/formato.js';

const VAZIO = { email: '', nome: '', valor: '', motivo: '', carteirinhaPendente: true };

function situacaoDaInscricao(desconto) {
  const inscricao = desconto.inscricao;
  if (!inscricao) return <span className="text-body-secondary small">Ainda não se inscreveu — vale quando se inscrever</span>;
  return (
    <>
      <div>{inscricao.nome}</div>
      <div className="small text-body-secondary">
        {inscricao.valorOriginal != null && <s className="me-1">{formatarMoeda(inscricao.valorOriginal)}</s>}
        {formatarMoeda(inscricao.valorCobrado)} ·{' '}
        <CBadge color={inscricao.statusPagamento === 'pago' ? 'success' : 'warning'}>{inscricao.statusPagamento}</CBadge>
      </div>
    </>
  );
}

// Texto pra mandar (WhatsApp/e-mail) quem precisa ter a carteirinha feita.
function textoCarteirinhas(evento, pendentes) {
  const linhas = [`Carteirinhas a fazer — ${evento?.nome || 'evento'}`, ''];
  pendentes.forEach((desconto) => {
    const inscricao = desconto.inscricao || {};
    const nascimento = inscricao.dataNascimento ? ` · nasc. ${inscricao.dataNascimento.split('-').reverse().join('/')}` : '';
    const faixa = inscricao.faixaAtual ? ` · faixa ${inscricao.faixaAtual}` : '';
    linhas.push(`• ${inscricao.nome || desconto.nome || desconto.email} — ${desconto.email}${faixa}${nascimento}`);
  });
  return linhas.join('\n');
}

// Valor especial de inscrição por pessoa (ex.: pagou a carteirinha, mas ela não foi efetivada a tempo)
// e a lista das carteirinhas que ainda precisam ser enviadas para emissão.
export default function EventoDescontos() {
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [descontos, setDescontos] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [copiado, setCopiado] = useState(false);

  async function carregar() {
    const res = await api.get(`/admin/eventos/${id}/descontos`);
    setDescontos(res.data);
  }

  useEffect(() => {
    api.get(`/admin/eventos/${id}`).then((res) => setEvento(res.data));
    carregar();
  }, [id]);

  function atualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function salvar(event) {
    event.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await api.post(`/admin/eventos/${id}/descontos`, { ...form, valor: form.valor === '' ? '' : Number(String(form.valor).replace(',', '.')) });
      setForm(VAZIO);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(desconto) {
    if (!window.confirm(`Excluir o valor especial de ${desconto.nome || desconto.email}?`)) return;
    try {
      await api.delete(`/admin/eventos/${id}/descontos/${desconto.id}`);
      carregar();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir.');
    }
  }

  async function marcarCarteirinha(desconto, enviada) {
    await api.put(`/admin/eventos/${id}/descontos/${desconto.id}/carteirinha`, { enviada });
    carregar();
  }

  const pendentes = descontos.filter((desconto) => desconto.carteirinhaPendente && !desconto.carteirinhaEnviadaEm);

  async function copiarLista() {
    try {
      await navigator.clipboard.writeText(textoCarteirinhas(evento, pendentes));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.alert('Não foi possível copiar.');
    }
  }

  return (
    <div>
      <Link to={`/admin/eventos/${id}/inscricoes`} className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Inscrições
      </Link>
      <h1 className="h3 mb-1">Valores especiais{evento ? ` — ${evento.nome}` : ''}</h1>
      <p className="text-body-secondary small mb-3">
        Para cobrar um valor diferente de uma pessoa (ex.: pagou a carteirinha, mas ela não foi efetivada e o sistema cobraria o valor sem
        carteirinha). Se a pessoa já se inscreveu e não pagou, o valor e o Pix são trocados na hora e ela recebe um novo e-mail.
      </p>

      <CCard className="mb-4">
        <CCardBody>
          <form onSubmit={salvar}>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>E-mail da inscrição</CFormLabel>
                <CFormInput type="email" value={form.email} onChange={(event) => atualizar('email', event.target.value)} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Nome (opcional)</CFormLabel>
                <CFormInput value={form.nome} onChange={(event) => atualizar('nome', event.target.value)} />
                <div className="form-text">Só quando irmãos usam o mesmo e-mail.</div>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Valor a cobrar</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>R$</CInputGroupText>
                  <CFormInput type="number" min="0" step="0.01" value={form.valor} onChange={(event) => atualizar('valor', event.target.value)} required />
                </CInputGroup>
                <div className="form-text">0 para isentar.</div>
              </CCol>
              <CCol md={8}>
                <CFormLabel>Motivo</CFormLabel>
                <CFormTextarea rows={1} value={form.motivo} onChange={(event) => atualizar('motivo', event.target.value)} placeholder="Ex.: pagou a carteirinha em 10/11, ainda não efetivada" />
              </CCol>
              <CCol md={4} className="d-flex align-items-end">
                <CFormCheck
                  id="carteirinha-pendente"
                  label="Carteirinha paga a enviar para emissão"
                  checked={form.carteirinhaPendente}
                  onChange={(event) => atualizar('carteirinhaPendente', event.target.checked)}
                />
              </CCol>
            </CRow>
            <div className="d-flex gap-2 mt-3 align-items-center">
              <CButton type="submit" color="primary" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Adicionar valor especial'}
              </CButton>
              {erro && <span className="text-danger small">{erro}</span>}
            </div>
          </form>
        </CCardBody>
      </CCard>

      <AdminDataTable
        rows={descontos}
        emptyMessage="Nenhum valor especial neste evento."
        columns={[
          {
            key: 'pessoa',
            label: 'Pessoa',
            render: (desconto) => {
              const nome = desconto.nome || desconto.inscricao?.nome;
              return nome ? (
                <>
                  {nome}
                  <div className="small text-body-secondary">{desconto.email}</div>
                </>
              ) : (
                desconto.email
              );
            },
          },
          { key: 'valor', label: 'Valor especial', align: 'end', render: (desconto) => formatarMoeda(desconto.valor) },
          { key: 'inscricao', label: 'Inscrição', render: situacaoDaInscricao },
          { key: 'motivo', label: 'Motivo', render: (desconto) => <span className="small">{desconto.motivo || '-'}</span> },
          {
            key: 'carteirinha',
            label: 'Carteirinha',
            render: (desconto) =>
              !desconto.carteirinhaPendente ? (
                <span className="text-body-secondary small">-</span>
              ) : desconto.carteirinhaEnviadaEm ? (
                <>
                  <CBadge color="success">Enviada {new Date(desconto.carteirinhaEnviadaEm).toLocaleDateString('pt-BR')}</CBadge>
                  <CButton size="sm" color="link" className="p-0 ms-2" onClick={() => marcarCarteirinha(desconto, false)}>
                    desfazer
                  </CButton>
                </>
              ) : (
                <CButton size="sm" color="secondary" variant="outline" onClick={() => marcarCarteirinha(desconto, true)}>
                  Marcar como enviada
                </CButton>
              ),
          },
          {
            key: 'acoes',
            label: '',
            render: (desconto) =>
              desconto.eventoAlunoId ? null : (
                <CButton size="sm" color="danger" variant="outline" onClick={() => excluir(desconto)}>
                  Excluir
                </CButton>
              ),
          },
        ]}
      />

      <h2 className="h5 mt-4">Carteirinhas a enviar para emissão</h2>
      {pendentes.length === 0 ? (
        <p className="text-body-secondary small">Nenhuma carteirinha pendente.</p>
      ) : (
        <>
          <p className="small text-body-secondary mb-2">
            {pendentes.length} pessoa(s). Copie a lista para mandar à Morganti e, depois de enviar, marque cada uma como enviada.
          </p>
          <pre className="bg-body-tertiary border rounded p-2 small" style={{ whiteSpace: 'pre-wrap' }}>
            {textoCarteirinhas(evento, pendentes)}
          </pre>
          <CButton color="primary" variant="outline" onClick={copiarLista}>
            {copiado ? 'Copiado!' : 'Copiar lista'}
          </CButton>
        </>
      )}
    </div>
  );
}
